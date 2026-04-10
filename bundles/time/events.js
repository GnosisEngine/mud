// bundles/time/events.js
'use strict';

// time-state.js uses its own internal emit() function, not a Node EventEmitter,
// so buildEmitHelpers is not applicable here. These constants are used directly
// at the three internal call-sites in time-state.js and at the listener
// registration sites in time-broadcaster.js and server-events/index.js.

const EVENTS = Object.freeze({
  DAY_ROLLOVER:    'dayRollover',
  DAY_PHASE_CHANGE:'dayPhaseChange',
  MOON_PHASE_CHANGE:'moonPhaseChange',
});

const SCHEMA = {
  [EVENTS.DAY_ROLLOVER]: {
    emitter: 'time-state',
    payload: { tick: 'number' },
    relay:   false,
  },
  [EVENTS.DAY_PHASE_CHANGE]: {
    emitter: 'time-state',
    payload: { phase: 'object' },
    relay:   true,
  },
  [EVENTS.MOON_PHASE_CHANGE]: {
    emitter: 'time-state',
    payload: { phase: 'object' },
    relay:   true,
  },
};

module.exports = { EVENTS, SCHEMA };
