// bundles/ranvier-storage/test/store.test.js
'use strict';

/**
 * Tests for store.js — shaped around the domain rules of the claims system.
 *
 * Domain rules under test:
 *   - Logout grace period is exactly 5 minutes (LOGOUT_GRACE_MS)
 *   - A room can only have one active claim at a time
 *   - Kill transfer moves ALL claims from victim to winner
 *   - Tax rate is frozen (taxRateLocked) when a package is funded
 *   - No rehypothecation — one room per collateral package, enforced at the API
 *   - Package lifecycle: O → F → D (default) or O → F → C (closed)
 *   - Lender's locked rate survives a kill transfer (new owner inherits debt)
 *   - All claim state survives a log replay cycle
 *
 * Claims — tested against real Log and Graph instances using a temp directory.
 * Packages — tested against a mock Db. better-sqlite3 requires native
 * compilation; the mock keeps tests portable and focuses assertions on
 * store behaviour rather than SQL correctness (db.js has its own concern).
 *
 * Run with:  node test/store.test.js
 */

const assert = require('assert/strict');
const os     = require('os');
const path   = require('path');
const fs     = require('fs');

const { Log }                    = require('../lib/log');
const { Graph }                  = require('../lib/graph');
const { Store, LOGOUT_GRACE_MS } = require('../lib/store');
const { replay }                 = require('../lib/replay');

// Minimal test harness

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${name}`);
}

// Fixtures

function makeStore(mockDb = makeMockDb()) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rs-test-'));
  const log     = new Log(dataDir, 10000);
  const graph   = new Graph();
  const store   = new Store(log, graph, mockDb);
  return { store, log, graph, db: mockDb, dataDir };
}

function makeMockDb() {
  const packages = Object.create(null);

  return {
    listPackage(pkg)             { packages[pkg.id] = { ...pkg }; },
    fundPackage(id, lenderId)    { if (packages[id]) { packages[id].status = 'F'; packages[id].lenderId = lenderId; } },
    defaultPackage(id)           { if (packages[id]) packages[id].status = 'D'; },
    closePackage(id)             { if (packages[id]) packages[id].status = 'C'; },
    deletePackage(id)            { delete packages[id]; },
    getPackage(id)               { return packages[id] ?? null; },
    getOpenPackages()            { return Object.values(packages).filter(p => p.status === 'O'); },
    getOpenPackagesAboveFloor(f) { return Object.values(packages).filter(p => p.status === 'O' && p.yieldFloor >= f); },
    getPackagesByClaimant(id)    { return Object.values(packages).filter(p => p.claimantId === id); },
    getPackagesByLender(id)      { return Object.values(packages).filter(p => p.lenderId === id); },
    getPackagesByStatus(s)       { return Object.values(packages).filter(p => p.status === s); },
    close()                      {},
    _packages:                   packages,
  };
}

/**
 * A valid single-room package opts object.
 * One room per package — no rehypothecation.
 */
function pkgOpts(overrides = {}) {
  return {
    claimantId:      'p_claimant',
    name:            'Test Package',
    attachedRoomIds: ['c_room1'],   // exactly one — system rule
    requestedAmount: 1000,
    durationDays:    30,
    yieldFloor:      50,
    ...overrides,
  };
}

// Main

async function main() {

  // Domain constant

  section('LOGOUT_GRACE_MS');

  await test('is exactly 5 minutes', () => {
    assert.equal(LOGOUT_GRACE_MS, 300000);
  });

  await test('is a number exported from store', () => {
    assert.ok(typeof LOGOUT_GRACE_MS === 'number');
  });

  // Claims — create

  section('claimRoom');

  await test('returns the new claim', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    assert.ok(claim);
    assert.equal(claim.ownerId, 'p_alice');
    assert.equal(claim.roomId, 'r_001');
    assert.ok(claim.id.startsWith('c_'));
    assert.ok(typeof claim.claimedAt === 'number');
  });

  await test('defaults taxRate, taxRateLocked, autoRenewEnabled', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    assert.equal(claim.taxRate, 0);
    assert.equal(claim.taxRateLocked, false);
    assert.equal(claim.autoRenewEnabled, false);
  });

  await test('respects taxRate and autoRenewEnabled opts', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001', { taxRate: 10, autoRenewEnabled: true });
    assert.equal(claim.taxRate, 10);
    assert.equal(claim.autoRenewEnabled, true);
  });

  await test('new claim expiresAt is null', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    assert.equal(claim.expiresAt, null);
  });

  await test('appends C event to log', async() => {
    const { store, log } = makeStore();
    await store.claimRoom('p_alice', 'r_001');
    assert.equal(log.lineCount, 1);
  });

  await test('new claim is immediately readable', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    assert.deepEqual(store.getClaim(claim.id), claim);
  });

  // Claims — one room one claim (domain rule)

  section('claimRoom — one room one claim');

  await test('throws if room is already claimed', async() => {
    const { store } = makeStore();
    await store.claimRoom('p_alice', 'r_001');
    await assert.rejects(
      () => store.claimRoom('p_bob', 'r_001'),
      /already claimed/
    );
  });

  await test('same player cannot double-claim a room', async() => {
    const { store } = makeStore();
    await store.claimRoom('p_alice', 'r_001');
    await assert.rejects(
      () => store.claimRoom('p_alice', 'r_001'),
      /already claimed/
    );
  });

  await test('room can be claimed after existing claim is expired', async() => {
    const { store } = makeStore();
    const old = await store.claimRoom('p_alice', 'r_001');
    await store.expireClaim(old.id);
    const fresh = await store.claimRoom('p_bob', 'r_001');
    assert.equal(fresh.ownerId, 'p_bob');
  });

  await test('different rooms can be claimed independently', async() => {
    const { store } = makeStore();
    await store.claimRoom('p_alice', 'r_001');
    const claim2 = await store.claimRoom('p_alice', 'r_002');
    assert.equal(claim2.roomId, 'r_002');
  });

  // Claims — reads

  section('getClaim / getClaimByRoom / getClaimsByOwner');

  await test('getClaim returns null for unknown id', async() => {
    const { store } = makeStore();
    assert.equal(store.getClaim('c_nope'), null);
  });

  await test('getClaimByRoom returns the claim for that room', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    assert.equal(store.getClaimByRoom('r_001').id, claim.id);
  });

  await test('getClaimByRoom returns null for unclaimed room', async() => {
    const { store } = makeStore();
    assert.equal(store.getClaimByRoom('r_empty'), null);
  });

  await test('getClaimsByOwner returns all claims for a player', async() => {
    const { store } = makeStore();
    await store.claimRoom('p_alice', 'r_001');
    await store.claimRoom('p_alice', 'r_002');
    await store.claimRoom('p_bob',   'r_003');
    const claims = store.getClaimsByOwner('p_alice');
    assert.equal(claims.length, 2);
    assert.ok(claims.every(c => c.ownerId === 'p_alice'));
  });

  await test('getClaimsByOwner returns empty array for player with no claims', async() => {
    const { store } = makeStore();
    assert.deepEqual(store.getClaimsByOwner('p_nobody'), []);
  });

  // Claims — kill transfer (domain rule)

  section('transferAllClaims — kill transfer');

  await test('kill transfer moves ALL claims from victim to winner', async() => {
    const { store } = makeStore();
    await store.claimRoom('p_victim', 'r_001');
    await store.claimRoom('p_victim', 'r_002');
    await store.claimRoom('p_victim', 'r_003');
    const count = await store.transferAllClaims('p_victim', 'p_winner');
    assert.equal(count, 3);
    assert.equal(store.getClaimsByOwner('p_victim').length, 0);
    assert.equal(store.getClaimsByOwner('p_winner').length, 3);
  });

  await test('kill transfer fires one T event per claim', async() => {
    const { store, log } = makeStore();
    await store.claimRoom('p_victim', 'r_001');
    await store.claimRoom('p_victim', 'r_002');
    // 2 C events
    await store.transferAllClaims('p_victim', 'p_winner');
    // 2 C + 2 T
    assert.equal(log.lineCount, 4);
  });

  await test('kill transfer on player with no claims returns 0', async() => {
    const { store } = makeStore();
    const count = await store.transferAllClaims('p_nobody', 'p_winner');
    assert.equal(count, 0);
  });

  await test('winner inherits locked tax rate from pledged claim', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_victim', 'r_001', { taxRate: 25 });
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_victim', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    await store.transferAllClaims('p_victim', 'p_winner');
    // winner holds the room — locked rate stays locked (lender protection)
    assert.equal(store.getClaim(claim.id).taxRateLocked, true);
    assert.equal(store.getClaim(claim.id).taxRate, 25);
    assert.equal(store.getClaim(claim.id).ownerId, 'p_winner');
  });

  await test('transferClaim updates ownerId', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.transferClaim(claim.id, 'p_bob');
    assert.equal(store.getClaim(claim.id).ownerId, 'p_bob');
  });

  await test('transferClaim appends T event', async() => {
    const { store, log } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.transferClaim(claim.id, 'p_bob');
    assert.equal(log.lineCount, 2); // C + T
  });

  // Claims — expire

  section('expireClaim / flushExpiredClaims');

  await test('expireClaim removes the claim', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.expireClaim(claim.id);
    assert.equal(store.getClaim(claim.id), null);
  });

  await test('expireClaim frees the room for a new claim', async() => {
    const { store } = makeStore();
    const old = await store.claimRoom('p_alice', 'r_001');
    await store.expireClaim(old.id);
    const fresh = await store.claimRoom('p_bob', 'r_001');
    assert.ok(fresh);
  });

  await test('expireClaim appends X event', async() => {
    const { store, log } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.expireClaim(claim.id);
    assert.equal(log.lineCount, 2); // C + X
  });

  await test('flushExpiredClaims removes claims past their expiresAt', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.armExpiryForPlayer('p_alice', Date.now() - 1);
    const count = await store.flushExpiredClaims();
    assert.equal(count, 1);
    assert.equal(store.getClaim(claim.id), null);
  });

  await test('flushExpiredClaims ignores claims not yet expired', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.armExpiryForPlayer('p_alice', Date.now() + LOGOUT_GRACE_MS);
    const count = await store.flushExpiredClaims();
    assert.equal(count, 0);
    assert.ok(store.getClaim(claim.id));
  });

  await test('flushExpiredClaims returns 0 when nothing expired', async() => {
    const { store } = makeStore();
    await store.claimRoom('p_alice', 'r_001');
    assert.equal(await store.flushExpiredClaims(), 0);
  });

  // Claims — logout grace timer (domain rule)

  section('armExpiryForPlayer / disarmExpiryForPlayer — logout grace');

  await test('logout arms a 5-minute grace timer on all player claims', async() => {
    const { store } = makeStore();
    await store.claimRoom('p_alice', 'r_001');
    await store.claimRoom('p_alice', 'r_002');
    const expiresAt = Date.now() + LOGOUT_GRACE_MS;
    await store.armExpiryForPlayer('p_alice', expiresAt);
    const claims = store.getClaimsByOwner('p_alice');
    assert.ok(claims.every(c => c.expiresAt === expiresAt));
  });

  await test('logout timer does not affect other players', async() => {
    const { store } = makeStore();
    await store.claimRoom('p_alice', 'r_001');
    await store.claimRoom('p_bob',   'r_002');
    await store.armExpiryForPlayer('p_alice', Date.now() + LOGOUT_GRACE_MS);
    const bobClaims = store.getClaimsByOwner('p_bob');
    assert.ok(bobClaims.every(c => c.expiresAt === null));
  });

  await test('login disarms the grace timer', async() => {
    const { store } = makeStore();
    await store.claimRoom('p_alice', 'r_001');
    await store.claimRoom('p_alice', 'r_002');
    await store.armExpiryForPlayer('p_alice', Date.now() + LOGOUT_GRACE_MS);
    await store.disarmExpiryForPlayer('p_alice');
    const claims = store.getClaimsByOwner('p_alice');
    assert.ok(claims.every(c => c.expiresAt === null));
  });

  await test('claims survive if player reconnects before grace expires', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.armExpiryForPlayer('p_alice', Date.now() + LOGOUT_GRACE_MS);
    await store.disarmExpiryForPlayer('p_alice');
    assert.equal(await store.flushExpiredClaims(), 0);
    assert.ok(store.getClaim(claim.id));
  });

  // Claims — extend

  section('extendClaim');

  await test('extendClaim updates extensionExpiry', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const newExpiry = Date.now() + 86400000;
    await store.extendClaim(claim.id, newExpiry);
    assert.equal(store.getClaim(claim.id).extensionExpiry, newExpiry);
  });

  await test('extendClaim appends E event', async() => {
    const { store, log } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.extendClaim(claim.id, Date.now() + 86400000);
    assert.equal(log.lineCount, 2); // C + E
  });

  // Claims — state derivation

  section('getClaimState');

  await test('active claim returns A', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    assert.equal(store.getClaimState(claim.id), 'A');
  });

  await test('armed claim returns E', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.armExpiryForPlayer('p_alice', Date.now() + LOGOUT_GRACE_MS);
    assert.equal(store.getClaimState(claim.id), 'E');
  });

  await test('disarmed claim returns A', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.armExpiryForPlayer('p_alice', Date.now() + LOGOUT_GRACE_MS);
    await store.disarmExpiryForPlayer('p_alice');
    assert.equal(store.getClaimState(claim.id), 'A');
  });

  await test('unknown claimId returns null', async() => {
    const { store } = makeStore();
    assert.equal(store.getClaimState('c_ghost'), null);
  });

  // Claims — log persistence and replay

  section('log persistence and replay');

  await test('claim survives a replay cycle', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id).ownerId, 'p_alice');
  });

  await test('transfer survives replay', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.transferClaim(claim.id, 'p_bob');
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id).ownerId, 'p_bob');
  });

  await test('expired claim is absent after replay', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.expireClaim(claim.id);
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id), null);
  });

  await test('logout timer state survives replay', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const expiresAt = Date.now() + LOGOUT_GRACE_MS;
    await store.armExpiryForPlayer('p_alice', expiresAt);
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id).expiresAt, expiresAt);
  });

  await test('extension survives replay', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const newExpiry = Date.now() + 86400000;
    await store.extendClaim(claim.id, newExpiry);
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id).extensionExpiry, newExpiry);
  });

  await test('tax rate lock survives replay', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001', { taxRate: 15 });
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id).taxRateLocked, true);
    assert.equal(g.getClaim(claim.id).taxRate, 15);
  });

  // Packages — no rehypothecation (domain rule)

  section('listPackage — no rehypothecation');

  await test('throws if more than one room is attached', async() => {
    const { store } = makeStore();
    assert.throws(
      () => store.listPackage(pkgOpts({ attachedRoomIds: ['c_r1', 'c_r2'] })),
      /rehypothecation/
    );
  });

  await test('throws if attachedRoomIds is empty', async() => {
    const { store } = makeStore();
    assert.throws(
      () => store.listPackage(pkgOpts({ attachedRoomIds: [] })),
      /rehypothecation/
    );
  });

  await test('accepts exactly one room', async() => {
    const { store } = makeStore();
    const pkg = store.listPackage(pkgOpts({ attachedRoomIds: ['c_room1'] }));
    assert.ok(pkg.id.startsWith('l_'));
  });

  // Packages — list and read

  section('listPackage / getPackage');

  await test('listPackage returns new package with status O', async() => {
    const { store } = makeStore();
    const pkg = store.listPackage(pkgOpts());
    assert.ok(pkg);
    assert.ok(pkg.id.startsWith('l_'));
    assert.equal(pkg.status, 'O');
    assert.equal(pkg.lenderId, null);
  });

  await test('getPackage returns null for unknown id', async() => {
    const { store } = makeStore();
    assert.equal(store.getPackage('l_ghost'), null);
  });

  // Packages — fund and tax rate lock (domain rule)

  section('fundPackage — tax rate frozen on pledge');

  await test('fundPackage sets status to F and records lender', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    const funded = await store.fundPackage(pkg.id, 'p_lender');
    assert.equal(funded.status, 'F');
    assert.equal(funded.lenderId, 'p_lender');
  });

  await test('fundPackage locks tax rate on the attached claim', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001', { taxRate: 20 });
    assert.equal(claim.taxRateLocked, false);
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    assert.equal(store.getClaim(claim.id).taxRateLocked, true);
  });

  await test('fundPackage appends R event to claims log', async() => {
    const { store, log } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    // 1 C event
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    // 1 C + 1 R
    assert.equal(log.lineCount, 2);
  });

  await test('tax rate value is preserved at the rate set at claim time', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001', { taxRate: 35 });
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    assert.equal(store.getClaim(claim.id).taxRate, 35);
  });

  // Packages — lifecycle transitions (domain rule)

  section('package lifecycle — O → F → D or C');

  await test('defaultPackage transitions F → D', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    const defaulted = store.defaultPackage(pkg.id);
    assert.equal(defaulted.status, 'D');
  });

  await test('closePackage transitions F → C', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    const closed = store.closePackage(pkg.id);
    assert.equal(closed.status, 'C');
  });

  await test('deletePackage removes the record after town sale completes', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    store.defaultPackage(pkg.id);
    store.deletePackage(pkg.id);
    assert.equal(store.getPackage(pkg.id), null);
  });

  // Packages — queries

  section('package queries');

  await test('getOpenPackages returns only open packages', async() => {
    const { store } = makeStore();
    const c1 = await store.claimRoom('p_alice', 'r_001');
    const c2 = await store.claimRoom('p_alice', 'r_002');
    const p1 = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [c1.id] }));
    const p2 = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [c2.id] }));
    await store.fundPackage(p2.id, 'p_lender');
    const open = store.getOpenPackages();
    assert.equal(open.length, 1);
    assert.equal(open[0].id, p1.id);
  });

  await test('getOpenPackagesAboveFloor filters by minimum yield floor', async() => {
    const { store } = makeStore();
    const c1 = await store.claimRoom('p_alice', 'r_001');
    const c2 = await store.claimRoom('p_alice', 'r_002');
    const c3 = await store.claimRoom('p_alice', 'r_003');
    store.listPackage(pkgOpts({ attachedRoomIds: [c1.id], yieldFloor: 30 }));
    store.listPackage(pkgOpts({ attachedRoomIds: [c2.id], yieldFloor: 60 }));
    store.listPackage(pkgOpts({ attachedRoomIds: [c3.id], yieldFloor: 100 }));
    const results = store.getOpenPackagesAboveFloor(60);
    assert.equal(results.length, 2);
    assert.ok(results.every(p => p.yieldFloor >= 60));
  });

  await test('getPackagesByClaimant returns all packages for that player', async() => {
    const { store } = makeStore();
    const c1 = await store.claimRoom('p_alice', 'r_001');
    const c2 = await store.claimRoom('p_alice', 'r_002');
    const c3 = await store.claimRoom('p_bob',   'r_003');
    store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [c1.id] }));
    store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [c2.id] }));
    store.listPackage(pkgOpts({ claimantId: 'p_bob',   attachedRoomIds: [c3.id] }));
    assert.equal(store.getPackagesByClaimant('p_alice').length, 2);
    assert.equal(store.getPackagesByClaimant('p_bob').length, 1);
  });

  await test('getPackagesByLender returns packages funded by a lender', async() => {
    const { store } = makeStore();
    const c1 = await store.claimRoom('p_alice', 'r_001');
    const c2 = await store.claimRoom('p_alice', 'r_002');
    const c3 = await store.claimRoom('p_alice', 'r_003');
    const p1 = store.listPackage(pkgOpts({ attachedRoomIds: [c1.id] }));
    const p2 = store.listPackage(pkgOpts({ attachedRoomIds: [c2.id] }));
    store.listPackage(pkgOpts({ attachedRoomIds: [c3.id] }));
    await store.fundPackage(p1.id, 'p_lender');
    await store.fundPackage(p2.id, 'p_lender');
    assert.equal(store.getPackagesByLender('p_lender').length, 2);
  });

  await test('getPackagesByStatus returns packages matching status', async() => {
    const { store } = makeStore();
    const c1 = await store.claimRoom('p_alice', 'r_001');
    const c2 = await store.claimRoom('p_alice', 'r_002');
    const p1 = store.listPackage(pkgOpts({ attachedRoomIds: [c1.id] }));
    const p2 = store.listPackage(pkgOpts({ attachedRoomIds: [c2.id] }));
    await store.fundPackage(p1.id, 'p_lender');
    store.closePackage(p1.id);
    await store.fundPackage(p2.id, 'p_lender');
    store.defaultPackage(p2.id);
    assert.equal(store.getPackagesByStatus('C').length, 1);
    assert.equal(store.getPackagesByStatus('D').length, 1);
    assert.equal(store.getPackagesByStatus('O').length, 0);
  });

  // Edge cases — timer state during transfers

  section('timer state during kill transfer');

  await test('armed expiry timer travels with claim to new owner', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_victim', 'r_001');
    const expiresAt = Date.now() + LOGOUT_GRACE_MS;
    await store.armExpiryForPlayer('p_victim', expiresAt);
    // victim dies mid-logout grace window
    await store.transferAllClaims('p_victim', 'p_winner');
    // timer is still armed on the claim — winner inherits it
    assert.equal(store.getClaim(claim.id).expiresAt, expiresAt);
  });

  await test('winner can disarm inherited expiry timer', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_victim', 'r_001');
    await store.armExpiryForPlayer('p_victim', Date.now() + LOGOUT_GRACE_MS);
    await store.transferAllClaims('p_victim', 'p_winner');
    await store.disarmExpiryForPlayer('p_winner');
    assert.equal(store.getClaim(claim.id).expiresAt, null);
  });

  await test('armed claim transferred to winner does not expire under victims id', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_victim', 'r_001');
    await store.armExpiryForPlayer('p_victim', Date.now() - 1); // already past
    await store.transferAllClaims('p_victim', 'p_winner');
    // flush should NOT remove it — ownerId is now winner, not victim
    // claim is still expired by timestamp though — flush is timestamp-based
    const count = await store.flushExpiredClaims();
    // claim had past expiresAt so it flushes regardless of owner
    assert.equal(count, 1);
    assert.equal(store.getClaim(claim.id), null);
  });

  await test('arm for player with no claims is a no-op', async() => {
    const { store } = makeStore();
    // should not throw
    await store.armExpiryForPlayer('p_nobody', Date.now() + LOGOUT_GRACE_MS);
  });

  await test('disarm for player with no claims is a no-op', async() => {
    const { store } = makeStore();
    // should not throw
    await store.disarmExpiryForPlayer('p_nobody');
  });

  // Edge cases — flush correctness

  section('flushExpiredClaims — edge cases');

  await test('only expired claims are flushed when mixed with active ones', async() => {
    const { store } = makeStore();
    const c1 = await store.claimRoom('p_alice', 'r_001');
    const c2 = await store.claimRoom('p_alice', 'r_002');
    const c3 = await store.claimRoom('p_bob',   'r_003');
    // arm alice's claims in the past, bob's in the future
    await store.armExpiryForPlayer('p_alice', Date.now() - 1);
    await store.armExpiryForPlayer('p_bob',   Date.now() + LOGOUT_GRACE_MS);
    const count = await store.flushExpiredClaims();
    assert.equal(count, 2);
    assert.equal(store.getClaim(c1.id), null);
    assert.equal(store.getClaim(c2.id), null);
    assert.ok(store.getClaim(c3.id)); // bob's claim survives
  });

  await test('second flush after first finds nothing', async() => {
    const { store } = makeStore();
    await store.claimRoom('p_alice', 'r_001');
    await store.armExpiryForPlayer('p_alice', Date.now() - 1);
    await store.flushExpiredClaims();
    const second = await store.flushExpiredClaims();
    assert.equal(second, 0);
  });

  await test('flush after reconnect finds nothing', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.armExpiryForPlayer('p_alice', Date.now() + LOGOUT_GRACE_MS);
    await store.disarmExpiryForPlayer('p_alice'); // player reconnected
    const count = await store.flushExpiredClaims();
    assert.equal(count, 0);
    assert.ok(store.getClaim(claim.id));
  });

  // Edge cases — extension behavior

  section('extendClaim — edge cases');

  await test('extending already-extended claim overwrites extensionExpiry', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const first  = Date.now() + 86400000;
    const second = Date.now() + 172800000;
    await store.extendClaim(claim.id, first);
    await store.extendClaim(claim.id, second);
    assert.equal(store.getClaim(claim.id).extensionExpiry, second);
  });

  await test('extending a locked claim updates extensionExpiry but preserves lock', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001', { taxRate: 20 });
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    assert.equal(store.getClaim(claim.id).taxRateLocked, true);
    const newExpiry = Date.now() + 86400000;
    await store.extendClaim(claim.id, newExpiry);
    // lock preserved, extension updated
    assert.equal(store.getClaim(claim.id).taxRateLocked, true);
    assert.equal(store.getClaim(claim.id).extensionExpiry, newExpiry);
  });

  await test('extensionExpiry travels with claim to new owner on kill transfer', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_victim', 'r_001');
    const expiry = Date.now() + 86400000;
    await store.extendClaim(claim.id, expiry);
    await store.transferAllClaims('p_victim', 'p_winner');
    assert.equal(store.getClaim(claim.id).extensionExpiry, expiry);
    assert.equal(store.getClaim(claim.id).ownerId, 'p_winner');
  });

  // Edge cases — replay order correctness

  section('replay — order correctness');

  await test('arm then disarm replays to active state', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.armExpiryForPlayer('p_alice', Date.now() + LOGOUT_GRACE_MS);
    await store.disarmExpiryForPlayer('p_alice');
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id).expiresAt, null);
  });

  await test('multiple transfers replay to final owner', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.transferClaim(claim.id, 'p_bob');
    await store.transferClaim(claim.id, 'p_carol');
    await store.transferClaim(claim.id, 'p_dave');
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id).ownerId, 'p_dave');
  });

  await test('extend then transfer — winner gets extensionExpiry', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const expiry = Date.now() + 86400000;
    await store.extendClaim(claim.id, expiry);
    await store.transferClaim(claim.id, 'p_bob');
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id).extensionExpiry, expiry);
    assert.equal(g.getClaim(claim.id).ownerId, 'p_bob');
  });

  await test('create, transfer, expire — claim absent after replay', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    await store.transferClaim(claim.id, 'p_bob');
    await store.expireClaim(claim.id);
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id), null);
  });

  await test('two claims on different rooms both survive replay independently', async() => {
    const { store, dataDir } = makeStore();
    const c1 = await store.claimRoom('p_alice', 'r_001');
    const c2 = await store.claimRoom('p_alice', 'r_002');
    await store.expireClaim(c1.id);
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(c1.id), null);
    assert.ok(g.getClaim(c2.id));
  });

  // Edge cases — package and claim decoupling

  section('package and claim decoupling');

  await test('deleting a package does not affect the underlying claim', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    store.deletePackage(pkg.id);
    // claim still lives in graph
    assert.ok(store.getClaim(claim.id));
    assert.equal(store.getClaim(claim.id).ownerId, 'p_alice');
  });

  await test('expiring a claim does not remove the package record from SQLite', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    await store.expireClaim(claim.id);
    // package still in SQLite — caller handles the default/cleanup
    assert.ok(store.getPackage(pkg.id));
    assert.equal(store.getPackage(pkg.id).status, 'F');
  });

  await test('tax rate stays locked after package defaults', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001', { taxRate: 30 });
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    store.defaultPackage(pkg.id);
    // lock is on the claim record — package state doesn't affect it
    assert.equal(store.getClaim(claim.id).taxRateLocked, true);
    assert.equal(store.getClaim(claim.id).taxRate, 30);
  });

  await test('tax rate stays locked after package closes cleanly', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001', { taxRate: 15 });
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    store.closePackage(pkg.id);
    // lock persists — it is set via the R event and never reversed
    assert.equal(store.getClaim(claim.id).taxRateLocked, true);
  });

  await test('funding the same package twice overwrites lender', async() => {
  // This documents existing behaviour — the store does not prevent it.
  // At the game layer, only open packages should be fundable.
  // A funded (F) package should be rejected by the command handler upstream.
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender_one');
    await store.fundPackage(pkg.id, 'p_lender_two');
    assert.equal(store.getPackage(pkg.id).lenderId, 'p_lender_two');
  });

  // Edge cases — logout while pledged

  section('logout while claim is pledged');

  await test('expiry timer can be armed on a pledged claim', async() => {
    const { store } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    // player logs out while claim is pledged
    const expiresAt = Date.now() + LOGOUT_GRACE_MS;
    await store.armExpiryForPlayer('p_alice', expiresAt);
    assert.equal(store.getClaim(claim.id).expiresAt, expiresAt);
    assert.equal(store.getClaim(claim.id).taxRateLocked, true); // still locked
  });

  await test('pledged claim expiry timer survives replay', async() => {
    const { store, dataDir } = makeStore();
    const claim = await store.claimRoom('p_alice', 'r_001');
    const pkg = store.listPackage(pkgOpts({ claimantId: 'p_alice', attachedRoomIds: [claim.id] }));
    await store.fundPackage(pkg.id, 'p_lender');
    const expiresAt = Date.now() + LOGOUT_GRACE_MS;
    await store.armExpiryForPlayer('p_alice', expiresAt);
    const g = await replay(new Log(dataDir));
    assert.equal(g.getClaim(claim.id).expiresAt, expiresAt);
    assert.equal(g.getClaim(claim.id).taxRateLocked, true);
  });

  // Results

  console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
