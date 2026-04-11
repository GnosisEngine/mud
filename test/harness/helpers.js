// test/harness/helpers.js
'use strict';

const { boot } = require('./GameHarness');
const { TestSession, stripAnsi } = require('./TestSession');

// Singleton state — boots once per process, shared across all test files

let _state = null;
let _booting = null;

async function getState() {
  if (_state) return _state;
  if (_booting) return _booting;
  _booting = boot().then(s => { _state = s; _booting = null; return s; });
  return _booting;
}

// Event loop utilities

function flush(ticks = 1) {
  let p = Promise.resolve();
  for (let i = 0; i < ticks; i++) {
    p = p.then(() => new Promise(r => setImmediate(r)));
  }
  return p;
}

// Room finders

function findRoom(state, predicate) {
  for (const [, area] of state.AreaManager.areas) {
    for (const [, room] of area.rooms) {
      if (predicate(room)) return room;
    }
  }
  return null;
}

function getRoom(state, roomRef) {
  const room = state.RoomManager.getRoom(roomRef);
  if (!room) throw new Error(`Room not found: ${roomRef}`);
  return room;
}

function anyRoom(state) {
  const room = findRoom(state, () => true);
  if (!room) throw new Error('No rooms loaded — check bundle boot');
  return room;
}

function roomWithNpcs(state) {
  return findRoom(state, room => room.npcs && room.npcs.size > 0);
}

function roomWithItems(state) {
  return findRoom(state, room => room.items && room.items.size > 0);
}

// Session factories

function session(state, roomOrRef, opts = {}) {
  const room = typeof roomOrRef === 'string' ? getRoom(state, roomOrRef) : (roomOrRef || anyRoom(state));
  return TestSession.create(state, room, opts);
}

// Two players in the same room — useful for give, follow, social commands
function twoSessions(state, roomOrRef, opts = {}) {
  const room = typeof roomOrRef === 'string' ? getRoom(state, roomOrRef) : (roomOrRef || anyRoom(state));
  const a = TestSession.create(state, room, { name: opts.nameA || 'TesterA', ...opts });
  const b = TestSession.create(state, room, { name: opts.nameB || 'TesterB', ...opts });
  return { a, b };
}

// Item helpers

// Probe each room item with get until one lands in inventory.
// Returns the first word of the item name, or null if nothing is takeable.
async function findTakeableItem(s) {
  const roomItems = [...s.player.room.items];
  for (const item of roomItems) {
    const itemName = (item.name || '').split(' ')[0].toLowerCase();
    if (!itemName) continue;
    const before = s.player.inventory.size;
    await s.run(`get ${itemName}`);
    if (s.player.inventory.size > before) return itemName;
  }
  return null;
}

// Plant an item directly into a player's inventory via ItemFactory.
// entityRef e.g. 'fief:rock'
function giveItem(state, player, entityRef) {
  const [areaName] = entityRef.split(':');
  const area = state.AreaManager.getArea(areaName);
  if (!area) throw new Error(`giveItem: area not found for ref '${entityRef}'`);
  const item = state.ItemFactory.create(area, entityRef);
  item.hydrate(state);
  player.addItem(item);
  state.ItemManager.add(item);
  return item;
}

// NPC helpers

// Spawn an NPC into a room. entityRef e.g. 'fief:guard'
function spawnNpc(state, room, entityRef) {
  const [areaName] = entityRef.split(':');
  const area = state.AreaManager.getArea(areaName);
  if (!area) throw new Error(`spawnNpc: area not found for ref '${entityRef}'`);
  const npc = state.MobFactory.create(area, entityRef);
  npc.hydrate(state);
  npc.moveTo(room);
  state.MobManager.addMob(npc);
  return npc;
}

function removeNpc(state, npc) {
  if (npc.room) npc.room.removeNpc(npc);
  state.MobManager.removeMob(npc);
}

// Standard before/after boilerplate for a test file
//
// Usage:
//   const { setup, teardown, ctx } = require('../harness/helpers').useSuite();
//   before(setup);
//   after(teardown);
//   // then ctx.state, ctx.room, ctx.session() are available in tests

function useSuite(roomRefOrFn) {
  const ctx = { state: null, room: null };

  async function setup() {
    try {
      ctx.state = await getState();
    } catch (err) {
      console.error('\n[harness] FATAL: game state failed to boot.\n', err, '\n');
      process.exit(1);
    }
    ctx.room = typeof roomRefOrFn === 'function'
      ? roomRefOrFn(ctx.state)
      : roomRefOrFn
        ? getRoom(ctx.state, roomRefOrFn)
        : anyRoom(ctx.state);
  }

  async function teardown() {
    if (ctx.state) {
      ctx.state.GameServer.emit('shutdown');
      await flush();
    }
    process.exit(0);
  }

  ctx.session = (opts) => session(ctx.state, ctx.room, opts);
  ctx.twoSessions = (opts) => twoSessions(ctx.state, ctx.room, opts);
  ctx.giveItem = (player, ref) => giveItem(ctx.state, player, ref);
  ctx.spawnNpc = (ref) => spawnNpc(ctx.state, ctx.room, ref);

  return { setup, teardown, ctx };
}

// Output assertions

function assertOutput(result, pattern, message) {
  const text = typeof result === 'string' ? result : result.text;
  const pass = pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
  if (!pass) {
    const desc = pattern instanceof RegExp ? pattern.toString() : JSON.stringify(pattern);
    throw new Error(`${message || 'Output mismatch'}\nExpected: ${desc}\nActual:   ${JSON.stringify(text)}`);
  }
}

function assertNoOutput(result, pattern, message) {
  const text = typeof result === 'string' ? result : result.text;
  const pass = pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
  if (pass) {
    const desc = pattern instanceof RegExp ? pattern.toString() : JSON.stringify(pattern);
    throw new Error(`${message || 'Unexpected output found'}\nDid not expect: ${desc}\nActual: ${JSON.stringify(text)}`);
  }
}

// Spawn the mercs:broker NPC into a room.
function spawnBroker(state, room) {
  const area = state.AreaManager.getArea('mercs');
  const npc = state.MobFactory.create(area, 'mercs:broker');
  npc.hydrate(state);
  npc.moveTo(room);
  return npc;
}

// Remove an NPC spawned for a test.
function cleanupNpc(state, npc) {
  if (!npc) return;
  if (npc.room) npc.room.removeNpc(npc);
  state.MobManager.removeMob(npc);
}

// Patch claims store to return a single claim for any player.
// claimedRoomRef must exist in RoomManager (e.g. 'limbo:black').
function patchNoClaims(state) {
  if (!state.StorageManager) {
    state.StorageManager = { store: {} };
  }
  const store = state.StorageManager.store;
  store._origGetClaims = store.getClaimsByOwner ? store.getClaimsByOwner.bind(store) : null;
  store.getClaimsByOwner = _name => [];
}

function patchClaims(state, claimedRoomRef = 'limbo:black') {
  if (!state.StorageManager) {
    state.StorageManager = { store: {} };
  }
  const store = state.StorageManager.store;
  if (!store._origGetClaims) {
    store._origGetClaims = store.getClaimsByOwner ? store.getClaimsByOwner.bind(store) : null;
  }
  store.getClaimsByOwner = _name => [{ roomId: claimedRoomRef, id: 'test-claim-1' }];
}

function restoreClaims(state) {
  if (!state.StorageManager) return;
  const store = state.StorageManager.store;
  if (store._origGetClaims) {
    store.getClaimsByOwner = store._origGetClaims;
    delete store._origGetClaims;
  } else {
    delete store.getClaimsByOwner;
  }
}

// Give a player gold by setting their currency metadata.
function giveGold(player, amount) {
  if (!player.metadata.currencies) player.metadata.currencies = {};
  player.metadata.currencies.gold = amount;
}

module.exports = {
  spawnBroker,
  cleanupNpc,
  patchNoClaims,
  patchClaims,
  restoreClaims,
  giveGold,
  getState,
  flush,
  findRoom,
  getRoom,
  anyRoom,
  roomWithNpcs,
  roomWithItems,
  session,
  twoSessions,
  findTakeableItem,
  giveItem,
  spawnNpc,
  removeNpc,
  useSuite,
  assertOutput,
  assertNoOutput,
  stripAnsi,
};
