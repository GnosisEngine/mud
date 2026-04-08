'use strict';
const { Config } = require('ranvier');

const MS_PER_TICK = Config.get('msPerTick');
const TICKS_PER_HOUR = Config.get('ticksPerHour');
const TICKS_PER_DAY = Config.get('ticksPerDay');
const DAYS_PER_MONTH = Config.get('daysPerMonth');
const MONTHS_PER_YEAR = Config.get('monthsPerYear');
const DAYS_PER_YEAR = Config.get('daysPerYear');
const MOON_CYCLE_DAYS = Config.get('monthsPerYear');
const DAYS_PER_WEEK = Config.get('daysPerWeek');
const HOLIDAY_DAY_OF_YEAR = Config.get('holidayDayOfYear');
const MONTH_NAMES = Config.get('monthNames');
const HOLIDAY_NAME = Config.get('holidayName');
const DAY_NAMES = Config.get('dayNames');

module.exports = {
  TICKS_PER_HOUR,
  TICKS_PER_DAY,
  DAYS_PER_MONTH,
  MONTHS_PER_YEAR,
  DAYS_PER_YEAR,
  MOON_CYCLE_DAYS,
  DAYS_PER_WEEK,
  HOLIDAY_DAY_OF_YEAR,
  MONTH_NAMES,
  HOLIDAY_NAME,
  DAY_NAMES,
  MS_PER_TICK
};
