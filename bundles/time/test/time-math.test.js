// bundles/time-bundle/test/time-math.test.js

const assert = require('assert');
const {
  TICKS_PER_DAY,
  TICKS_PER_HOUR,
  DAYS_PER_YEAR,
  HOLIDAY_DAY_OF_YEAR,
  HOLIDAY_NAME,
  MOON_PHASES,
  PHASE_HOUR_TO_MOON_SKY_INDEX,
  DAY_TO_MOON_PHASE_INDEX,
  tickToComponents,
  getMonth,
  getDayOfWeek,
  getDayOfMonth,
  getHour,
  getMinute,
  getMoonPhase,
  getDayPhase,
  getMoonSkyPosition,
  getTimePosition,
  getFormalTime,
} = require('../lib/time-math');

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
function ok(v, msg) { assert.ok(v, msg); }

const DAY = TICKS_PER_DAY;
const HOLIDAY_TICK = HOLIDAY_DAY_OF_YEAR * DAY;
const YEAR2_TICK   = DAYS_PER_YEAR * DAY;

console.log('\n── tickToComponents ──────────────────────────────');

test('tick 0: first minute of year 1', () => {
  const c = tickToComponents(0);
  eq(c.year,       1);
  eq(c.dayOfYear,  0);
  eq(c.month,      1);
  eq(c.dayOfMonth, 1);
  eq(c.dayOfWeek,  0);
  eq(c.hour,       0);
  eq(c.minute,     0);
  eq(c.isHoliday,  false);
  eq(c.moonDay,    0);
});

test('tick 30: minute 30 of hour 0', () => {
  const c = tickToComponents(30);
  eq(c.minute, 30);
  eq(c.hour,   0);
});

test('tick 60: top of hour 1', () => {
  const c = tickToComponents(60);
  eq(c.hour,   1);
  eq(c.minute, 0);
});

test('tick 1439: last minute of day 0', () => {
  const c = tickToComponents(1439);
  eq(c.hour,       23);
  eq(c.minute,     59);
  eq(c.dayOfYear,  0);
  eq(c.dayOfMonth, 1);
});

test('tick DAY: first tick of day 1 (2nd day)', () => {
  const c = tickToComponents(DAY);
  eq(c.dayOfYear,  1);
  eq(c.dayOfMonth, 2);
  eq(c.hour,       0);
  eq(c.minute,     0);
});

test('day 27: last day of month 1', () => {
  const c = tickToComponents(27 * DAY);
  eq(c.month,      1);
  eq(c.dayOfMonth, 28);
  eq(c.isHoliday,  false);
});

test('day 28: first day of month 2 (Ashveil)', () => {
  const c = tickToComponents(28 * DAY);
  eq(c.month,      2);
  eq(c.dayOfMonth, 1);
  eq(c.isHoliday,  false);
});

test('day 364: The Unmarked Day', () => {
  const c = tickToComponents(HOLIDAY_TICK);
  eq(c.isHoliday,  true);
  eq(c.month,      null);
  eq(c.dayOfMonth, null);
  eq(c.year,       1);
});

test('day 365: first day of year 2', () => {
  const c = tickToComponents(YEAR2_TICK);
  eq(c.year,       2);
  eq(c.dayOfYear,  0);
  eq(c.month,      1);
  eq(c.dayOfMonth, 1);
});

test('day of week cycles every 7 days', () => {
  for (let d = 0; d < 21; d++) {
    const c = tickToComponents(d * DAY);
    eq(c.dayOfWeek, d % 7);
  }
});

console.log('\n── getMonth ──────────────────────────────────────');

test('month 1 is Frostholm', () => {
  eq(getMonth(0), { name: 'Frostholm', index: 1 });
});

test('month 13 is Bleakstone (day 336)', () => {
  eq(getMonth(336 * DAY), { name: 'Bleakstone', index: 13 });
});

test('holiday returns HOLIDAY_NAME with null index', () => {
  eq(getMonth(HOLIDAY_TICK), { name: HOLIDAY_NAME, index: null });
});

console.log('\n── getDayOfWeek ──────────────────────────────────');

test('tick 0 is Solday (index 0)', () => {
  eq(getDayOfWeek(0), { name: 'Solday', index: 0 });
});

test('day 6 is Veilday (index 6)', () => {
  eq(getDayOfWeek(6 * DAY), { name: 'Veilday', index: 6 });
});

test('day 7 wraps back to Solday', () => {
  eq(getDayOfWeek(7 * DAY), { name: 'Solday', index: 0 });
});

console.log('\n── getDayOfMonth ─────────────────────────────────');

test('tick 0: day 1 of month', () => eq(getDayOfMonth(0), 1));
test('day 27: day 28 of month', () => eq(getDayOfMonth(27 * DAY), 28));
test('day 28: day 1 of next month', () => eq(getDayOfMonth(28 * DAY), 1));
test('holiday: null', () => eq(getDayOfMonth(HOLIDAY_TICK), null));

console.log('\n── getHour / getMinute ───────────────────────────');

test('tick 0: hour 0', () => eq(getHour(0), 0));
test('tick 60: hour 1', () => eq(getHour(60), 1));
test('tick 1380: hour 23 (23*60)', () => eq(getHour(23 * 60), 23));
test('next day tick: hour resets to 0', () => eq(getHour(DAY), 0));
test('tick 0: minute 0', () => eq(getMinute(0), 0));
test('tick 45: minute 45', () => eq(getMinute(45), 45));
test('tick 59: minute 59', () => eq(getMinute(59), 59));
test('tick 60: minute resets to 0', () => eq(getMinute(60), 0));

console.log('\n── getMoonPhase ──────────────────────────────────');

const moonTable = [
  [0,  'New Moon',        '🌑'],
  [1,  'New Moon',        '🌑'],
  [3,  'New Moon',        '🌑'],
  [4,  'Waxing Crescent', '🌒'],
  [6,  'Waxing Crescent', '🌒'],
  [7,  'First Quarter',   '🌓'],
  [10, 'First Quarter',   '🌓'],
  [11, 'Waxing Gibbous',  '🌔'],
  [13, 'Waxing Gibbous',  '🌔'],
  [14, 'Full Moon',       '🌕'],
  [17, 'Full Moon',       '🌕'],
  [18, 'Waning Gibbous',  '🌖'],
  [20, 'Waning Gibbous',  '🌖'],
  [21, 'Last Quarter',    '🌗'],
  [24, 'Last Quarter',    '🌗'],
  [25, 'Waning Crescent', '🌘'],
  [27, 'Waning Crescent', '🌘'],
];

moonTable.forEach(([day, name, emoji]) => {
  test(`moon day ${day}: ${name}`, () => {
    const phase = getMoonPhase(day * DAY);
    eq(phase.name,  name);
    eq(phase.emoji, emoji);
  });
});

test('moon cycle resets at day 28', () => {
  eq(getMoonPhase(28 * DAY).name, getMoonPhase(0).name);
});

console.log('\n── getDayPhase ───────────────────────────────────');

const phaseTable = [
  [0,  'Midnight',  '🌃'],
  [4,  'Midnight',  '🌃'],
  [5,  'Dawn',      '🌄'],
  [6,  'Sunrise',   '🌅'],
  [7,  'Morning',   '🌤️'],
  [11, 'Morning',   '🌤️'],
  [12, 'Noon',      '☀️'],
  [13, 'Afternoon', '🌞'],
  [17, 'Afternoon', '🌞'],
  [18, 'Sunset',    '🌇'],
  [19, 'Dusk',      '🌆'],
  [20, 'Dusk',      '🌆'],
  [21, 'Night',     '🌉'],
  [23, 'Night',     '🌉'],
];

phaseTable.forEach(([hour, name, emoji]) => {
  test(`hour ${hour}: ${name}`, () => {
    const phase = getDayPhase(hour * 60);
    eq(phase.name,  name);
    eq(phase.emoji, emoji);
  });
});

console.log('\n── getFormalTime ─────────────────────────────────');

test('tick 0: full formal string', () => {
  eq(getFormalTime(0), 'Solday, the 1st of Frostholm, Year 1, 00:00');
});

test('ordinal: 2nd, 3rd, 4th, 11th, 12th, 21st, 22nd', () => {
  eq(getFormalTime(1 * DAY),   'Moonday, the 2nd of Frostholm, Year 1, 00:00');
  eq(getFormalTime(2 * DAY),   'Ironday, the 3rd of Frostholm, Year 1, 00:00');
  eq(getFormalTime(3 * DAY),   'Ashday, the 4th of Frostholm, Year 1, 00:00');
  eq(getFormalTime(10 * DAY),  'Ashday, the 11th of Frostholm, Year 1, 00:00');
  eq(getFormalTime(11 * DAY),  'Thornday, the 12th of Frostholm, Year 1, 00:00');
  eq(getFormalTime(20 * DAY),  'Veilday, the 21st of Frostholm, Year 1, 00:00');
  eq(getFormalTime(21 * DAY),  'Solday, the 22nd of Frostholm, Year 1, 00:00');
});

test('time padding: hour 09 minute 05', () => {
  const tick = 9 * 60 + 5;
  assert.ok(getFormalTime(tick).endsWith('09:05'));
});

test('holiday formal string', () => {
  eq(getFormalTime(HOLIDAY_TICK), `Solday, ${HOLIDAY_NAME}, Year 1, 00:00`);
});

test('year 2 formal string', () => {
  eq(getFormalTime(YEAR2_TICK), 'Moonday, the 1st of Frostholm, Year 2, 00:00');
});

console.log('\n── getMoonSkyPosition ────────────────────────────');

const moonDayForPhase = [0, 4, 7, 11, 14, 18, 21, 25];

test('New Moon: below horizon at midnight (hour 0)', () => {
  const tick = moonDayForPhase[0] * DAY;
  eq(getMoonSkyPosition(tick).name, 'Below Horizon');
});

test('New Moon: moonrise at hour 6', () => {
  const tick = moonDayForPhase[0] * DAY + 6 * TICKS_PER_HOUR;
  eq(getMoonSkyPosition(tick).name, 'Moonrise');
});

test('New Moon: overhead at hour 12', () => {
  const tick = moonDayForPhase[0] * DAY + 12 * TICKS_PER_HOUR;
  eq(getMoonSkyPosition(tick).name, 'Overhead');
});

test('New Moon: moonset at hour 17', () => {
  const tick = moonDayForPhase[0] * DAY + 17 * TICKS_PER_HOUR;
  eq(getMoonSkyPosition(tick).name, 'Moonset');
});

test('New Moon: below horizon at hour 18', () => {
  const tick = moonDayForPhase[0] * DAY + 18 * TICKS_PER_HOUR;
  eq(getMoonSkyPosition(tick).name, 'Below Horizon');
});

test('Full Moon: moonrise at hour 18', () => {
  const tick = moonDayForPhase[4] * DAY + 18 * TICKS_PER_HOUR;
  eq(getMoonSkyPosition(tick).name, 'Moonrise');
});

test('Full Moon: overhead at hour 0', () => {
  const tick = moonDayForPhase[4] * DAY + 0 * TICKS_PER_HOUR;
  eq(getMoonSkyPosition(tick).name, 'Overhead');
});

test('Full Moon: below horizon at hour 7', () => {
  const tick = moonDayForPhase[4] * DAY + 7 * TICKS_PER_HOUR;
  eq(getMoonSkyPosition(tick).name, 'Below Horizon');
});

test('Last Quarter: moonrise at hour 0', () => {
  const tick = moonDayForPhase[6] * DAY + 0 * TICKS_PER_HOUR;
  eq(getMoonSkyPosition(tick).name, 'Moonrise');
});

test('Last Quarter: below horizon at hour 13', () => {
  const tick = moonDayForPhase[6] * DAY + 13 * TICKS_PER_HOUR;
  eq(getMoonSkyPosition(tick).name, 'Below Horizon');
});

test('getMoonSkyPosition returns emoji', () => {
  const tick = moonDayForPhase[0] * DAY + 6 * TICKS_PER_HOUR;
  ok(getMoonSkyPosition(tick).emoji.length > 0);
});

test('every phase has a below-horizon window', () => {
  MOON_PHASES.forEach((_, phaseIndex) => {
    const belowCount = PHASE_HOUR_TO_MOON_SKY_INDEX[phaseIndex].filter(s => s === 0).length;
    ok(belowCount > 0, `phase ${phaseIndex} has no below-horizon hours`);
  });
});

test('every phase has exactly 12 visible hours', () => {
  MOON_PHASES.forEach((_, phaseIndex) => {
    const visibleCount = PHASE_HOUR_TO_MOON_SKY_INDEX[phaseIndex].filter(s => s > 0).length;
    eq(visibleCount, 12);
  });
});

console.log('\n── getTimePosition ───────────────────────────────');

test('hour 6: sun at slot 0 (Full Moon below horizon)', () => {
  const tick = moonDayForPhase[4] * DAY + 6 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ 🌞 • • • ]');
});

test('hour 9: sun at slot 1 (Full Moon below horizon)', () => {
  const tick = moonDayForPhase[4] * DAY + 9 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ • 🌞 • • ]');
});

test('hour 12: sun at slot 1 (Full Moon below horizon)', () => {
  const tick = moonDayForPhase[4] * DAY + 12 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ • 🌞 • • ]');
});

test('hour 13: sun at slot 2 (Full Moon below horizon)', () => {
  const tick = moonDayForPhase[4] * DAY + 13 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ • • 🌞 • ]');
});

test('hour 17: sun at slot 2 (Full Moon below horizon)', () => {
  const tick = moonDayForPhase[4] * DAY + 17 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ • • 🌞 • ]');
});

test('hour 18: sun at slot 3 (Full Moon below horizon)', () => {
  const tick = moonDayForPhase[4] * DAY + 18 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ 🌕 • • 🌞 ]');
});

test('hour 20: sun at slot 3 (Dusk)', () => {
  const tick = moonDayForPhase[4] * DAY + 20 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ 🌕 • • 🌞 ]');
});

test('New Moon at hour 0: below horizon, all dots', () => {
  const tick = moonDayForPhase[0] * DAY + 0 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ • • • • ]');
});

test('New Moon at hour 22: below horizon, all dots', () => {
  const tick = moonDayForPhase[0] * DAY + 22 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ • • • • ]');
});

test('New Moon at hour 6: sun only, moon suppressed', () => {
  const tick = moonDayForPhase[0] * DAY + 6 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ 🌞 • • • ]');
});

test('Full Moon at hour 21: moon only at slot 1', () => {
  const tick = moonDayForPhase[4] * DAY + 21 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ • 🌕 • • ]');
});

test('Full Moon at hour 0: moon only at slot 2', () => {
  const tick = moonDayForPhase[4] * DAY + 0 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ • • 🌕 • ]');
});

test('Full Moon at hour 3: moon only at slot 3', () => {
  const tick = moonDayForPhase[4] * DAY + 3 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ • • • 🌕 ]');
});

test('Last Quarter at sunrise shows sun east moon west', () => {
  const tick = moonDayForPhase[6] * DAY + 6 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ 🌞 • 🌗 • ]');
});

test('Waning Gibbous at sunrise shows sun east moon setting west', () => {
  const tick = moonDayForPhase[5] * DAY + 6 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ 🌞 • • 🌖 ]');
});

test('Waxing Crescent is below horizon at hour 21', () => {
  const tick = moonDayForPhase[1] * DAY + 21 * TICKS_PER_HOUR;
  eq(getTimePosition(tick), '[ • • • • ]');
});

test('Last Quarter uses 🌗 emoji in its night window', () => {
  const tick = moonDayForPhase[6] * DAY + 0 * TICKS_PER_HOUR;
  const result = getTimePosition(tick);
  ok(result.includes('🌗'), `expected 🌗 in "${result}"`);
});

test('sun window hours 6-20 always show sun regardless of moon phase', () => {
  MOON_PHASES.forEach((_, phaseIndex) => {
    const moonDay = moonDayForPhase[phaseIndex];
    for (let h = 6; h < 21; h++) {
      const tick   = moonDay * DAY + h * TICKS_PER_HOUR;
      const result = getTimePosition(tick);
      ok(result.includes('🌞'), `phase ${phaseIndex} hour ${h}: expected sun, got "${result}"`);
    }
  });
});

console.log('\n──────────────────────────────────────────────────');
console.log(`  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);