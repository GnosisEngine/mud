// bundles/claims/events.js
'use strict';

const { buildEmitHelpers } = require('../lib/lib/EventHelpers');

const EVENTS = Object.freeze({
  ENFORCE_RECEIVED: 'enforce:received',
});

const SCHEMA = {
  [EVENTS.ENFORCE_RECEIVED]: {
    emitter: 'player',
    payload: { enforcerId: 'string', claimId: 'string', roomId: 'string', duration: 'number' },
    relay:   true,
  },
};

const emit = buildEmitHelpers(EVENTS, SCHEMA);

module.exports = { EVENTS, SCHEMA, emit };
