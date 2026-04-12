// test/integration/claims.test.js
'use strict';

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const enforcement = require('../../bundles/claims/lib/enforcement');
const {
  useSuite,
  assertOutput,
  flush,
} = require('../harness/helpers');

const { setup, teardown, ctx } = useSuite('limbo:black');

before(setup);
after(teardown);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function store() {
  return ctx.state.StorageManager.store;
}

// Run 'claim <taxRate>' for a session and return the resulting claim object.
// The store graph is updated synchronously inside _write before the microtask
// that fires say(), so the claim is readable as soon as s.run() resolves.
async function claimBlack(s, taxRate = 10) {
  await s.run(`claim ${taxRate}`);
  return store().getClaimByRoom('limbo:black');
}

// Expire a claim by id. No-op if null/undefined.
async function expireClaim(id) {
  if (!id) return;
  try { await store().expireClaim(id); } catch (_) {}
}

// Seed a collateral package directly into the db layer, bypassing
// store.listPackage's 1-room validation (which is what makes the
// 'collateral create' command always fail — see constraint tests below).
//
// Uses Database.run(sql) with NO params array so sql.js takes the
// sqlite3_exec path instead of prepare→step→free, which would finalise
// prepared statements. No _persist() call needed — all subsequent reads
// query the in-memory db, which already has the new row.
function seedPackage(opts) {
  const db = store()._db;
  const id = 'tp_' + Date.now().toString(36);
  const s  = v => String(v ?? '').replace(/'/g, "''");
  db.db.run(
    `INSERT INTO packages
       (id, name, claimantId, attachedRoomIds, requestedAmount,
        durationDays, yieldFloor, status, lenderId)
     VALUES (
       '${s(id)}',
       '${s(opts.name || 'Test Package')}',
       '${s(opts.claimantId || '')}',
       '${s((opts.attachedRoomIds || []).join(','))}',
       ${Number(opts.requestedAmount  || 0)},
       ${Number(opts.durationDays     || 30)},
       ${Number(opts.yieldFloor       || 0)},
       'O', NULL
     )`
  );
  return db.getPackage(id);
}

// ---------------------------------------------------------------------------
// claim
// ---------------------------------------------------------------------------

describe('claim command', () => {
  let claimId = null;

  afterEach(async() => {
    await expireClaim(claimId);
    claimId = null;
  });

  it('shows usage when no subcommand or tax rate is given', async() => {
    const s = ctx.session();
    const result = await s.run('claim');
    assertOutput(result, /usage.*taxrate|taxrate.*0.*100/i);
    s.cleanup();
  });

  it('claim list reports no claims on a fresh player', async() => {
    const s = ctx.session();
    const result = await s.run('claim list');
    assertOutput(result, /no claims/i);
    s.cleanup();
  });

  it('claims the current room and records it in the store', async() => {
    const s = ctx.session();
    const result = await s.run('claim 10');
    assertOutput(result, /claimed.*black|black.*10%/i);
    const claim = store().getClaimByRoom('limbo:black');
    assert.ok(claim, 'claim should exist in store');
    assert.equal(claim.ownerId, s.player.name);
    assert.equal(claim.taxRate, 10);
    claimId = claim.id;
    s.cleanup();
  });

  it('claim list shows the room after it is claimed', async() => {
    const s = ctx.session();
    const claim = await claimBlack(s);
    claimId = claim.id;
    const result = await s.run('claim list');
    assertOutput(result, /black/i);
    s.cleanup();
  });

  it('rejects reclaiming a room the player already owns', async() => {
    const s = ctx.session();
    const claim = await claimBlack(s);
    claimId = claim.id;
    const result = await s.run('claim 5');
    assertOutput(result, /already hold/i);
    s.cleanup();
  });

  it('rejects claiming a room already owned by another player', async() => {
    const a = ctx.session({ name: 'OwnerA' });
    const b = ctx.session({ name: 'InterloperB' });
    const claim = await claimBlack(a);
    claimId = claim.id;
    const result = await b.run('claim 5');
    assertOutput(result, /already claimed/i);
    a.cleanup();
    b.cleanup();
  });

  it('rejects a tax rate outside 0–100', async() => {
    const s = ctx.session();
    const result = await s.run('claim 150');
    assertOutput(result, /usage/i);
    s.cleanup();
  });

  it('releases a claim by list index', async() => {
    const s = ctx.session();
    const claim = await claimBlack(s);
    claimId = claim.id;
    const result = await s.run('claim release 1');
    assertOutput(result, /released/i);
    const gone = store().getClaimByRoom('limbo:black');
    assert.equal(gone, null, 'claim should be removed from store after release');
    claimId = null;
    s.cleanup();
  });

  it('rejects releasing a non-existent index', async() => {
    const s = ctx.session();
    const result = await s.run('claim release 99');
    assertOutput(result, /no claim found/i);
    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// collateral
// ---------------------------------------------------------------------------

describe('collateral command', () => {
  let claimId  = null;
  let pkgIds   = [];

  afterEach(async() => {
    for (const id of pkgIds) {
      try { store().deletePackage(id); } catch (_) {}
    }
    pkgIds = [];
    await expireClaim(claimId);
    claimId = null;
  });

  it('shows usage when called with no subcommand', async() => {
    const s = ctx.session();
    const result = await s.run('collateral');
    assertOutput(result, /collateral create/i);
    s.cleanup();
  });

  it('collateral list reports no packages on a fresh player', async() => {
    const s = ctx.session();
    const result = await s.run('collateral list');
    assertOutput(result, /no collateral packages/i);
    s.cleanup();
  });

  it('collateral create fails gracefully due to store 1-room constraint', async() => {
    const s = ctx.session();
    const result = await s.run('collateral create My Test Package');
    assertOutput(result, /could not create package/i);
    s.cleanup();
  });

  it('collateral offers reports none when no packages exist', async() => {
    const s = ctx.session();
    const result = await s.run('collateral offers');
    assertOutput(result, /no open collateral offers/i);
    s.cleanup();
  });

  it('status reports not found for an unknown package id', async() => {
    const s = ctx.session();
    const result = await s.run('collateral status no_such_pkg');
    assertOutput(result, /not found/i);
    s.cleanup();
  });

  it('cancel reports not found for an unknown package id', async() => {
    const s = ctx.session();
    const result = await s.run('collateral cancel no_such_pkg');
    assertOutput(result, /not found/i);
    s.cleanup();
  });

  it('status shows package detail for a seeded package', async() => {
    const s = ctx.session();
    const pkg = seedPackage({ claimantId: s.player.name, name: 'My Seeded Pkg' });
    pkgIds.push(pkg.id);
    const result = await s.run(`collateral status ${pkg.id}`);
    assertOutput(result, /my seeded pkg/i);
    assertOutput(result, /open/i);
    s.cleanup();
  });

  it('collateral list shows a seeded package', async() => {
    const s = ctx.session();
    const pkg = seedPackage({ claimantId: s.player.name, name: 'Listed Pkg' });
    pkgIds.push(pkg.id);
    const result = await s.run('collateral list');
    assertOutput(result, /listed pkg/i);
    s.cleanup();
  });

  it('cancel removes a seeded open package', async() => {
    const s = ctx.session();
    const pkg = seedPackage({ claimantId: s.player.name });
    pkgIds.push(pkg.id);
    const result = await s.run(`collateral cancel ${pkg.id}`);
    assertOutput(result, /cancelled/i);
    assert.equal(store().getPackage(pkg.id), null, 'package should be deleted from db');
    pkgIds = pkgIds.filter(id => id !== pkg.id);
    s.cleanup();
  });

  it('attaches a claimed room to a seeded package', async() => {
    const s = ctx.session();
    const claim = await claimBlack(s);
    claimId = claim.id;
    const pkg = seedPackage({ claimantId: s.player.name });
    pkgIds.push(pkg.id);
    const result = await s.run(`collateral attach ${pkg.id} limbo:black`);
    assertOutput(result, /attached/i);
    // attach deletes + re-creates the package with a new id via store.listPackage
    const updated = store().getPackagesByClaimant(s.player.name)
      .find(p => p.attachedRoomIds.includes('limbo:black'));
    assert.ok(updated, 'package should exist with limbo:black in attachedRoomIds');
    s.cleanup();
  });

  it('pledge updates requested amount, duration, and yield floor', async() => {
    const s = ctx.session();
    const claim = await claimBlack(s);
    claimId = claim.id;
    // seed with 1 room so store.listPackage passes during pledge's delete+re-create
    const pkg = seedPackage({ claimantId: s.player.name, attachedRoomIds: ['limbo:black'] });
    pkgIds.push(pkg.id);
    const result = await s.run(`collateral pledge ${pkg.id} 100 30 5`);
    assertOutput(result, /requesting|posting/i);
    // pledge deletes + re-creates the package with a new id via store.listPackage
    const updated = store().getPackagesByClaimant(s.player.name)
      .find(p => p.requestedAmount === 100);
    assert.ok(updated, 're-created package should exist with updated amounts');
    assert.equal(updated.requestedAmount, 100);
    assert.equal(updated.durationDays, 30);
    assert.equal(updated.yieldFloor, 5);
    s.cleanup();
  });

  it('accept funds an open package and marks it as funded', async() => {
    const claimant = ctx.session({ name: 'Claimant' });
    const lender   = ctx.session({ name: 'Lender' });
    const claim = await claimBlack(claimant);
    claimId = claim.id;
    const pkg = seedPackage({
      claimantId:      claimant.player.name,
      attachedRoomIds: ['limbo:black'],
      requestedAmount: 50,
      durationDays:    30,
      yieldFloor:      1,
    });
    pkgIds.push(pkg.id);
    const result = await lender.run(`collateral accept ${pkg.id}`);
    await flush(3);
    assertOutput(result, /funded/i);
    const funded = store().getPackage(pkg.id);
    assert.equal(funded.status, 'F');
    assert.equal(funded.lenderId, lender.player.name);
    claimant.cleanup();
    lender.cleanup();
  });
});

// ---------------------------------------------------------------------------
// enforce
// ---------------------------------------------------------------------------

describe('enforce command', () => {
  let claimId = null;

  afterEach(async() => {
    enforcement.removeAllThreats('Enforcer');
    enforcement.removeSubmission('Target');
    await expireClaim(claimId);
    claimId = null;
  });

  it('shows usage when no arguments are given', async() => {
    const s = ctx.session({ name: 'Enforcer' });
    const result = await s.run('enforce');
    assertOutput(result, /usage/i);
    s.cleanup();
  });

  it('rejects when the player does not hold a claim on the current room', async() => {
    const s = ctx.session({ name: 'Enforcer' });
    const result = await s.run('enforce Target 10');
    assertOutput(result, /do not hold a claim/i);
    s.cleanup();
  });

  it('rejects when the named target is not in the room', async() => {
    const s = ctx.session({ name: 'Enforcer' });
    const claim = await claimBlack(s);
    claimId = claim.id;
    const result = await s.run('enforce GhostPlayer 10');
    assertOutput(result, /not in this room/i);
    s.cleanup();
  });

  it('rejects enforcing against yourself', async() => {
    const s = ctx.session({ name: 'Enforcer' });
    const claim = await claimBlack(s);
    claimId = claim.id;
    const result = await s.run('enforce Enforcer 10');
    assertOutput(result, /can't enforce against yourself/i);
    s.cleanup();
  });

  it('sends a demand when both players are in the claimed room', async() => {
    const enforcer = ctx.session({ name: 'Enforcer' });
    const target   = ctx.session({ name: 'Target' });
    const claim = await claimBlack(enforcer);
    claimId = claim.id;

    const result = await enforcer.run('enforce Target 10');
    assertOutput(result, /demands.*target/i, 'enforcer should see the room broadcast');

    const targetMsg = target.transport.drain();
    assert.ok(/demands|submit|attack/i.test(targetMsg), 'target should receive the demand message');

    enforcer.cleanup();
    target.cleanup();
  });

  it('rejects a duplicate demand against the same target', async() => {
    const enforcer = ctx.session({ name: 'Enforcer' });
    const target   = ctx.session({ name: 'Target' });
    const claim = await claimBlack(enforcer);
    claimId = claim.id;

    await enforcer.run('enforce Target 10');
    target.transport.drain();

    const result = await enforcer.run('enforce Target 10');
    assertOutput(result, /already have an active/i);

    enforcer.cleanup();
    target.cleanup();
  });
});

// ---------------------------------------------------------------------------
// submit
// ---------------------------------------------------------------------------

describe('submit command', () => {
  let claimId = null;

  afterEach(async() => {
    enforcement.removeAllThreats('Enforcer');
    enforcement.removeSubmission('Target');
    await expireClaim(claimId);
    claimId = null;
  });

  it('reports no active demand when none has been issued', async() => {
    const s = ctx.session();
    const result = await s.run('submit');
    assertOutput(result, /nobody has issued/i);
    s.cleanup();
  });

  it('applies the submission and notifies both parties', async() => {
    const enforcer = ctx.session({ name: 'Enforcer' });
    const target   = ctx.session({ name: 'Target' });
    const claim = await claimBlack(enforcer);
    claimId = claim.id;

    await enforcer.run('enforce Target 10');
    target.transport.drain();
    enforcer.transport.drain();

    const result = await target.run('submit');
    assertOutput(result, /next.*minutes.*tax|submitted/i, 'target should receive submission confirmation');

    const enforcerMsg = enforcer.transport.drain();
    assert.ok(/submitted/i.test(enforcerMsg), 'enforcer should be notified of submission');

    enforcer.cleanup();
    target.cleanup();
  });
});
