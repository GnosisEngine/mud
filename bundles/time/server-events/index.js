// bundles/time-bundle/server-events.js

'use strict';

const path        = require('path');
const timeState   = require('../lib/time-state');
const timeStore   = require('../lib/time-store');
const broadcaster = require('../lib/time-broadcaster');
const timeMath    = require('../lib/time-math');

const TICK_INTERVAL_MS = 250;

let dataPath = path.join(__dirname, '../../data/time-bundle/tick.json');

function configure(options) {
  if (options && options.dataPath) dataPath = options.dataPath;
}

function buildTimeService() {
  return {
    getTick:            ()     => timeState.get(),
    getFormalTime:      (tick) => timeMath.getFormalTime(tick !== undefined ? tick : timeState.get()),
    getMonth:           (tick) => timeMath.getMonth(tick !== undefined ? tick : timeState.get()),
    getDayOfWeek:       (tick) => timeMath.getDayOfWeek(tick !== undefined ? tick : timeState.get()),
    getDayOfMonth:      (tick) => timeMath.getDayOfMonth(tick !== undefined ? tick : timeState.get()),
    getHour:            (tick) => timeMath.getHour(tick !== undefined ? tick : timeState.get()),
    getMinute:          (tick) => timeMath.getMinute(tick !== undefined ? tick : timeState.get()),
    getMoonPhase:       (tick) => timeMath.getMoonPhase(tick !== undefined ? tick : timeState.get()),
    getDayPhase:        (tick) => timeMath.getDayPhase(tick !== undefined ? tick : timeState.get()),
    getMoonSkyPosition: (tick) => timeMath.getMoonSkyPosition(tick !== undefined ? tick : timeState.get()),
    getTimePosition:    (tick) => timeMath.getTimePosition(tick !== undefined ? tick : timeState.get()),
  };
}

module.exports = {
  configure,
  listeners: {
    startup: state => async () => {
      timeStore.configure(dataPath);

      const savedTick = timeStore.load();
      timeState.set(savedTick);

      timeState.on('dayRollover', tick => {
        timeStore.save(tick);
      });

      broadcaster.register(state.PlayerManager);

      let lastMs = Date.now();
      const interval = setInterval(() => {
        const now   = Date.now();
        const delta = now - lastMs;
        lastMs      = now;
        timeState.advance(delta);
      }, TICK_INTERVAL_MS);

      state.TimeService = buildTimeService();

      state._timeBundleStop = () => clearInterval(interval);
    },

    shutdown: state => async () => {
      if (state._timeBundleStop) state._timeBundleStop();
      timeStore.save(timeState.get());
    },
  },
};