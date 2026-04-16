'use strict';
const { isMoonObservable } = require('./lib/time-math');
const NOOP = {};

module.exports = {
  hasTickArg: (_, __, { args } = NOOP) => {
    return !!(args && args.trim() !== '');
  },

  isSunUp: (_, __, { hour } = NOOP) => {
    return hour >= 6 && hour < 21;
  },

  isMoonVisible: (_, __, { tick } = NOOP) => {
    return isMoonObservable(tick);
  },

  isHoliday: (_, __, { isHoliday } = NOOP) => {
    return !!isHoliday;
  },
};
