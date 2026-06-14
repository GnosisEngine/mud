// bundles/time/server-events/index.js

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

'use strict';

require('../hints');
const path = require('path');
const timeState = require('../lib/time-state');
const timeStore = require('../lib/time-store');
const broadcaster = require('../lib/time-broadcaster');
const timeMath = require('../lib/time-math');
const { MS_PER_TICK } = require('../constants');
const { EVENTS } = require('../events');

function buildTimeService() {
  return {
    getTick: () => timeState.get(),
    getFormalTime: (tick) => timeMath.getFormalTime(tick !== undefined ? tick : timeState.get()),
    getMonth: (tick) => timeMath.getMonth(tick !== undefined ? tick : timeState.get()),
    getDayOfWeek: (tick) => timeMath.getDayOfWeek(tick !== undefined ? tick : timeState.get()),
    getDayOfMonth: (tick) => timeMath.getDayOfMonth(tick !== undefined ? tick : timeState.get()),
    getHour: (tick) => timeMath.getHour(tick !== undefined ? tick : timeState.get()),
    getMinute: (tick) => timeMath.getMinute(tick !== undefined ? tick : timeState.get()),
    getMoonPhase: (tick) => timeMath.getMoonPhase(tick !== undefined ? tick : timeState.get()),
    getDayPhase: (tick) => timeMath.getDayPhase(tick !== undefined ? tick : timeState.get()),
    getMoonSkyPosition: (tick) => timeMath.getMoonSkyPosition(tick !== undefined ? tick : timeState.get()),
    getTimePosition: (tick) => timeMath.getTimePosition(tick !== undefined ? tick : timeState.get()),
  };
}

module.exports = {
  listeners: {

    /**
     * @param {GameState} state
     * @returns {function(): void}
     */
    startup: state => async() => {
      const tickPath = path.join(state.Storage.namespaceDir('time'), 'tick.json');
      timeStore.configure(tickPath);

      const savedTick = timeStore.load();
      timeState.set(savedTick);

      timeState.on(EVENTS.DAY_ROLLOVER, tick => {
        timeStore.save(tick);
      });

      broadcaster.register(state.PlayerManager);

      let lastMs = Date.now();
      const interval = setInterval(() => {
        const now = Date.now();
        const delta = now - lastMs;
        lastMs = now;
        timeState.advance(delta);
      }, MS_PER_TICK);

      state.TimeService = buildTimeService();

      state._timeBundleStop = () => clearInterval(interval);
    },

    shutdown: state => async() => {
      if (state._timeBundleStop) state._timeBundleStop();
      timeStore.save(timeState.get());
    },
  },
};
