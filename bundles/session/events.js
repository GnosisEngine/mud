// bundles/session/events.js
'use strict';

const { buildEmitHelpers } = require('../lib/lib/EventHelpers');

const EVENTS = Object.freeze({
  ENTER_ETHEREAL: 'ethereal:enter',
  EXIT_ETHEREAL:  'ethereal:exit',
  GRACE_EXPIRED:  'ethereal:grace-expired',
});

const SCHEMA = {
  [EVENTS.ENTER_ETHEREAL]: {
    emitter: 'player',
    payload: {},
    relay:   true,
  },
  [EVENTS.EXIT_ETHEREAL]: {
    emitter: 'player',
    payload: {},
    relay:   true,
  },
  [EVENTS.GRACE_EXPIRED]: {
    emitter: 'player',
    payload: {},
    relay:   true,
  },
};

const emit = buildEmitHelpers(EVENTS, SCHEMA);

module.exports = { EVENTS, SCHEMA, emit };
