'use strict';
// bundles/time-bundle/lib/time-state.js

const { MS_PER_TICK, TICKS_PER_DAY } = require('../constants');
const { getMoonPhase, getDayPhase } = require('./time-math');
const { EVENTS } = require('../events');

let currentTick = 0;
let accumulated = 0;
let lastDayPhaseIndex = -1;
let lastMoonPhaseIndex = -1;

const listeners = {
  [EVENTS.DAY_ROLLOVER]:     [],
  [EVENTS.DAY_PHASE_CHANGE]: [],
  [EVENTS.MOON_PHASE_CHANGE]:[],
};

function emit(event, payload) {
  for (const fn of listeners[event]) fn(payload);
}

function on(event, fn) {
  listeners[event].push(fn);
}

function off(event, fn) {
  listeners[event] = listeners[event].filter(f => f !== fn);
}

function set(tick) {
  currentTick = tick;
  lastDayPhaseIndex = getDayPhase(tick).index;
  lastMoonPhaseIndex = getMoonPhase(tick).index;
}

function get() {
  return currentTick;
}

function advance(deltaMs) {
  accumulated += deltaMs;
  const newTicks = Math.floor(accumulated / MS_PER_TICK);
  if (newTicks === 0) return;
  accumulated -= newTicks * MS_PER_TICK;

  for (let i = 0; i < newTicks; i++) {
    const prevDay = Math.floor(currentTick / TICKS_PER_DAY);
    currentTick++;

    if (Math.floor(currentTick / TICKS_PER_DAY) !== prevDay) {
      emit(EVENTS.DAY_ROLLOVER, currentTick);
    }

    const dayPhase = getDayPhase(currentTick);
    const moonPhase = getMoonPhase(currentTick);

    if (dayPhase.index !== lastDayPhaseIndex) {
      lastDayPhaseIndex = dayPhase.index;
      emit(EVENTS.DAY_PHASE_CHANGE, dayPhase);
    }

    if (moonPhase.index !== lastMoonPhaseIndex) {
      lastMoonPhaseIndex = moonPhase.index;
      emit(EVENTS.MOON_PHASE_CHANGE, moonPhase);
    }
  }
}

function reset() {
  currentTick = 0;
  accumulated = 0;
  lastDayPhaseIndex = -1;
  lastMoonPhaseIndex = -1;
  listeners[EVENTS.DAY_ROLLOVER]     = [];
  listeners[EVENTS.DAY_PHASE_CHANGE] = [];
  listeners[EVENTS.MOON_PHASE_CHANGE] = [];
}

module.exports = { set, get, advance, on, off, reset };
