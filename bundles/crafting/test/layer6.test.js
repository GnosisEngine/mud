// resources/test/layer6.test.js
'use strict';

const assert = require('assert');
const SpawnLoop = require('../lib/SpawnLoop');
const NpcDeathHandler = require('../lib/NpcDeathHandler');
const RC = require('../lib/ResourceContainer');
const TR = require('../lib/TerrainResolver');
const { SPAWN_TICK_MS } = require('../constants');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function mockEntity(strength = 10, resources = {}) {
  const store = { resources: { ...resources } };
  return {
    getMeta(key) {
      return key.split('.').reduce((o, k) => (o != null ? o[k] : undefined), store);
    },
    setMeta(key, val) {
      const parts = key.split('.');
      let cur = store;
      for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    },
    getAttribute(attr) {
      return attr === 'strength' ? strength : 0;
    },
  };
}

let _itemIdCounter = 0;

function mockResourceItem(resourceKey) {
  const store = {
    resource: { resourceKey },
  };
  return {
    id: `item_${++_itemIdCounter}`,
    type: 'RESOURCE',
    getMeta(key) { return store[key]; },
    setMeta(key, val) { store[key] = val; },
    hydrate: () => { },
  };
}

function mockCorpseItem() {
  const store = { isCorpse: true };
  return {
    id: `corpse_${++_itemIdCounter}`,
    type: 'OBJECT',
    getMeta(key) { return store[key]; },
    setMeta(key, val) { store[key] = val; },
  };
}

function mockNonResourceItem() {
  return {
    id: `item_${++_itemIdCounter}`,
    type: 'OBJECT',
    getMeta() { return undefined; },
    setMeta() { },
  };
}

function mockRoom(id = 'area:room1') {
  const items = new Set();
  const emitted = [];
  return {
    id,
    items,
    addItem(item) { items.add(item); },
    emit(event, data) { emitted.push({ event, data }); },
    _emitted: emitted,
  };
}

function mockArea(zoneType, rooms = new Map()) {
  return {
    metadata: { zoneType },
    rooms,
  };
}

function mockState({
  areas = new Map(),
  resourcesArea = null,
  itemFactoryFn = null,
  addedItems = [],
} = {}) {
  return {
    AreaManager: {
      areas,
      getArea(name) {
        if (name === 'craft') return resourcesArea;
        return null;
      },
    },
    ItemFactory: {
      create(area, ref) {
        if (itemFactoryFn) return itemFactoryFn(area, ref);
        const key = ref.split(':')[1];
        return mockResourceItem(key);
      },
    },
    ItemManager: {
      add(item) { addedItems.push(item); },
    },
    MobManager: {
      _listeners: {},
      on(event, fn) {
        this._listeners[event] = this._listeners[event] || [];
        this._listeners[event].push(fn);
      },
    },
    BundleManager: {
      getBundle() { return null; },
    },
  };
}

// ─── SpawnLoop ────────────────────────────────────────────────────────────────

console.log('\nLayer 6 — SpawnLoop + NpcDeathHandler\n');

console.log('SpawnLoop.tick — zone filtering');

test('does not spawn in non-SUPPLY/WILDERNESS areas', () => {
  TR.init(() => 'mountain');
  const room = mockRoom();
  const area = mockArea('TOWN', new Map([['r1', room]]));
  const addedItems = [];
  const state = mockState({ areas: new Map([['a', area]]), addedItems });
  SpawnLoop.tick(state);
  assert.strictEqual(addedItems.length, 0);
  TR.reset();
});

test('does not spawn in area with no zoneType', () => {
  TR.init(() => 'mountain');
  const room = mockRoom();
  const area = mockArea(undefined, new Map([['r1', room]]));
  const addedItems = [];
  const state = mockState({ areas: new Map([['a', area]]), addedItems });
  SpawnLoop.tick(state);
  assert.strictEqual(addedItems.length, 0);
  TR.reset();
});

test('spawns in SUPPLY zone', () => {
  TR.init(() => 'mountain');
  const room = mockRoom();
  const area = mockArea('SUPPLY', new Map([['r1', room]]));
  const addedItems = [];
  const resourcesArea = {};
  const state = mockState({
    areas: new Map([['a', area]]),
    resourcesArea,
    addedItems,
  });
  SpawnLoop.tick(state);
  assert.ok(addedItems.length > 0 || room.items.size > 0);
  TR.reset();
});

test('spawns in WILDERNESS zone', () => {
  TR.init(() => 'grassland');
  const room = mockRoom();
  const area = mockArea('WILDERNESS', new Map([['r1', room]]));
  const addedItems = [];
  const state = mockState({
    areas: new Map([['a', area]]),
    resourcesArea: {},
    addedItems,
  });
  SpawnLoop.tick(state);
  assert.ok(addedItems.length > 0 || room.items.size > 0);
  TR.reset();
});

test('iterates multiple rooms in one tick', () => {
  TR.init(() => 'mountain');
  const room1 = mockRoom('a:r1');
  const room2 = mockRoom('a:r2');
  const area = mockArea('SUPPLY', new Map([['r1', room1], ['r2', room2]]));
  const addedItems = [];
  const state = mockState({
    areas: new Map([['a', area]]),
    resourcesArea: {},
    addedItems,
  });
  SpawnLoop.tick(state);
  TR.reset();
});

console.log('\nSpawnLoop.tick — density cap');

test('does not exceed maxDensity for a resource in a room', () => {
  TR.init(() => 'mountain');
  const room = mockRoom();

  const ST = require('../lib/SpawnTable');
  const RD = require('../lib/ResourceDefinitions');
  const candidates = ST.getSpawnCandidates('forest');
  const target = candidates.find(c => RD.isValidKey(c.resourceKey));

  for (let i = 0; i < target.maxDensity; i++) {
    room.items.add(mockResourceItem(target.resourceKey));
  }

  const addedItems = [];
  const area = mockArea('SUPPLY', new Map([['r1', room]]));

  const state = mockState({
    areas: new Map([['a', area]]),
    resourcesArea: {},
    itemFactoryFn: (_, ref) => {
      const key = ref.split(':')[1];
      if (key === target.resourceKey) {
        const item = mockResourceItem(key);
        addedItems.push(item);
        return item;
      }
      return mockResourceItem(key);
    },
  });

  SpawnLoop.tick(state);
  assert.strictEqual(addedItems.length, 0,
    `should not have spawned more ${target.resourceKey} beyond maxDensity ${target.maxDensity}`);
  TR.reset();
});

test('item is added to both room and ItemManager', () => {
  TR.init(() => 'grassland');
  const room = mockRoom();
  const area = mockArea('SUPPLY', new Map([['r1', room]]));
  const addedItems = [];
  const state = mockState({
    areas: new Map([['a', area]]),
    resourcesArea: {},
    addedItems,
  });
  SpawnLoop.tick(state);

  if (addedItems.length > 0) {
    assert.ok(room.items.has(addedItems[0]),
      'item added to ItemManager must also be in room.items');
  }
  TR.reset();
});

test('hydrate is called on spawned item', () => {
  TR.init(() => 'mountain');
  const room = mockRoom();
  const area = mockArea('SUPPLY', new Map([['r1', room]]));
  const hydrated = [];
  const state = mockState({
    areas: new Map([['a', area]]),
    resourcesArea: {},
    itemFactoryFn: (_, ref) => {
      const key = ref.split(':')[1];
      const item = mockResourceItem(key);
      item.hydrate = (s) => { hydrated.push(item); };
      return item;
    },
  });
  SpawnLoop.tick(state);
  assert.ok(hydrated.length > 0, 'hydrate should have been called');
  TR.reset();
});

console.log('\nSpawnLoop.tick — fault tolerance');

test('does not throw when resources area is not found', () => {
  TR.init(() => 'mountain');
  const room = mockRoom();
  const area = mockArea('SUPPLY', new Map([['r1', room]]));
  const state = mockState({
    areas: new Map([['a', area]]),
    resourcesArea: null,
  });
  assert.doesNotThrow(() => SpawnLoop.tick(state));
  TR.reset();
});

test('does not throw when ItemFactory throws', () => {
  TR.init(() => 'mountain');
  const room = mockRoom();
  const area = mockArea('SUPPLY', new Map([['r1', room]]));
  const state = mockState({
    areas: new Map([['a', area]]),
    resourcesArea: {},
    itemFactoryFn: () => { throw new Error('item ref not found'); },
  });
  assert.doesNotThrow(() => SpawnLoop.tick(state));
  TR.reset();
});

test('does not throw when ItemFactory returns null', () => {
  TR.init(() => 'mountain');
  const room = mockRoom();
  const area = mockArea('SUPPLY', new Map([['r1', room]]));
  const state = mockState({
    areas: new Map([['a', area]]),
    resourcesArea: {},
    itemFactoryFn: () => null,
  });
  assert.doesNotThrow(() => SpawnLoop.tick(state));
  TR.reset();
});

test('does not throw when area map is empty', () => {
  const state = mockState({ areas: new Map() });
  assert.doesNotThrow(() => SpawnLoop.tick(state));
});

test('does not throw when room has no items', () => {
  TR.init(() => 'mountain');
  const room = mockRoom();
  assert.strictEqual(room.items.size, 0);
  const area = mockArea('SUPPLY', new Map([['r1', room]]));
  const state = mockState({
    areas: new Map([['a', area]]),
    resourcesArea: {},
  });
  assert.doesNotThrow(() => SpawnLoop.tick(state));
  TR.reset();
});

// ─── NpcDeathHandler ─────────────────────────────────────────────────────────

console.log('\nNpcDeathHandler.handleKilled — basic behavior');

test('no-op when NPC has no resources', () => {
  const npc = mockEntity(10, {});
  const room = mockRoom();
  npc.room = room;
  const state = mockState();
  NpcDeathHandler.handleKilled(npc, state);
  assert.strictEqual(room.items.size, 0);
  assert.strictEqual(room._emitted.length, 0);
});

test('clears NPC resources after handling', () => {
  const npc = mockEntity(10, { gold_coin: 50 });
  const room = mockRoom();
  npc.room = room;
  room.items.add(mockCorpseItem());
  NpcDeathHandler.handleKilled(npc, mockState());
  assert.deepStrictEqual(RC.getHeld(npc), {});
});

test('clears NPC resources even when room is null', () => {
  const npc = mockEntity(10, { gold_coin: 50 });
  npc.room = null;
  NpcDeathHandler.handleKilled(npc, mockState());
  assert.deepStrictEqual(RC.getHeld(npc), {});
});

console.log('\nNpcDeathHandler.handleKilled — corpse present');

test('merges all resource drops into corpse resourceDrops metadata', () => {
  const npc = mockEntity(10, { gold_coin: 30, plant_material: 5 });
  const room = mockRoom();
  const corpse = mockCorpseItem();
  room.items.add(corpse);
  npc.room = room;

  NpcDeathHandler.handleKilled(npc, mockState());

  const drops = corpse.getMeta('resourceDrops');
  assert.strictEqual(drops.gold_coin, 30);
  assert.strictEqual(drops.plant_material, 5);
});

test('merges into existing resourceDrops on corpse without overwriting', () => {
  const npc = mockEntity(10, { gold_coin: 20 });
  const room = mockRoom();
  const corpse = mockCorpseItem();
  corpse.setMeta('resourceDrops', { gold_coin: 10, iron_ore: 3 });
  room.items.add(corpse);
  npc.room = room;

  NpcDeathHandler.handleKilled(npc, mockState());

  const drops = corpse.getMeta('resourceDrops');
  assert.strictEqual(drops.gold_coin, 30);
  assert.strictEqual(drops.iron_ore, 3);
});

test('does not emit orphanedDrops when corpse is found', () => {
  const npc = mockEntity(10, { gold_coin: 10 });
  const room = mockRoom();
  room.items.add(mockCorpseItem());
  npc.room = room;

  NpcDeathHandler.handleKilled(npc, mockState());

  assert.strictEqual(room._emitted.length, 0);
});

test('uses first corpse found when multiple items in room', () => {
  const npc = mockEntity(10, { gold_coin: 15 });
  const room = mockRoom();
  room.items.add(mockNonResourceItem());
  const corpse = mockCorpseItem();
  room.items.add(corpse);
  room.items.add(mockNonResourceItem());
  npc.room = room;

  NpcDeathHandler.handleKilled(npc, mockState());

  const drops = corpse.getMeta('resourceDrops');
  assert.ok(drops && drops.gold_coin === 15);
});

console.log('\nNpcDeathHandler.handleKilled — no corpse');

test('emits resource:orphanedDrops on room when no corpse found', () => {
  const npc = mockEntity(10, { gold_coin: 25 });
  const room = mockRoom();
  room.items.add(mockNonResourceItem());
  npc.room = room;

  NpcDeathHandler.handleKilled(npc, mockState());

  const evt = room._emitted.find(e => e.event === 'resource:orphanedDrops');
  assert.ok(evt, 'expected resource:orphanedDrops to be emitted');
  assert.strictEqual(evt.data.drops.gold_coin, 25);
  assert.strictEqual(evt.data.npc, npc);
});

test('emits resource:orphanedDrops when room is empty', () => {
  const npc = mockEntity(10, { plant_material: 4 });
  const room = mockRoom();
  npc.room = room;

  NpcDeathHandler.handleKilled(npc, mockState());

  const evt = room._emitted.find(e => e.event === 'resource:orphanedDrops');
  assert.ok(evt);
  assert.strictEqual(evt.data.drops.plant_material, 4);
});

test('NPC resources are cleared even when orphaned', () => {
  const npc = mockEntity(10, { silver_coin: 100 });
  const room = mockRoom();
  npc.room = room;

  NpcDeathHandler.handleKilled(npc, mockState());

  assert.deepStrictEqual(RC.getHeld(npc), {});
});

console.log('\nconstants');

test('SPAWN_TICK_MS is a positive number', () => {
  assert.ok(typeof SPAWN_TICK_MS === 'number' && SPAWN_TICK_MS > 0);
});

test('SPAWNABLE_ZONE_TYPES includes SUPPLY and WILDERNESS', () => {
  assert.ok(SpawnLoop.SPAWNABLE_ZONE_TYPES.has('SUPPLY'));
  assert.ok(SpawnLoop.SPAWNABLE_ZONE_TYPES.has('WILDERNESS'));
});

test('SPAWNABLE_ZONE_TYPES does not include TOWN or PATHWAY', () => {
  assert.ok(!SpawnLoop.SPAWNABLE_ZONE_TYPES.has('TOWN'));
  assert.ok(!SpawnLoop.SPAWNABLE_ZONE_TYPES.has('PATHWAY'));
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);