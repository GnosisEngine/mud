// bundles/combat/events.js
'use strict';

const { buildEmitHelpers } = require('../lib/lib/EventHelpers');

const EVENTS = Object.freeze({
  DEATHBLOW: 'deathblow',
  KILLED:    'killed',
  HIT:       'hit',
  DAMAGED:   'damaged',
  HEALED:    'healed',
  HEAL:      'heal',
});

const SCHEMA = {
  [EVENTS.DEATHBLOW]: {
    emitter: 'player',
    payload: { target: 'object', skipParty: 'boolean' },
    relay:   true,
  },
  [EVENTS.KILLED]: {
    emitter: 'player',
    payload: { killer: 'object' },
    relay:   true,
  },
  [EVENTS.HIT]: {
    emitter: 'player',
    payload: { damage: 'object', target: 'object', finalAmount: 'number' },
    relay:   true,
  },
  [EVENTS.DAMAGED]: {
    emitter: 'player',
    payload: { damage: 'object', finalAmount: 'number' },
    relay:   true,
  },
  [EVENTS.HEALED]: {
    emitter: 'player',
    payload: { heal: 'object', finalAmount: 'number' },
    relay:   true,
  },
  [EVENTS.HEAL]: {
    emitter: 'player',
    payload: { heal: 'object', target: 'object', finalAmount: 'number' },
    relay:   false,
  },
};

const emit = buildEmitHelpers(EVENTS, SCHEMA);

module.exports = { EVENTS, SCHEMA, emit };
