// bundles/lib/test/event-helpers.test.js
'use strict';

const assert = require('assert');
const { toHelperName, buildEmitHelpers } = require('../lib/EventHelpers');

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


console.log('\n── toHelperName ──────────────────────────────────');

test('single word lowercases', () => {
  eq(toHelperName('MOVE'), 'move');
});

test('two words camelCases', () => {
  eq(toHelperName('RESOURCE_ROTTED'), 'resourceRotted');
});

test('three words camelCases', () => {
  eq(toHelperName('PLAYER_DROP_ITEM'), 'playerDropItem');
});

test('four words camelCases', () => {
  eq(toHelperName('DAY_PHASE_CHANGE'), 'dayPhaseChange');
});


console.log('\n── buildEmitHelpers — helper names ───────────────');

const EVENTS = Object.freeze({
  LEVEL:            'level',
  EXPERIENCE:       'experience',
  RESOURCE_ROTTED:  'resource:rotted',
  PLAYER_DROP_ITEM: 'playerDropItem',
});

const SCHEMA = {
  'level': {
    emitter: 'player',
    payload: {},
    relay: false,
  },
  'experience': {
    emitter: 'player',
    payload: { amount: 'number' },
    relay: true,
  },
  'resource:rotted': {
    emitter: 'player',
    payload: { rotted: 'object' },
    relay: true,
  },
  'playerDropItem': {
    emitter: 'npc',
    payload: { player: 'object', item: 'object' },
    relay: false,
  },
};

const emit = buildEmitHelpers(EVENTS, SCHEMA);

test('generates helper for single-word event', () => {
  eq(typeof emit.level, 'function');
});

test('generates helper for camelCased event name', () => {
  eq(typeof emit.experience, 'function');
});

test('generates resourceRotted from RESOURCE_ROTTED', () => {
  eq(typeof emit.resourceRotted, 'function');
});

test('generates playerDropItem from PLAYER_DROP_ITEM', () => {
  eq(typeof emit.playerDropItem, 'function');
});


console.log('\n── buildEmitHelpers — zero-payload events ────────');

test('zero-payload helper calls emit with event name only', () => {
  const calls = [];
  const emitter = { emit: (...a) => calls.push(a) };
  emit.level(emitter);
  eq(calls, [['level']]);
});

test('zero-payload helper ignores extra args', () => {
  const calls = [];
  const emitter = { emit: (...a) => calls.push(a) };
  emit.level(emitter, 'unexpected');
  eq(calls, [['level']]);
});


console.log('\n── buildEmitHelpers — single-key payload events ──');

test('single-key helper assembles payload object', () => {
  const calls = [];
  const emitter = { emit: (...a) => calls.push(a) };
  emit.experience(emitter, 42);
  eq(calls, [['experience', { amount: 42 }]]);
});

test('single-key helper passes non-primitive values', () => {
  const calls = [];
  const emitter = { emit: (...a) => calls.push(a) };
  const rotted = { wood: 3 };
  emit.resourceRotted(emitter, rotted);
  eq(calls, [['resource:rotted', { rotted }]]);
});


console.log('\n── buildEmitHelpers — multi-key payload events ───');

test('multi-key helper maps args to keys in insertion order', () => {
  const calls = [];
  const emitter = { emit: (...a) => calls.push(a) };
  const player = { name: 'Aldric' };
  const item   = { id: 'sword' };
  emit.playerDropItem(emitter, player, item);
  eq(calls, [['playerDropItem', { player, item }]]);
});

test('extra args beyond payload keys are ignored', () => {
  const calls = [];
  const emitter = { emit: (...a) => calls.push(a) };
  const player = { name: 'Aldric' };
  const item   = { id: 'sword' };
  emit.playerDropItem(emitter, player, item, 'extra');
  eq(calls, [['playerDropItem', { player, item }]]);
});

test('missing args map to undefined', () => {
  const calls = [];
  const emitter = { emit: (...a) => calls.push(a) };
  emit.playerDropItem(emitter, { name: 'Aldric' });
  eq(calls, [['playerDropItem', { player: { name: 'Aldric' }, item: undefined }]]);
});


console.log('\n── buildEmitHelpers — schema gaps ────────────────');

test('event with no schema entry is not present in helpers', () => {
  const PARTIAL_EVENTS = Object.freeze({ ORPHAN: 'orphan:event' });
  const helpers = buildEmitHelpers(PARTIAL_EVENTS, SCHEMA);
  eq(helpers.orphan, undefined);
});

test('only events with schema entries are present', () => {
  const keys = Object.keys(emit).sort();
  eq(keys, ['experience', 'level', 'playerDropItem', 'resourceRotted']);
});


console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
