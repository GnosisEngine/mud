// bundles/time/test/events.test.js
'use strict';

const assert = require('assert');
const { EVENTS, SCHEMA } = require('../events');

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

// ---------------------------------------------------------------------------

console.log('\n── EVENTS constants ──────────────────────────────');

test('EVENTS.DAY_ROLLOVER is dayRollover',         () => eq(EVENTS.DAY_ROLLOVER,     'dayRollover'));
test('EVENTS.DAY_PHASE_CHANGE is dayPhaseChange',  () => eq(EVENTS.DAY_PHASE_CHANGE, 'dayPhaseChange'));
test('EVENTS.MOON_PHASE_CHANGE is moonPhaseChange',() => eq(EVENTS.MOON_PHASE_CHANGE,'moonPhaseChange'));
test('EVENTS is frozen',                           () => assert.ok(Object.isFrozen(EVENTS)));

// ---------------------------------------------------------------------------

console.log('\n── SCHEMA entries ────────────────────────────────');

test('every EVENTS value has a SCHEMA entry', () => {
  for (const eventName of Object.values(EVENTS)) {
    assert.ok(SCHEMA[eventName], `missing schema entry for '${eventName}'`);
  }
});

test('all emitters are time-state', () => {
  for (const entry of Object.values(SCHEMA)) {
    eq(entry.emitter, 'time-state');
  }
});

test('dayRollover payload key is tick',        () => eq(Object.keys(SCHEMA[EVENTS.DAY_ROLLOVER].payload),     ['tick']));
test('dayPhaseChange payload key is phase',    () => eq(Object.keys(SCHEMA[EVENTS.DAY_PHASE_CHANGE].payload), ['phase']));
test('moonPhaseChange payload key is phase',   () => eq(Object.keys(SCHEMA[EVENTS.MOON_PHASE_CHANGE].payload),['phase']));
test('dayRollover relay is false',             () => eq(SCHEMA[EVENTS.DAY_ROLLOVER].relay,     false));
test('dayPhaseChange relay is true',           () => eq(SCHEMA[EVENTS.DAY_PHASE_CHANGE].relay, true));
test('moonPhaseChange relay is true',          () => eq(SCHEMA[EVENTS.MOON_PHASE_CHANGE].relay, true));

// ---------------------------------------------------------------------------

console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
