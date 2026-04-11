// bundles/vendor-npcs/tests/layer7.test.js
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

const behavior = require('../behaviors/npc/merc-patrol');
const { build } = require('../lib/MercenaryService');

// ---------------------------------------------------------------------------
// Mock builders
// ---------------------------------------------------------------------------

function makeNpc({ contractId = 'mc_test', status = 'EN_ROUTE', hp = 100, maxHp = 100 } = {}) {
  const meta = {
    merc: { contractId, status, homeRoomId: 'mapped:home' },
  };
  return {
    room: { entityReference: 'test:room' },
    getMeta: key => {
      const parts = key.split('.');
      let cur = meta;
      for (const p of parts) cur = cur?.[p];
      return cur;
    },
    setMeta: (key, val) => {
      const parts = key.split('.');
      let cur = meta;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    },
    getAttribute: attr => {
      if (attr === 'health') return hp;
      throw new RangeError(`no attribute ${attr}`);
    },
    getMaxAttribute: attr => {
      if (attr === 'health') return maxHp;
      throw new RangeError(`no attribute ${attr}`);
    },
    metadata: { merc: { contractId, status } },
  };
}

function makeRoom(id = 'mapped:home') {
  return { entityReference: id };
}

function makeState({ beginFleeingCalls = [], rooms = {} } = {}) {
  return {
    MercenaryService: {
      beginFleeing: (contractId) => beginFleeingCalls.push(contractId),
    },
    RoomManager: {
      getRoom: id => rooms[id] || null,
    },
    WorldManager: {
      getPath: () => ({ coords: [[1, 0]] }),
    },
  };
}

// Extract the updateTick handler bound to a given NPC (mimics how Ranvier
// calls a behavior listener: `listener.call(npc, config)`).
function runTick(npc, state, config = true) {
  const handler = behavior.listeners.updateTick(state);
  handler.call(npc, config);
}

// ---------------------------------------------------------------------------
// merc-patrol behavior — guard clauses
// ---------------------------------------------------------------------------

test('behavior: no-op when npc has no room', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ hp: 10, maxHp: 100 }); // would flee
  npc.room = null;

  runTick(npc, state);

  assert.equal(calls.length, 0);
});

test('behavior: no-op when MercenaryService is not on state', () => {
  const npc = makeNpc({ hp: 10, maxHp: 100 });
  const state = { MercenaryService: null, RoomManager: { getRoom: () => null } };

  // Should not throw
  assert.doesNotThrow(() => runTick(npc, state));
});

test('behavior: no-op when contractId is absent from npc meta', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ hp: 10, maxHp: 100 });
  // Override getMeta to return null for contractId
  npc.getMeta = key => key === 'merc.contractId' ? null : undefined;

  runTick(npc, state);

  assert.equal(calls.length, 0);
});

test('behavior: no-op when status is idle', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ status: 'idle', hp: 10, maxHp: 100 });

  runTick(npc, state);

  assert.equal(calls.length, 0);
});

test('behavior: no-op when status is already FLEEING', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ status: 'FLEEING', hp: 10, maxHp: 100 });

  runTick(npc, state);

  assert.equal(calls.length, 0);
});

test('behavior: no-op when status is RETURNING', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ status: 'RETURNING', hp: 10, maxHp: 100 });

  runTick(npc, state);

  assert.equal(calls.length, 0);
});

test('behavior: no-op when getAttribute throws (attributes not initialised)', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ hp: 10, maxHp: 100 });
  npc.getAttribute = () => { throw new RangeError('no attr'); };

  runTick(npc, state);

  assert.equal(calls.length, 0);
});

// ---------------------------------------------------------------------------
// merc-patrol behavior — HP threshold detection
// ---------------------------------------------------------------------------

test('behavior: does not trigger FLEEING when HP is exactly 50%', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ status: 'STATIONED', hp: 50, maxHp: 100 });

  runTick(npc, state);

  assert.equal(calls.length, 0);
});

test('behavior: does not trigger FLEEING when HP is above 50%', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ status: 'STATIONED', hp: 80, maxHp: 100 });

  runTick(npc, state);

  assert.equal(calls.length, 0);
});

test('behavior: triggers beginFleeing when HP drops below 50% while STATIONED', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ contractId: 'mc_abc', status: 'STATIONED', hp: 49, maxHp: 100 });

  runTick(npc, state);

  assert.equal(calls.length, 1);
  assert.equal(calls[0], 'mc_abc');
});

test('behavior: triggers beginFleeing when HP drops below 50% while EN_ROUTE', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ contractId: 'mc_abc', status: 'EN_ROUTE', hp: 1, maxHp: 100 });

  runTick(npc, state);

  assert.equal(calls.length, 1);
});

test('behavior: does not trigger when maxHp is 0 (guards division by zero)', () => {
  const calls = [];
  const state = makeState({ beginFleeingCalls: calls });
  const npc = makeNpc({ status: 'STATIONED', hp: 0, maxHp: 0 });

  runTick(npc, state);

  assert.equal(calls.length, 0);
});

test('behavior: multiple ticks at low HP only fire beginFleeing while status allows', () => {
  const calls = [];
  const fleeingCalls = [];
  const state = makeState({ beginFleeingCalls: calls });
  // Override to track AND update status so second tick is blocked
  state.MercenaryService.beginFleeing = contractId => {
    fleeingCalls.push(contractId);
    npc.getMeta = key => {
      if (key === 'merc.contractId') return 'mc_abc';
      if (key === 'merc.status') return 'FLEEING';
      return null;
    };
  };

  const npc = makeNpc({ contractId: 'mc_abc', status: 'STATIONED', hp: 20, maxHp: 100 });

  runTick(npc, state);
  runTick(npc, state); // second tick — status now FLEEING, should be skipped

  assert.equal(fleeingCalls.length, 1);
});

// ---------------------------------------------------------------------------
// MercenaryService.beginFleeing
// ---------------------------------------------------------------------------

function makeServiceState(rooms = {}) {
  const mobs = new Map();
  return {
    _mobs: mobs,
    MobManager: {
      addMob: npc => mobs.set(npc.uuid, npc),
      removeMob: npc => { mobs.delete(npc.uuid); npc.room = null; },
    },
    MobFactory: {
      create: () => {
        const { EventEmitter } = require('events');
        const npc = Object.assign(new EventEmitter(), {
          uuid: `npc-${Date.now()}`,
          name: 'Mock', keywords: [], metadata: {},
          room: null,
          getMeta: key => {
            const parts = key.split('.');
            let cur = npc.metadata;
            for (const p of parts) cur = cur?.[p];
            return cur;
          },
          setMeta: (key, val) => {
            const parts = key.split('.');
            let cur = npc.metadata;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!cur[parts[i]]) cur[parts[i]] = {};
              cur = cur[parts[i]];
            }
            cur[parts[parts.length - 1]] = val;
          },
          moveTo: room => { npc.room = room; },
          hydrate: s => { s.MobManager.addMob(npc); },
          effects: { clear: () => {} },
          removeAllListeners: () => {},
        });
        return npc;
      },
    },
    MobBehaviorManager: { get: () => null },
    ItemFactory: {
      create: () => ({
        uuid: `item-${Date.now()}`, name: 'Contract', keywords: [],
        entityReference: 'mercs:merc-contract', metadata: {},
        getMeta: () => null,
        setMeta: () => {},
        hydrate: () => {},
      }),
    },
    ItemManager: { add: () => {}, remove: () => {} },
    AreaManager: { getArea: () => ({ name: 'mercs' }) },
    RoomManager: { getRoom: id => rooms[id] || null },
    WorldManager: { getPath: () => ({ coords: [[1, 0]] }) },
    StorageManager: {
      store: {
        getClaimsByOwner: () => [{ roomId: 'mapped:claim1', id: 'c1' }],
        getClaimByRoom: () => null,
      },
    },
    PlayerManager: { getPlayersAsArray: () => [] },
    ChannelManager: { get: () => ({ send: () => {} }) },
  };
}

function hireTestMerc(svc, state) {
  const player = {
    name: 'Alice',
    getMeta: key => key === 'currencies.gold' ? 9999 : null,
    setMeta: () => {},
    isInventoryFull: () => false,
    addItem: () => {},
    removeItem: () => {},
    save: () => {},
    getBroadcastTargets: () => [],
    socket: { writable: false },
    inventory: new Map(),
  };
  const vendorNpc = {
    getMeta: key => key === 'mercenary' ? {
      name: 'Jan', homeRoomId: 'mapped:home', tier: 1,
      cost: 100, currency: 'gold', upkeepCost: 50, upkeepCurrency: 'gold',
    } : null,
  };
  svc.hire(player, vendorNpc, state);
  return svc.getContractsByPlayer('Alice')[0];
}

test('beginFleeing: no-op for unknown contractId', () => {
  const svc = build();
  const homeRoom = makeRoom('mapped:home');
  const claimRoom = makeRoom('mapped:claim1');
  const state = makeServiceState({ 'mapped:home': homeRoom, 'mapped:claim1': claimRoom });

  // Should not throw
  assert.doesNotThrow(() => svc.beginFleeing('mc_does_not_exist', state));
});

test('beginFleeing: transitions EN_ROUTE merc to FLEEING', () => {
  const svc = build();
  const homeRoom = makeRoom('mapped:home');
  const claimRoom = makeRoom('mapped:claim1');
  const state = makeServiceState({ 'mapped:home': homeRoom, 'mapped:claim1': claimRoom });

  const entry = hireTestMerc(svc, state);
  assert.equal(entry.status, 'EN_ROUTE');

  svc.beginFleeing(entry.contractId, state);

  assert.equal(entry.status, 'FLEEING');
});

test('beginFleeing: transitions STATIONED merc to FLEEING', () => {
  const svc = build();
  const homeRoom = makeRoom('mapped:home');
  const claimRoom = makeRoom('mapped:claim1');
  const state = makeServiceState({ 'mapped:home': homeRoom, 'mapped:claim1': claimRoom });

  const entry = hireTestMerc(svc, state);
  entry.status = 'STATIONED';

  svc.beginFleeing(entry.contractId, state);

  assert.equal(entry.status, 'FLEEING');
});

test('beginFleeing: no-op when already FLEEING', () => {
  const svc = build();
  const homeRoom = makeRoom('mapped:home');
  const claimRoom = makeRoom('mapped:claim1');
  const state = makeServiceState({ 'mapped:home': homeRoom, 'mapped:claim1': claimRoom });

  const entry = hireTestMerc(svc, state);
  entry.status = 'FLEEING';
  const pathBefore = entry.path;

  svc.beginFleeing(entry.contractId, state);

  assert.equal(entry.status, 'FLEEING');
  assert.equal(entry.path, pathBefore); // path unchanged
});

test('beginFleeing: no-op when already RETURNING', () => {
  const svc = build();
  const homeRoom = makeRoom('mapped:home');
  const claimRoom = makeRoom('mapped:claim1');
  const state = makeServiceState({ 'mapped:home': homeRoom, 'mapped:claim1': claimRoom });

  const entry = hireTestMerc(svc, state);
  entry.status = 'RETURNING';

  svc.beginFleeing(entry.contractId, state);

  assert.equal(entry.status, 'RETURNING');
});

test('beginFleeing: updates npcInstance metadata status', () => {
  const svc = build();
  const homeRoom = makeRoom('mapped:home');
  const claimRoom = makeRoom('mapped:claim1');
  const state = makeServiceState({ 'mapped:home': homeRoom, 'mapped:claim1': claimRoom });

  const entry = hireTestMerc(svc, state);
  svc.beginFleeing(entry.contractId, state);

  assert.equal(entry.npcInstance.metadata.merc.status, 'FLEEING');
});

test('beginFleeing: computes a new path toward homeRoomId', () => {
  const svc = build();
  const homeRoom  = { entityReference: 'mapped:home',   coordinates: { x: 0, y: 0, z: 0 } };
  const claimRoom = { entityReference: 'mapped:claim1', coordinates: { x: 5, y: 5, z: 0 } };
  const state = makeServiceState({ 'mapped:home': homeRoom, 'mapped:claim1': claimRoom });

  const entry = hireTestMerc(svc, state);
  //const oldPath = entry.path;

  // Place NPC at claim room to make path non-trivial
  entry.npcInstance.room = claimRoom;
  entry.pathIndex = 999; // stale

  svc.beginFleeing(entry.contractId, state);

  // Path should be reset (pathIndex back to 0 and path recomputed)
  assert.equal(entry.pathIndex, 0);
});
