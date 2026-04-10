// bundles/combat/test/events.test.js
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

test('EVENTS.DEATHBLOW is deathblow', () => eq(EVENTS.DEATHBLOW, 'deathblow'));
test('EVENTS.KILLED is killed',       () => eq(EVENTS.KILLED,    'killed'));
test('EVENTS.HIT is hit',             () => eq(EVENTS.HIT,       'hit'));
test('EVENTS.DAMAGED is damaged',     () => eq(EVENTS.DAMAGED,   'damaged'));
test('EVENTS.HEALED is healed',       () => eq(EVENTS.HEALED,    'healed'));
test('EVENTS.HEAL is heal',           () => eq(EVENTS.HEAL,      'heal'));
test('EVENTS is frozen',              () => assert.ok(Object.isFrozen(EVENTS)));

// ---------------------------------------------------------------------------

console.log('\n── SCHEMA entries ────────────────────────────────');

test('every EVENTS value has a SCHEMA entry', () => {
  for (const eventName of Object.values(EVENTS)) {
    assert.ok(SCHEMA[eventName], `missing schema entry for '${eventName}'`);
  }
});

test('deathblow payload keys are target, skipParty', () => {
  eq(Object.keys(SCHEMA[EVENTS.DEATHBLOW].payload), ['target', 'skipParty']);
});

test('deathblow relay is true', () => {
  eq(SCHEMA[EVENTS.DEATHBLOW].relay, true);
});

test('killed payload key is killer', () => {
  eq(Object.keys(SCHEMA[EVENTS.KILLED].payload), ['killer']);
});

test('hit payload keys are damage, target, finalAmount', () => {
  eq(Object.keys(SCHEMA[EVENTS.HIT].payload), ['damage', 'target', 'finalAmount']);
});

test('damaged payload keys are damage, finalAmount', () => {
  eq(Object.keys(SCHEMA[EVENTS.DAMAGED].payload), ['damage', 'finalAmount']);
});

test('healed payload keys are heal, finalAmount', () => {
  eq(Object.keys(SCHEMA[EVENTS.HEALED].payload), ['heal', 'finalAmount']);
});

test('heal relay is false', () => {
  eq(SCHEMA[EVENTS.HEAL].relay, false);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.deathblow ────────────────────────────────');

test('emits deathblow with target and skipParty', () => {
  const e = makeEmitter();
  const target = { name: 'goblin' };
  emit.deathblow(e, target, true);
  eq(e.calls, [['deathblow', { target, skipParty: true }]]);
});

test('skipParty defaults to undefined when omitted', () => {
  const e = makeEmitter();
  const target = { name: 'goblin' };
  emit.deathblow(e, target);
  eq(e.calls, [['deathblow', { target, skipParty: undefined }]]);
});

test('undefined skipParty is falsy — party check behaves correctly', () => {
  const e = makeEmitter();
  emit.deathblow(e, { name: 'rat' });
  const { skipParty } = e.calls[0][1];
  assert.ok(!skipParty);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.killed ───────────────────────────────────');

test('emits killed with killer payload', () => {
  const e = makeEmitter();
  const killer = { name: 'Aldric' };
  emit.killed(e, killer);
  eq(e.calls, [['killed', { killer }]]);
});

test('killer can be undefined (environmental death)', () => {
  const e = makeEmitter();
  emit.killed(e, undefined);
  eq(e.calls, [['killed', { killer: undefined }]]);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.hit ──────────────────────────────────────');

test('emits hit with damage, target, finalAmount', () => {
  const e = makeEmitter();
  const damage = { amount: 10, metadata: {} };
  const target = { name: 'orc' };
  emit.hit(e, damage, target, 8);
  eq(e.calls, [['hit', { damage, target, finalAmount: 8 }]]);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.damaged ──────────────────────────────────');

test('emits damaged with damage and finalAmount', () => {
  const e = makeEmitter();
  const damage = { amount: 5, metadata: {} };
  emit.damaged(e, damage, 4);
  eq(e.calls, [['damaged', { damage, finalAmount: 4 }]]);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.healed ───────────────────────────────────');

test('emits healed with heal and finalAmount', () => {
  const e = makeEmitter();
  const heal = { amount: 20, attribute: 'health' };
  emit.healed(e, heal, 18);
  eq(e.calls, [['healed', { heal, finalAmount: 18 }]]);
});

// ---------------------------------------------------------------------------

console.log('\n── emit.heal ─────────────────────────────────────');

test('emits heal with heal, target, finalAmount', () => {
  const e = makeEmitter();
  const heal   = { amount: 15 };
  const target = { name: 'Berta' };
  emit.heal(e, heal, target, 12);
  eq(e.calls, [['heal', { heal, target, finalAmount: 12 }]]);
});

// ---------------------------------------------------------------------------

console.log('\n── emitter identity ──────────────────────────────');

test('each helper fires on its own emitter, not others', () => {
  const a = makeEmitter();
  const b = makeEmitter();
  emit.deathblow(a, { name: 'wolf' });
  emit.killed(b, { name: 'Aldric' });
  eq(a.calls.length, 1);
  eq(b.calls.length, 1);
  eq(a.calls[0][0], 'deathblow');
  eq(b.calls[0][0], 'killed');
});

// ---------------------------------------------------------------------------

console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
