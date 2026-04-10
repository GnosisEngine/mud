// bundles/claims/tests/events.test.js
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


console.log('\n── EVENTS constants ──────────────────────────────');

test('EVENTS.ENFORCE_RECEIVED is enforce:received', () => {
  eq(EVENTS.ENFORCE_RECEIVED, 'enforce:received');
});

test('EVENTS is frozen', () => {
  assert.ok(Object.isFrozen(EVENTS));
});


console.log('\n── SCHEMA entries ────────────────────────────────');

test('every EVENTS value has a SCHEMA entry', () => {
  for (const eventName of Object.values(EVENTS)) {
    assert.ok(SCHEMA[eventName], `missing schema entry for '${eventName}'`);
  }
});

test('enforce:received emitter is player', () => {
  eq(SCHEMA[EVENTS.ENFORCE_RECEIVED].emitter, 'player');
});

test('enforce:received payload keys are enforcerId, claimId, roomId, duration', () => {
  eq(Object.keys(SCHEMA[EVENTS.ENFORCE_RECEIVED].payload), ['enforcerId', 'claimId', 'roomId', 'duration']);
});

test('enforce:received relay is true', () => {
  eq(SCHEMA[EVENTS.ENFORCE_RECEIVED].relay, true);
});


console.log('\n── emit.enforceReceived ──────────────────────────');

test('derives helper name enforceReceived from ENFORCE_RECEIVED', () => {
  assert.ok(typeof emit.enforceReceived === 'function');
});

test('emits enforce:received on target with full payload', () => {
  const target = makeEmitter();
  emit.enforceReceived(target, 'Aldric', 'c_abc123', 'zone:room:1', 30);
  eq(target.calls, [[
    'enforce:received',
    { enforcerId: 'Aldric', claimId: 'c_abc123', roomId: 'zone:room:1', duration: 30 }
  ]]);
});

test('payload fields match positional arg order', () => {
  const target = makeEmitter();
  const enforcerId = 'Berta';
  const claimId    = 'c_xyz999';
  const roomId     = 'keep:throne:1';
  const duration   = 15;
  emit.enforceReceived(target, enforcerId, claimId, roomId, duration);
  const payload = target.calls[0][1];
  eq(payload.enforcerId, enforcerId);
  eq(payload.claimId,    claimId);
  eq(payload.roomId,     roomId);
  eq(payload.duration,   duration);
});

test('fires on target emitter, not emitter of command caller', () => {
  const caller = makeEmitter();
  const target = makeEmitter();
  emit.enforceReceived(target, 'A', 'c_1', 'r:1', 60);
  eq(caller.calls.length, 0);
  eq(target.calls.length, 1);
});


console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
