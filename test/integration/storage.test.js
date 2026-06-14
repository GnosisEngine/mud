// test/integration/storage.test.js
'use strict';

/**
 * Storage persistence integration test
 *
 * Proves that every namespace managed by the storage bundle survives a
 * simulated in-process restart:
 *
 *   boot → write → shutdown → re-configure Storage → re-run startup → read
 *
 * Namespaces covered:
 *   - claims   (CompactableLog + SqlStore via claims' Store)
 *   - factions (SqlStore via ReputationStore)
 *   - channels (JsonStore via channelStore)
 *   - time     (JsonStore via time-store)
 *
 * The restart simulation re-uses the same GameState object to avoid the
 * full boot cost — only the storage singleton is reset and each bundle's
 * startup listener is re-run, which is exactly what a real server restart
 * would do with fresh module instances.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const storage = require('../../bundles/storage/lib/Storage');
const startupPoll = require('../../bundles/lib/lib/StartupPoll');

const { useSuite } = require('../harness/helpers');

const { setup, teardown, ctx } = useSuite('limbo:black');

// Lazily required after boot so Config.load() has run before any bundle
// module tries to call Config.get() at require time.
let storageServerEvents;
let claimsServerEvents;
let factionsServerEvents;
let channelsServerEvents;
let timeServerEvents;
let FACTION_EVENTS;
let timeStore;

before(async(t) => {
  await setup(t);

  storageServerEvents  = require('../../bundles/storage/server-events');
  claimsServerEvents   = require('../../bundles/claims/server-events');
  factionsServerEvents = require('../../bundles/factions/server-events');
  channelsServerEvents = require('../../bundles/channels/server-events');
  timeServerEvents     = require('../../bundles/time/server-events');
  FACTION_EVENTS       = require('../../bundles/factions/constants').FACTION_EVENTS;
  timeStore            = require('../../bundles/time/lib/time-store');
});
after(teardown);

// ---------------------------------------------------------------------------
// Restart helper
//
// Simulates a server restart in-process:
//   1. Run each bundle's shutdown listener (flush + close)
//   2. Reset the Storage singleton (clear caches; preserve files on disk)
//   3. Re-run the storage startup to re-configure the singleton
//   4. Re-run each bundle's startup listener to re-open stores from disk
// ---------------------------------------------------------------------------

async function simulateRestart(state) {
  const dataRoot = storage.getDataRoot();
  const isTestRoot = storage._isTestRoot;

  // Shutdown — each bundle flushes and closes its store
  await claimsServerEvents.listeners.shutdown()();
  await factionsServerEvents.listeners.shutdown(state)();
  await timeServerEvents.listeners.shutdown(state)();
  // channels has no shutdown listener — JsonStore writes are synchronous on every mutation

  // Reset Storage singleton caches without deleting the files on disk.
  // (cleanup() would rmSync the test root — we want files to survive.)
  for (const log of storage._logs.values()) log.flushBestEffort();
  for (const db of storage._dbs.values()) {
    try { db.close(); } catch (_) {}
  }
  storage._logs.clear();
  storage._dbs.clear();
  storage._dataRoot = null;

  // Re-configure with the same root so bundles re-open stores from disk
  storage.configure({ dataRoot, isTestRoot });
  state.Storage = storage;

  // Re-run bundle startup listeners — they re-open their stores from disk.
  // Claims and factions poll for state.Storage so run them concurrently.
  await Promise.all([
    claimsServerEvents.listeners.startup(state)(),
    factionsServerEvents.listeners.startup(state)(),
    channelsServerEvents.listeners.startup(state)(),
  ]);

  // time is alphabetically after storage so it never polls — run directly
  await timeServerEvents.listeners.startup(state)();
}

// ---------------------------------------------------------------------------
// claims
// ---------------------------------------------------------------------------

describe('claims persistence', () => {
  it('a claimed room survives a restart', async() => {
    const s = ctx.session();
    const room = ctx.state.RoomManager.getRoom('limbo:black');

    await s.run('claim 10');

    const { store } = ctx.state.StorageManager;
    const claimBefore = store.getClaimByRoom(room.entityReference);
    assert.ok(claimBefore, 'claim should exist before restart');
    assert.equal(claimBefore.ownerId, s.player.name);

    await simulateRestart(ctx.state);

    const claimAfter = ctx.state.StorageManager.store.getClaimByRoom(room.entityReference);
    assert.ok(claimAfter, 'claim should survive restart');
    assert.equal(claimAfter.ownerId, s.player.name, 'owner should be preserved');
    assert.equal(claimAfter.taxRate, 10, 'taxRate should be preserved');

    s.cleanup();
  });
});

// ---------------------------------------------------------------------------
// factions
// ---------------------------------------------------------------------------

describe('factions persistence', () => {
  it('reputation deltas survive a restart', async() => {
    const playerId = 'StorageTestPlayer';
    const factionId = 1;
    const store = ctx.state._factionStore;

    store.upsertDelta(playerId, factionId, FACTION_EVENTS.trade_completed, Date.now());

    const before = store.get(playerId, factionId);
    assert.ok(before, 'row should exist before restart');
    assert.equal(before.affinity, FACTION_EVENTS.trade_completed.affinity);

    await simulateRestart(ctx.state);

    const after = ctx.state._factionStore.get(playerId, factionId);
    assert.ok(after, 'row should survive restart');
    assert.equal(after.affinity, FACTION_EVENTS.trade_completed.affinity, 'affinity should be preserved');
    assert.equal(after.honor,    FACTION_EVENTS.trade_completed.honor,    'honor should be preserved');
    assert.equal(after.trust,    FACTION_EVENTS.trade_completed.trust,    'trust should be preserved');
  });
});

// ---------------------------------------------------------------------------
// channels
// ---------------------------------------------------------------------------

describe('channels persistence', () => {
  it('channel membership survives a restart', async() => {
    const { PlayerRoles } = require('ranvier');
    const admin = ctx.session({ name: 'StorageAdmin' });
    admin.player.role = PlayerRoles.ADMIN;
    const member = ctx.session({ name: 'StorageMember' });

    await admin.run('channel create storagechan secretpw');
    await admin.run(`channel invite ${member.player.name} storagechan`);

    const registryBefore = ctx.state.DynamicChannelRegistry;
    assert.ok(registryBefore.isMember('storagechan', admin.player.name),  'admin should be member before restart');
    assert.ok(registryBefore.isMember('storagechan', member.player.name), 'member should be member before restart');

    await simulateRestart(ctx.state);

    const registryAfter = ctx.state.DynamicChannelRegistry;
    assert.ok(registryAfter.isMember('storagechan', admin.player.name),  'admin should survive restart');
    assert.ok(registryAfter.isMember('storagechan', member.player.name), 'member should survive restart');
    assert.equal(registryAfter.get('storagechan').password, 'secretpw', 'password should survive restart');

    admin.cleanup();
    member.cleanup();
  });
});

// ---------------------------------------------------------------------------
// time
// ---------------------------------------------------------------------------

describe('time persistence', () => {
  it('tick counter survives a restart', async() => {
    const timeState = require('../../bundles/time/lib/time-state');

    // Set an in-memory tick value, then let the shutdown listener persist it
    const testTick = 99999;
    timeState.set(testTick);
    assert.equal(timeState.get(), testTick, 'sanity: set should update in-memory tick');

    // simulateRestart calls shutdown, which saves timeState.get() to disk,
    // then re-runs startup, which loads it back
    await simulateRestart(ctx.state);

    const tickAfter = ctx.state.TimeService.getTick();
    assert.equal(tickAfter, testTick, 'tick should be restored from disk after restart');
  });
});

// ---------------------------------------------------------------------------
// storage root
// ---------------------------------------------------------------------------

describe('storage bundle', () => {
  it('state.Storage is configured after boot', () => {
    assert.ok(ctx.state.Storage, 'state.Storage should be set');
    assert.ok(typeof ctx.state.Storage.getDataRoot === 'function');
    const root = ctx.state.Storage.getDataRoot();
    assert.ok(root.startsWith('/tmp'), 'test root should be under /tmp');
  });

  it('namespaceDir returns a path under the data root', () => {
    const root = ctx.state.Storage.getDataRoot();
    const dir = ctx.state.Storage.namespaceDir('claims');
    assert.equal(dir, path.join(root, 'claims'));
  });

  it('getDatabase returns the same instance on repeated calls', async() => {
    const a = await ctx.state.Storage.getDatabase('claims');
    const b = await ctx.state.Storage.getDatabase('claims');
    assert.equal(a, b, 'should return cached instance');
  });

  it('getLog returns the same instance on repeated calls', () => {
    const a = ctx.state.Storage.getLog('claims');
    const b = ctx.state.Storage.getLog('claims');
    assert.equal(a, b, 'should return cached instance');
  });
});
