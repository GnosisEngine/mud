// bundles/crafting/test/events.test.js
'use strict';

const assert = require('assert');
const { EVENTS, SCHEMA, emit } = require('../events');

let passed = 0;
let failed = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${label}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

function eq(a, b) { assert.deepStrictEqual(a, b); }

function makeEmitter() {
  const calls = [];
  return { emit: (...a) => calls.push(a), calls };
}

// ---------------------------------------------------------------------------

console.log('\n── EVENTS constants ──────────────────────────────');

test('EVENTS.RESOURCE_ROTTED is resource:rotted', () => {
  eq(EVENTS.RESOURCE_ROTTED, 'resource:rotted');
});

test('EVENTS.RESOURCE_ORPHANED_DROPS is resource:orphanedDrops', () => {
  eq(EVENTS.RESOURCE_ORPHANED_DROPS, 'resource:orphanedDrops');
});

test('EVENTS is frozen', () => {
  assert.ok(Object.isFrozen(EVENTS));
});

// ---------------------------------------------------------------------------

console.log('\n── SCHEMA entries ────────────────────────────────');

test('every EVENTS value has a SCHEMA entry', () => {
  for (const eventName of Object.values(EVENTS)) {
    assert.ok(SCHEMA[eventName], `missing schema entry for '${eventName}'`);
  }
});

test('resource:rotted emitter is player', () => {
  eq(SCHEMA[EVENTS.RESOURCE_ROTTED].emitter, 'player');
});

test('resource:rotted payload key is rotted only — player dropped', () => {
  eq(Object.keys(SCHEMA[EVENTS.RESOURCE_ROTTED].payload), ['rotted']);
});

test('resource:rotted relay is true', () => {
  eq(SCHEMA[EVENTS.RESOURCE_ROTTED].relay, true);
});

test('resource:orphanedDrops emitter is room', () => {
  eq(SCHEMA[EVENTS.RESOURCE_ORPHANED_DROPS].emitter, 'room');
});

test('resource:orphanedDrops payload keys are drops and npc', () => {
  eq(Object.keys(SCHEMA[EVENTS.RESOURCE_ORPHANED_DROPS].payload), ['drops', 'npc']);
});

test('resource:orphanedDrops relay is false', () => {
  eq(SCHEMA[EVENTS.RESOURCE_ORPHANED_DROPS].relay, false);
});

// ---------------------------------------------------------------------------

console.log('\n── helper name derivation ────────────────────────');

test('RESOURCE_ROTTED derives to resourceRotted — colon stays in event string not key', () => {
  assert.ok(typeof emit.resourceRotted === 'function');
});

test('RESOURCE_ORPHANED_DROPS derives to resourceOrphanedDrops', () => {
  assert.ok(typeof emit.resourceOrphanedDrops === 'function');
});

// ---------------------------------------------------------------------------

console.log('\n── emit.resourceRotted ───────────────────────────');

test('emits resource:rotted on player with rotted payload', () => {
  const player = makeEmitter();
  const rotted = { wood: 2, grain: 1 };
  emit.resourceRotted(player, rotted);
  eq(player.calls, [['resource:rotted', { rotted }]]);
});

test('player is not included in payload', () => {
  const player = makeEmitter();
  const rotted = { iron: 1 };
  emit.resourceRotted(player, rotted);
  assert.ok(!('player' in player.calls[0][1]));
});

test('rotted object is not cloned', () => {
  const player = makeEmitter();
  const rotted = { stone: 5 };
  emit.resourceRotted(player, rotted);
  assert.ok(player.calls[0][1].rotted === rotted);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.resourceOrphanedDrops ────────────────────');

test('emits resource:orphanedDrops on room with drops and npc payload', () => {
  const room  = makeEmitter();
  const drops = { wood: 3 };
  const npc   = { name: 'lumberjack' };
  emit.resourceOrphanedDrops(room, drops, npc);
  eq(room.calls, [['resource:orphanedDrops', { drops, npc }]]);
});

test('drops object is not cloned', () => {
  const room  = makeEmitter();
  const drops = { grain: 2 };
  const npc   = { name: 'farmer' };
  emit.resourceOrphanedDrops(room, drops, npc);
  assert.ok(room.calls[0][1].drops === drops);
});

test('npc object is not cloned', () => {
  const room  = makeEmitter();
  const drops = { stone: 1 };
  const npc   = { name: 'miner' };
  emit.resourceOrphanedDrops(room, drops, npc);
  assert.ok(room.calls[0][1].npc === npc);
});

// ---------------------------------------------------------------------------

console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
