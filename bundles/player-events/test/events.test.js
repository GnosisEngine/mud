// bundles/player-events/test/events.test.js
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

test('EVENTS.EXPERIENCE is experience', () => {
  eq(EVENTS.EXPERIENCE, 'experience');
});

test('EVENTS.MOVE is move', () => {
  eq(EVENTS.MOVE, 'move');
});

test('EVENTS.LEVEL is level', () => {
  eq(EVENTS.LEVEL, 'level');
});

test('EVENTS is frozen', () => {
  assert.ok(Object.isFrozen(EVENTS));
});

// ---------------------------------------------------------------------------

console.log('\n── SCHEMA entries ────────────────────────────────');

test('experience schema has amount payload key', () => {
  eq(Object.keys(SCHEMA[EVENTS.EXPERIENCE].payload), ['amount']);
});

test('experience schema relay is true', () => {
  eq(SCHEMA[EVENTS.EXPERIENCE].relay, true);
});

test('move schema has roomExit payload key', () => {
  eq(Object.keys(SCHEMA[EVENTS.MOVE].payload), ['roomExit']);
});

test('move schema relay is false', () => {
  eq(SCHEMA[EVENTS.MOVE].relay, false);
});

test('level schema has no payload keys', () => {
  eq(Object.keys(SCHEMA[EVENTS.LEVEL].payload), []);
});

test('level schema relay is true', () => {
  eq(SCHEMA[EVENTS.LEVEL].relay, true);
});

test('every EVENTS value has a SCHEMA entry', () => {
  for (const eventName of Object.values(EVENTS)) {
    assert.ok(SCHEMA[eventName], `missing schema entry for '${eventName}'`);
  }
});

// ---------------------------------------------------------------------------

console.log('\n── emit.experience ───────────────────────────────');

test('emits experience event with amount payload', () => {
  const e = makeEmitter();
  emit.experience(e, 250);
  eq(e.calls, [['experience', { amount: 250 }]]);
});

test('amount is passed through as-is', () => {
  const e = makeEmitter();
  emit.experience(e, 0);
  eq(e.calls, [['experience', { amount: 0 }]]);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.move ─────────────────────────────────────');

test('emits move event with roomExit payload', () => {
  const e = makeEmitter();
  const roomExit = { direction: 'north', roomId: 'limbo:1' };
  emit.move(e, roomExit);
  eq(e.calls, [['move', { roomExit }]]);
});

test('roomExit object is not cloned', () => {
  const e = makeEmitter();
  const roomExit = { direction: 'south', roomId: 'limbo:2' };
  emit.move(e, roomExit);
  assert.ok(e.calls[0][1].roomExit === roomExit);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.level ────────────────────────────────────');

test('emits level event with no payload', () => {
  const e = makeEmitter();
  emit.level(e);
  eq(e.calls, [['level']]);
});

test('emits on the correct emitter object', () => {
  const a = makeEmitter();
  const b = makeEmitter();
  emit.level(a);
  emit.level(b);
  eq(a.calls.length, 1);
  eq(b.calls.length, 1);
});

// ---------------------------------------------------------------------------

console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
