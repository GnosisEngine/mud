// bundles/vendor-npcs/tests/layer9.test.js
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Config } = require('ranvier');

Config.load({
  dataDir: 'data',
  daysPerMonth: 28,
  mercMoveIntervalMs: 15000,
  mercFleeIntervalMs: 3000,
  mercMaxPenaltyStacks: 3,
});

const serverEvents = require('../server-events/index');

// ---------------------------------------------------------------------------
// Structural contracts
// ---------------------------------------------------------------------------

test('server-events exports a listeners object', () => {
  assert.ok(serverEvents.listeners, 'must have listeners property');
  assert.equal(typeof serverEvents.listeners, 'object');
});

test('server-events has a startup listener', () => {
  assert.equal(typeof serverEvents.listeners.startup, 'function');
});

test('server-events has a shutdown listener', () => {
  assert.equal(typeof serverEvents.listeners.shutdown, 'function');
});

test('startup listener follows state => async () => pattern', () => {
  const inner = serverEvents.listeners.startup({});
  assert.equal(typeof inner, 'function');
  // It should return a Promise (async function)
  const mockState = {
    MercenaryService: null,
    WorldManager: null,
    StorageManager: null,
  };
  const result = serverEvents.listeners.startup(mockState);
  assert.equal(typeof result, 'function');
});

test('shutdown listener follows state => async () => pattern', () => {
  const result = serverEvents.listeners.shutdown({});
  assert.equal(typeof result, 'function');
});

// ---------------------------------------------------------------------------
// Startup: registers MercenaryService on state synchronously before poll
// ---------------------------------------------------------------------------

test('startup: registers MercenaryService on state before dependencies are ready', () => {
  const state = {
    MercenaryService: null,
    WorldManager: null,
    StorageManager: null,
  };

  // Fire the handler but don't await — the poll will time out asynchronously.
  // We only care that the synchronous registration happened before the first await.
  serverEvents.listeners.startup(state)().catch(() => {});

  // MercenaryService is set synchronously before the poll awaits.
  assert.ok(state.MercenaryService !== null, 'MercenaryService must be set synchronously');
  assert.equal(typeof state.MercenaryService.hire, 'function');
  assert.equal(typeof state.MercenaryService.tick, 'function');
  assert.equal(typeof state.MercenaryService.boot, 'function');
  assert.equal(typeof state.MercenaryService.dismiss, 'function');
  assert.equal(typeof state.MercenaryService.beginFleeing, 'function');
  assert.equal(typeof state.MercenaryService.getContractsByPlayer, 'function');
  assert.equal(typeof state.MercenaryService.getCoveredRoomIds, 'function');
  assert.equal(typeof state.MercenaryService.getActiveMercCount, 'function');
});

// ---------------------------------------------------------------------------
// Shutdown: clears tick interval without throwing
// ---------------------------------------------------------------------------

test('shutdown: resolves cleanly when no tick interval is running', async() => {
  const handler = serverEvents.listeners.shutdown({});
  await assert.doesNotReject(async() => handler());
});

test('shutdown: can be called multiple times without error', async() => {
  const handler = serverEvents.listeners.shutdown({});
  await handler();
  await handler();
  // No throw = pass
});

// ---------------------------------------------------------------------------
// Full wiring smoke test: startup completes when dependencies are pre-loaded
// ---------------------------------------------------------------------------

test('startup: completes boot when WorldManager and StorageManager are pre-loaded', async() => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  // Create an empty player dir so boot() has nothing to scan
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-npcs-smoke-'));
  const playerDir = path.join(tmpDir, 'player');
  fs.mkdirSync(playerDir);

  // Patch DATA_DIR indirectly by overriding the constants module for this test.
  // Since we can't easily override DATA_DIR at runtime (it's computed at require
  // time), we verify smoke by supplying a state where boot() short-circuits
  // cleanly (no player files = no-op).
  const state = {
    MercenaryService: null,
    WorldManager: { getPath: () => null },
    StorageManager: {
      store: {
        getClaimsByOwner: () => [],
        getClaimByRoom: () => null,
      },
    },
    MobFactory: { create: () => ({ uuid: 'u1', name: 'M', keywords: [], metadata: {}, hydrate: () => {}, moveTo: () => {}, on: () => {}, removeAllListeners: () => {}, effects: { clear: () => {} } }) },
    MobManager: { addMob: () => {}, removeMob: () => {} },
    MobBehaviorManager: { get: () => null },
    ItemFactory: { create: () => ({ uuid: 'i1', name: 'C', keywords: [], entityReference: 'mercs:merc-contract', metadata: {}, getMeta: () => null, setMeta: () => {}, hydrate: () => {} }) },
    ItemManager: { add: () => {}, remove: () => {} },
    AreaManager: { getArea: () => ({ name: 'mercs' }) },
    RoomManager: { getRoom: () => null },
    PlayerManager: { getPlayersAsArray: () => [] },
    ChannelManager: { get: () => ({ send: () => {} }) },
  };

  const handler = serverEvents.listeners.startup(state);
  await handler();

  // After completion, MercenaryService is registered and tick is running
  assert.ok(state.MercenaryService !== null);

  // Clean up the tick interval that was started
  const shutdown = serverEvents.listeners.shutdown(state);
  await shutdown();

  fs.rmSync(tmpDir, { recursive: true });
});
