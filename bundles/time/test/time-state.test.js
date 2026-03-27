// bundles/time-bundle/test/time-state.test.js

const assert = require('assert');
const state  = require('../lib/time-state');
const { TICKS_PER_DAY, getDayPhase, getMoonPhase, MOON_CYCLE_DAYS } = require('../lib/time-math');

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

function eq(a, b)   { assert.deepStrictEqual(a, b); }
function ok(v)      { assert.ok(v); }

function setup() { state.reset(); }

console.log('\nset / get');

test('get returns 0 after reset', () => {
  setup();
  eq(state.get(), 0);
});

test('set stores the tick', () => {
  setup();
  state.set(5000);
  eq(state.get(), 5000);
});

test('set to 0 is valid', () => {
  setup();
  state.set(0);
  eq(state.get(), 0);
});

console.log('\nadvance accumulation');

test('sub-threshold delta does not advance tick', () => {
  setup();
  state.advance(999);
  eq(state.get(), 0);
});

test('exactly 1000ms advances by one tick', () => {
  setup();
  state.advance(1000);
  eq(state.get(), 1);
});

test('1500ms advances by one tick and retains 500ms', () => {
  setup();
  state.advance(1500);
  eq(state.get(), 1);
  state.advance(500);
  eq(state.get(), 2);
});

test('two 600ms calls accumulate to one tick', () => {
  setup();
  state.advance(600);
  eq(state.get(), 0);
  state.advance(600);
  eq(state.get(), 1);
});

test('3000ms advances by three ticks', () => {
  setup();
  state.advance(3000);
  eq(state.get(), 3);
});

test('accumulated remainder carries across multiple calls', () => {
  setup();
  for (let i = 0; i < 10; i++) state.advance(300);
  eq(state.get(), 3);
});

test('large delta spanning multiple ticks is handled in one call', () => {
  setup();
  state.advance(5500);
  eq(state.get(), 5);
});

console.log('\ndayRollover event');

test('dayRollover fires when crossing a day boundary', () => {
  setup();
  state.set(TICKS_PER_DAY - 2);
  let count = 0;
  state.on('dayRollover', () => count++);
  state.advance(2000);
  eq(count, 1);
});

test('dayRollover does not fire mid-day', () => {
  setup();
  let count = 0;
  state.on('dayRollover', () => count++);
  state.advance(100 * 1000);
  eq(count, 0);
});

test('dayRollover fires the correct tick value', () => {
  setup();
  state.set(TICKS_PER_DAY - 1);
  let firedAt = null;
  state.on('dayRollover', tick => { firedAt = tick; });
  state.advance(1000);
  eq(firedAt, TICKS_PER_DAY);
});

test('dayRollover fires twice when advancing through two day boundaries', () => {
  setup();
  state.set(TICKS_PER_DAY - 1);
  let count = 0;
  state.on('dayRollover', () => count++);
  state.advance((TICKS_PER_DAY + 1) * 1000);
  eq(count, 2);
});

test('dayRollover does not fire after off() removes listener', () => {
  setup();
  let count = 0;
  const fn = () => count++;
  state.on('dayRollover', fn);
  state.set(TICKS_PER_DAY - 1);
  state.off('dayRollover', fn);
  state.advance(1000);
  eq(count, 0);
});

console.log('\ndayPhaseChange event');

test('dayPhaseChange fires when hour crosses a phase boundary', () => {
  setup();
  const dawnTick = 5 * 60;
  state.set(dawnTick - 2);
  let count = 0;
  state.on('dayPhaseChange', () => count++);
  state.advance(2000);
  eq(count, 1);
});

test('dayPhaseChange does not fire when staying in same phase', () => {
  setup();
  state.set(7 * 60);
  let count = 0;
  state.on('dayPhaseChange', () => count++);
  state.advance(60 * 1000);
  eq(count, 0);
});

test('dayPhaseChange fires once per phase, not per tick within the phase', () => {
  setup();
  const dawnTick = 5 * 60;
  state.set(dawnTick - 1);
  let count = 0;
  state.on('dayPhaseChange', () => count++);
  state.advance(60 * 1000);
  eq(count, 1);
});

test('dayPhaseChange emits correct phase object', () => {
  setup();
  const dawnTick = 5 * 60;
  state.set(dawnTick - 1);
  let received = null;
  state.on('dayPhaseChange', p => { received = p; });
  state.advance(1000);
  eq(received.name, 'Dawn');
  eq(received.emoji, '🌄');
});

test('set() initialises phase so no spurious dayPhaseChange on first advance', () => {
  setup();
  state.set(7 * 60);
  let count = 0;
  state.on('dayPhaseChange', () => count++);
  state.advance(1000);
  eq(count, 0);
});

console.log('\nmoonPhaseChange event');

test('moonPhaseChange fires when moon phase boundary is crossed', () => {
  setup();
  const firstQuarterTick = 7 * TICKS_PER_DAY;
  state.set(firstQuarterTick - 1);
  let count = 0;
  state.on('moonPhaseChange', () => count++);
  state.advance(1000);
  eq(count, 1);
});

test('moonPhaseChange does not fire mid-phase', () => {
  setup();
  state.set(8 * TICKS_PER_DAY);
  let count = 0;
  state.on('moonPhaseChange', () => count++);
  state.advance(TICKS_PER_DAY * 1000);
  eq(count, 0);
});

test('moonPhaseChange emits correct phase name', () => {
  setup();
  const firstQuarterTick = 7 * TICKS_PER_DAY;
  state.set(firstQuarterTick - 1);
  let received = null;
  state.on('moonPhaseChange', p => { received = p; });
  state.advance(1000);
  eq(received.name, 'First Quarter');
});

test('set() initialises moon phase so no spurious moonPhaseChange on first advance', () => {
  setup();
  state.set(10 * TICKS_PER_DAY);
  let count = 0;
  state.on('moonPhaseChange', () => count++);
  state.advance(1000);
  eq(count, 0);
});

test('moonPhaseChange fires 8 times across a full moon cycle', () => {
  setup();
  state.set(0);
  let count = 0;
  state.on('moonPhaseChange', () => count++);
  state.advance(MOON_CYCLE_DAYS * TICKS_PER_DAY * 1000);
  eq(count, 8);
});

console.log('\nmultiple listeners');

test('two listeners on same event both fire', () => {
  setup();
  state.set(TICKS_PER_DAY - 1);
  let a = 0, b = 0;
  state.on('dayRollover', () => a++);
  state.on('dayRollover', () => b++);
  state.advance(1000);
  eq(a, 1);
  eq(b, 1);
});

test('off() only removes the specified listener', () => {
  setup();
  state.set(TICKS_PER_DAY - 1);
  let a = 0, b = 0;
  const fnA = () => a++;
  state.on('dayRollover', fnA);
  state.on('dayRollover', () => b++);
  state.off('dayRollover', fnA);
  state.advance(1000);
  eq(a, 0);
  eq(b, 1);
});

console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);