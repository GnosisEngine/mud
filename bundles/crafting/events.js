// bundles/crafting/events.js
'use strict';

const { buildEmitHelpers } = require('../lib/lib/EventHelpers');

const EVENTS = Object.freeze({
  RESOURCE_ROTTED:         'resource:rotted',
  RESOURCE_ORPHANED_DROPS: 'resource:orphanedDrops',
});

const SCHEMA = {
  [EVENTS.RESOURCE_ROTTED]: {
    emitter: 'player',
    payload: { rotted: 'object' },
    relay:   true,
  },
  [EVENTS.RESOURCE_ORPHANED_DROPS]: {
    emitter: 'room',
    payload: { drops: 'object', npc: 'object' },
    relay:   false,
  },
};

const emit = buildEmitHelpers(EVENTS, SCHEMA);

module.exports = { EVENTS, SCHEMA, emit };
