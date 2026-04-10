// bundles/player-events/events.js
'use strict';

const { buildEmitHelpers } = require('../lib/lib/EventHelpers');

const EVENTS = Object.freeze({
  EXPERIENCE: 'experience',
  MOVE:       'move',
  LEVEL:      'level',
});

const SCHEMA = {
  [EVENTS.EXPERIENCE]: {
    emitter: 'player',
    payload: { amount: 'number' },
    relay: true,
  },
  [EVENTS.MOVE]: {
    emitter: 'player',
    payload: { roomExit: 'object' },
    relay: false,
  },
  [EVENTS.LEVEL]: {
    emitter: 'player',
    payload: {},
    relay: true,
  },
};

const emit = buildEmitHelpers(EVENTS, SCHEMA);

module.exports = { EVENTS, SCHEMA, emit };
