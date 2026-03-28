// bundles/time-bundle/lib/time-math.js

const TICKS_PER_HOUR = 60;
const TICKS_PER_DAY = 1440;
const DAYS_PER_MONTH = 28;
const MONTHS_PER_YEAR = 13;
const DAYS_PER_YEAR = 365;
const MOON_CYCLE_DAYS = 28;
const DAYS_PER_WEEK = 7;
const HOLIDAY_DAY_OF_YEAR = 364;

const MONTH_NAMES = [
  'Frostholm', 'Ashveil',   'Thornmere', 'Gloomwatch', 'Emberdawn',
  'Verdannis', 'Solmara',   'Heathen',   'Goldenveil', 'Harrowmede',
  'Duskfall',  'Wintermarch','Bleakstone'
];

const HOLIDAY_NAME = 'The Unmarked Day';

const DAY_NAMES = [
  'Solday', 'Moonday', 'Ironday', 'Ashday', 'Thornday', 'Stillday', 'Veilday'
];

const MOON_PHASES = [
  { name: 'New Moon',        emoji: '🌑' },
  { name: 'Waxing Crescent', emoji: '🌒' },
  { name: 'First Quarter',   emoji: '🌓' },
  { name: 'Waxing Gibbous',  emoji: '🌔' },
  { name: 'Full Moon',       emoji: '🌕' },
  { name: 'Waning Gibbous',  emoji: '🌖' },
  { name: 'Last Quarter',    emoji: '🌗' },
  { name: 'Waning Crescent', emoji: '🌘' },
];

const DAY_PHASES = [
  { name: 'Midnight',   emoji: '🌃' },
  { name: 'Dawn',       emoji: '🌄' },
  { name: 'Sunrise',    emoji: '🌅' },
  { name: 'Morning',    emoji: '🌤️'  },
  { name: 'Noon',       emoji: '☀️'  },
  { name: 'Afternoon',  emoji: '🌞' },
  { name: 'Sunset',     emoji: '🌇' },
  { name: 'Dusk',       emoji: '🌆' },
  { name: 'Night',      emoji: '🌉' },
];

const HOUR_TO_DAY_PHASE_INDEX = [
  0, 0, 0, 0, 0,
  1,
  2,
  3, 3, 3, 3, 3,
  4,
  5, 5, 5, 5, 5,
  6,
  7, 7,
  8, 8, 8
];

const DAY_TO_MOON_PHASE_INDEX = [
  0, 0, 0, 0,
  1, 1, 1,
  2, 2, 2, 2,
  3, 3, 3,
  4, 4, 4, 4,
  5, 5, 5,
  6, 6, 6, 6,
  7, 7, 7,
];

const MOON_SKY_POSITIONS = [
  { name: 'Below Horizon',    emoji: '✨' },
  { name: 'Moonrise',         emoji: '🌄' },
  { name: 'Low Eastern Sky',  emoji: '🌕' },
  { name: 'Climbing',         emoji: '🌕' },
  { name: 'Overhead',         emoji: '🌕' },
  { name: 'Descending',       emoji: '🌕' },
  { name: 'Low Western Sky',  emoji: '🌕' },
  { name: 'Moonset',          emoji: '🌇' },
];

const PHASE_HOUR_TO_MOON_SKY_INDEX = [
  [0,0,0,0,0,0,1,2,2,3,3,4,4,5,5,6,6,7,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,2,2,3,3,4,4,5,5,6,6,7,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,3,3,4,4,5,5,6,6,7],
  [6,6,7,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,3,3,4,4,5,5],
  [4,5,5,6,6,7,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,3,3,4],
  [3,3,4,4,5,5,6,6,7,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2],
  [1,2,2,3,3,4,4,5,5,6,6,7,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,1,2,2,3,3,4,4,5,5,6,6,7,0,0,0,0,0,0,0,0,0],
];

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function tickToComponents(tick) {
  const minute    = tick % TICKS_PER_HOUR;
  const totalHours = Math.floor(tick / TICKS_PER_HOUR);
  const hour      = totalHours % 24;
  const totalDays = Math.floor(totalHours / 24);
  const year      = Math.floor(totalDays / DAYS_PER_YEAR) + 1;
  const dayOfYear = totalDays % DAYS_PER_YEAR;
  const dayOfWeek = totalDays % DAYS_PER_WEEK;
  const moonDay   = totalDays % MOON_CYCLE_DAYS;
  const isHoliday = dayOfYear === HOLIDAY_DAY_OF_YEAR;
  const month     = isHoliday ? null : Math.floor(dayOfYear / DAYS_PER_MONTH) + 1;
  const dayOfMonth = isHoliday ? null : (dayOfYear % DAYS_PER_MONTH) + 1;

  return { year, dayOfYear, month, dayOfMonth, dayOfWeek, hour, minute, isHoliday, moonDay, totalDays };
}

function getMonth(tick) {
  const { month, isHoliday } = tickToComponents(tick);
  if (isHoliday) return { name: HOLIDAY_NAME, index: null };
  return { name: MONTH_NAMES[month - 1], index: month };
}

function getDayOfWeek(tick) {
  const { dayOfWeek } = tickToComponents(tick);
  return { name: DAY_NAMES[dayOfWeek], index: dayOfWeek };
}

function getDayOfMonth(tick) {
  const { dayOfMonth, isHoliday } = tickToComponents(tick);
  return isHoliday ? null : dayOfMonth;
}

function getHour(tick) {
  return tickToComponents(tick).hour;
}

function getMinute(tick) {
  return tickToComponents(tick).minute;
}

function getMoonPhase(tick) {
  const { moonDay } = tickToComponents(tick);
  const index = DAY_TO_MOON_PHASE_INDEX[moonDay];
  return { ...MOON_PHASES[index], index };
}

function getDayPhase(tick) {
  const { hour } = tickToComponents(tick);
  const index = HOUR_TO_DAY_PHASE_INDEX[hour];
  return { ...DAY_PHASES[index], index };
}

function getMoonSkyPosition(tick) {
  const { hour, moonDay } = tickToComponents(tick);
  const phaseIndex = DAY_TO_MOON_PHASE_INDEX[moonDay];
  const skyIndex   = PHASE_HOUR_TO_MOON_SKY_INDEX[phaseIndex][hour];
  return { ...MOON_SKY_POSITIONS[skyIndex], index: skyIndex };
}

function isMoonObservable(tick) {
  const { moonDay } = tickToComponents(tick);
  const phaseIndex  = DAY_TO_MOON_PHASE_INDEX[moonDay];
  const skyIndex    = PHASE_HOUR_TO_MOON_SKY_INDEX[phaseIndex][tickToComponents(tick).hour];
  if (skyIndex === 0) return false;
  if (phaseIndex === 0) return false;
  return true;
}

function getTimePosition(tick) {
  const { hour, moonDay } = tickToComponents(tick);

  let sunSlot = null;
  if (hour >= 6 && hour < 21) {
    if      (hour < 9)  sunSlot = 0;
    else if (hour < 13) sunSlot = 1;
    else if (hour < 18) sunSlot = 2;
    else                sunSlot = 3;
  }

  let moonSlot = null;
  if (isMoonObservable(tick)) {
    const phaseIndex     = DAY_TO_MOON_PHASE_INDEX[moonDay];
    const riseHour       = PHASE_HOUR_TO_MOON_SKY_INDEX[phaseIndex].indexOf(1);
    const hoursSinceRise = (hour - riseHour + 24) % 24;
    moonSlot             = Math.min(Math.floor(hoursSinceRise / 3), 3);
  }

  const moonEmoji = getMoonPhase(tick).emoji;
  const slots     = ['•', '•', '•', '•'];

  for (let i = 0; i < 4; i++) {
    const hasSun  = sunSlot  === i;
    const hasMoon = moonSlot === i;
    if (hasSun && hasMoon) slots[i] = '🌞' + moonEmoji;
    else if (hasSun)       slots[i] = '🌞';
    else if (hasMoon)      slots[i] = moonEmoji;
  }

  return `[ ${slots.join(' ')} ]`;
}

function getFormalTime(tick) {
  const { year, month, dayOfMonth, dayOfWeek, hour, minute, isHoliday } = tickToComponents(tick);
  const dayName = DAY_NAMES[dayOfWeek];
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  if (isHoliday) {
    return `${dayName}, ${HOLIDAY_NAME}, Year ${year}, ${timeStr}`;
  }

  return `${dayName}, the ${ordinal(dayOfMonth)} of ${MONTH_NAMES[month - 1]}, Year ${year}, ${timeStr}`;
}

module.exports = {
  TICKS_PER_HOUR,
  TICKS_PER_DAY,
  DAYS_PER_MONTH,
  MONTHS_PER_YEAR,
  DAYS_PER_YEAR,
  MOON_CYCLE_DAYS,
  DAYS_PER_WEEK,
  HOLIDAY_DAY_OF_YEAR,
  HOLIDAY_NAME,
  MONTH_NAMES,
  DAY_NAMES,
  MOON_PHASES,
  DAY_PHASES,
  MOON_SKY_POSITIONS,
  HOUR_TO_DAY_PHASE_INDEX,
  DAY_TO_MOON_PHASE_INDEX,
  PHASE_HOUR_TO_MOON_SKY_INDEX,
  tickToComponents,
  getMonth,
  getDayOfWeek,
  getDayOfMonth,
  getHour,
  getMinute,
  getMoonPhase,
  getDayPhase,
  isMoonObservable,
  getMoonSkyPosition,
  getTimePosition,
  getFormalTime,
};