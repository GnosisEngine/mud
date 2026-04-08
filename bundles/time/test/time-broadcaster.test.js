// bundles/time-bundle/test/time-broadcaster.test.js

const assert = require('assert');
const timeState = require('../lib/time-state');
const broadcaster = require('../lib/time-broadcaster');
const { TICKS_PER_DAY, MOON_CYCLE_DAYS, DAY_PHASES, MOON_PHASES } = require('../lib/time-math');

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
function ok(v) { assert.ok(v); }

function makePlayerManager(players) {
  return { forEach: fn => players.forEach(fn) };
}

function makePlayer() {
  const received = [];
  return {
    received,
    emit: (event, msg) => { if (event === 'broadcast') received.push(msg); },
  };
}

function setup() {
  timeState.reset();
  timeState.set(0);
}

console.log('\nformatDayPhase');

test('includes the phase emoji', () => {
  DAY_PHASES.forEach(phase => {
    const msg = broadcaster.formatDayPhase(phase);
    ok(msg.startsWith(phase.emoji));
  });
});

test('includes a non-empty message for every day phase', () => {
  DAY_PHASES.forEach(phase => {
    const msg = broadcaster.formatDayPhase(phase);
    ok(msg.length > phase.emoji.length + 1);
  });
});

console.log('\nformatMoonPhase');

test('includes the phase emoji', () => {
  MOON_PHASES.forEach(phase => {
    const msg = broadcaster.formatMoonPhase(phase);
    ok(msg.startsWith(phase.emoji));
  });
});

test('includes a non-empty message for every moon phase', () => {
  MOON_PHASES.forEach(phase => {
    const msg = broadcaster.formatMoonPhase(phase);
    ok(msg.length > phase.emoji.length + 1);
  });
});

console.log('\nregister — day phase broadcasts');

test('broadcasts to all players on dayPhaseChange', () => {
  setup();
  const p1 = makePlayer();
  const p2 = makePlayer();
  const pm = makePlayerManager([p1, p2]);
  broadcaster.register(pm);

  const dawnTick = 5 * 60;
  timeState.set(dawnTick - 1);
  timeState.advance(1000);

  eq(p1.received.length, 1);
  eq(p2.received.length, 1);
});

test('day phase broadcast message starts with the phase emoji', () => {
  setup();
  const p = makePlayer();
  broadcaster.register(makePlayerManager([p]));

  const dawnTick = 5 * 60;
  timeState.set(dawnTick - 1);
  timeState.advance(1000);

  ok(p.received[0].startsWith('🌄'));
});

test('no broadcast when phase does not change', () => {
  setup();
  const p = makePlayer();
  broadcaster.register(makePlayerManager([p]));

  timeState.set(7 * 60);
  timeState.advance(30 * 1000);

  eq(p.received.length, 0);
});

test('broadcasts correct message for each day phase transition', () => {
  const dayPhaseEntryHours = [5, 6, 7, 12, 13, 18, 19, 21];
  const expectedEmojis = ['🌄', '🌅', '🌤️', '☀️', '🌞', '🌇', '🌆', '🌉'];

  dayPhaseEntryHours.forEach((hour, i) => {
    setup();
    const p = makePlayer();
    broadcaster.register(makePlayerManager([p]));

    timeState.set(hour * 60 - 1);
    timeState.advance(1000);

    ok(p.received.length === 1, `expected 1 message at hour ${hour}, got ${p.received.length}`);
    ok(p.received[0].startsWith(expectedEmojis[i]), `expected ${expectedEmojis[i]} at hour ${hour}, got: ${p.received[0]}`);
  });
});

test('player with no broadcast events receives nothing when no phase change', () => {
  setup();
  const p = makePlayer();
  broadcaster.register(makePlayerManager([p]));

  timeState.set(8 * 60);
  timeState.advance(1000);

  eq(p.received.length, 0);
});

const MOON_EMOJIS = new Set(['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']);

function isMoonMsg(msg) {
  return MOON_EMOJIS.has([...msg][0]);
}

console.log('\nregister — moon phase broadcasts');

test('broadcasts to all players on moonPhaseChange', () => {
  setup();
  const p1 = makePlayer();
  const p2 = makePlayer();
  const pm = makePlayerManager([p1, p2]);
  broadcaster.register(pm);

  const firstQuarterTick = 7 * TICKS_PER_DAY;
  timeState.set(firstQuarterTick - 1);
  timeState.advance(1000);

  eq(p1.received.filter(isMoonMsg).length, 1);
  eq(p2.received.filter(isMoonMsg).length, 1);
});

test('moon phase broadcast message starts with the phase emoji', () => {
  setup();
  const p = makePlayer();
  broadcaster.register(makePlayerManager([p]));

  const firstQuarterTick = 7 * TICKS_PER_DAY;
  timeState.set(firstQuarterTick - 1);
  timeState.advance(1000);

  const moonMsgs = p.received.filter(isMoonMsg);
  eq(moonMsgs.length, 1);
  ok(moonMsgs[0].startsWith('🌓'));
});

test('no moon broadcast when phase does not change', () => {
  setup();
  const p = makePlayer();
  broadcaster.register(makePlayerManager([p]));

  timeState.set(8 * TICKS_PER_DAY);
  timeState.advance(TICKS_PER_DAY * 1000);

  eq(p.received.filter(isMoonMsg).length, 0);
});

test('8 moon broadcasts across a full cycle', () => {
  setup();
  const p = makePlayer();
  broadcaster.register(makePlayerManager([p]));

  timeState.advance(MOON_CYCLE_DAYS * TICKS_PER_DAY * 1000);

  eq(p.received.filter(isMoonMsg).length, 8);
});

console.log('\nregister — empty player list');

test('does not throw when player list is empty', () => {
  setup();
  broadcaster.register(makePlayerManager([]));
  timeState.set(5 * 60 - 1);
  timeState.advance(1000);
  ok(true);
});

console.log('\n');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);