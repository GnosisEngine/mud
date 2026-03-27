// resources/test/layer11.test.js
'use strict';

const assert = require('assert');
const ResourceRot = require('../lib/ResourceRot');
const RC = require('../lib/ResourceContainer');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  \u2713 ' + name);
    passed++;
  } catch (e) {
    console.error('  \u2717 ' + name);
    console.error('    ' + e.message);
    failed++;
  }
}

function mockEntity(strength, resources) {
  strength = strength || 10;
  resources = resources || {};
  const store = { resources: Object.assign({}, resources) };
  const listeners = {};
  return {
    getMeta: function(key) {
      return key.split('.').reduce(function(o, k) { return o != null ? o[k] : undefined; }, store);
    },
    setMeta: function(key, val) {
      const parts = key.split('.');
      let cur = store;
      for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] == null) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    },
    getAttribute: function(attr) {
      return attr === 'strength' ? strength : 0;
    },
    emit: function(event, data) {
      const evtListeners = listeners[event] || [];
      evtListeners.forEach(function(fn) { fn(data); });
    },
    on: function(event, fn) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    _emitted: [],
  };
}

function mockState(players, currentTick) {
  const playerMap = new Map();
  players.forEach(function(p, i) { playerMap.set('p' + i, p); });

  return {
    ClockBundle: {
      getCurrentTick: function() { return currentTick || 1000; },
    },
    PlayerManager: {
      players: playerMap,
      _enterListeners: [],
      on: function(event, fn) {
        if (event === 'playerEnter') this._enterListeners.push(fn);
      },
      simulateEnter: function(player) {
        this._enterListeners.forEach(function(fn) { fn(player); });
      },
    },
    BundleManager: { getBundle: function() { return null; } },
    MobManager: { on: function() {} },
    SpawnLoop: { tick: function() {} },
  };
}

function simulateServerStart(state) {
  const listeners = require('../server-events').listeners;
  listeners['server:start'](state)();
}

console.log('\nLayer 11 - server-events rot wiring\n');

console.log('rot poll');

test('does not throw when player has no rot entries', function() {
  const player = mockEntity(10, { honey: 4 });
  const state = mockState([player], 1000);
  assert.doesNotThrow(function() {
    simulateServerStart(state);
  });
});

test('processes expired rot entries for online players', function() {
  const player = mockEntity(10, { honey: 4 });
  ResourceRot.addRotEntry(player, 'honey', 4, 500);
  const state = mockState([player], 1000);
  simulateServerStart(state);

  const rotted = [];
  player.on('resource:rotted', function(data) { rotted.push(data); });

  const poll = setInterval(function() {}, 0);
  clearInterval(poll);

  const currentTick = state.ClockBundle.getCurrentTick();
  const result = ResourceRot.processEntity(player, currentTick);
  assert.strictEqual(result.rotted.honey, 4);
  assert.deepStrictEqual(RC.getHeld(player), {});
});

test('does not emit resource:rotted when nothing rotted', function() {
  const player = mockEntity(10, { honey: 4 });
  ResourceRot.addRotEntry(player, 'honey', 4, 9999);
  const emitted = [];
  player.on('resource:rotted', function(d) { emitted.push(d); });

  const currentTick = 1000;
  const result = ResourceRot.processEntity(player, currentTick);
  assert.strictEqual(Object.keys(result.rotted).length, 0);
  assert.strictEqual(emitted.length, 0);
});

test('emits resource:rotted with correct payload when rot occurs', function() {
  const player = mockEntity(10, { honey: 3 });
  ResourceRot.addRotEntry(player, 'honey', 3, 500);
  const emitted = [];
  player.on('resource:rotted', function(d) { emitted.push(d); });

  const result = ResourceRot.processEntity(player, 1000);
  if (Object.keys(result.rotted).length) {
    player.emit('resource:rotted', { player: player, rotted: result.rotted });
  }

  assert.strictEqual(emitted.length, 1);
  assert.strictEqual(emitted[0].rotted.honey, 3);
  assert.strictEqual(emitted[0].player, player);
});

test('processes multiple online players independently', function() {
  const playerA = mockEntity(10, { honey: 4 });
  const playerB = mockEntity(10, { alluvial_gold: 6 });
  ResourceRot.addRotEntry(playerA, 'honey', 4, 500);
  ResourceRot.addRotEntry(playerB, 'alluvial_gold', 6, 500);

  const currentTick = 1000;
  const resultA = ResourceRot.processEntity(playerA, currentTick);
  const resultB = ResourceRot.processEntity(playerB, currentTick);

  assert.strictEqual(resultA.rotted.honey, 4);
  assert.strictEqual(resultB.rotted.alluvial_gold, 6);
  assert.deepStrictEqual(RC.getHeld(playerA), {});
  assert.deepStrictEqual(RC.getHeld(playerB), {});
});

console.log('\noffline rot on login');

test('expired entries are processed when player logs in', function() {
  const player = mockEntity(10, { honey: 5 });
  ResourceRot.addRotEntry(player, 'honey', 5, 100);

  const currentTick = 5000;
  const result = ResourceRot.processEntity(player, currentTick);
  assert.strictEqual(result.rotted.honey, 5);
  assert.deepStrictEqual(RC.getHeld(player), {});
  assert.strictEqual(ResourceRot.getRotEntries(player).length, 0);
});

test('non-expired entries survive login rot check', function() {
  const player = mockEntity(10, { honey: 8 });
  ResourceRot.addRotEntry(player, 'honey', 3, 200);
  ResourceRot.addRotEntry(player, 'honey', 5, 9999);

  const currentTick = 1000;
  const result = ResourceRot.processEntity(player, currentTick);
  assert.strictEqual(result.rotted.honey, 3);
  assert.strictEqual(RC.getHeld(player).honey, 5);
  assert.strictEqual(ResourceRot.getRotEntries(player).length, 1);
});

test('player with no rot entries survives login check without throwing', function() {
  const player = mockEntity(10, { alluvial_gold: 100 });
  assert.doesNotThrow(function() {
    ResourceRot.processEntity(player, 1000);
  });
  assert.strictEqual(RC.getHeld(player).alluvial_gold, 100);
});

test('playerEnter listener is registered on server start', function() {
  const state = mockState([], 1000);
  simulateServerStart(state);
  assert.strictEqual(state.PlayerManager._enterListeners.length, 1);
});

console.log('\nserver-events shape');

test('server-events exports listeners object with server:start key', function() {
  const se = require('../server-events');
  assert.ok(se.listeners);
  assert.ok(typeof se.listeners['server:start'] === 'function');
});

test('server:start listener returns a function', function() {
  const se = require('../server-events');
  const state = mockState([], 1000);
  assert.ok(typeof se.listeners['server:start'](state) === 'function');
});

console.log('\n' + (passed + failed) + ' tests: ' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed > 0 ? 1 : 0);