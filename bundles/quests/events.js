// bundles/quests/events.js
'use strict';

const { buildEmitHelpers } = require('../lib/lib/EventHelpers');

const EVENTS = Object.freeze({
  QUEST_START:        'questStart',
  QUEST_PROGRESS:     'questProgress',
  QUEST_TURN_IN_READY:'questTurnInReady',
  QUEST_COMPLETE:     'questComplete',
  QUEST_REWARD:       'questReward',
  GOAL_PROGRESS:      'progress',
  CURRENCY:           'currency',
});

// quest* events and GOAL_PROGRESS are emitted by the Ranvier engine or by
// this.emit() inside goal classes — not by bundle library code. Their schema
// entries are informational; listener signatures are not wrapped in payload
// objects since we do not control the engine's emit call-sites.
//
// CURRENCY is fully owned by this bundle and gets an emit helper.
const SCHEMA = {
  [EVENTS.QUEST_START]: {
    emitter: 'ranvier',
    payload: { quest: 'object' },
    relay:   false,
  },
  [EVENTS.QUEST_PROGRESS]: {
    emitter: 'ranvier',
    payload: { quest: 'object', progress: 'object' },
    relay:   true,
  },
  [EVENTS.QUEST_TURN_IN_READY]: {
    emitter: 'ranvier',
    payload: { quest: 'object' },
    relay:   false,
  },
  [EVENTS.QUEST_COMPLETE]: {
    emitter: 'ranvier',
    payload: { quest: 'object' },
    relay:   false,
  },
  [EVENTS.QUEST_REWARD]: {
    emitter: 'ranvier',
    payload: { reward: 'object' },
    relay:   false,
  },
  [EVENTS.GOAL_PROGRESS]: {
    emitter: 'goal',
    payload: { progress: 'object' },
    relay:   false,
  },
  [EVENTS.CURRENCY]: {
    emitter: 'player',
    payload: { currency: 'string', amount: 'number' },
    relay:   true,
  },
};

// Only CURRENCY gets a generated helper — all others are engine-emitted.
const { currency } = buildEmitHelpers(EVENTS, SCHEMA);
const emit = { currency };

module.exports = { EVENTS, SCHEMA, emit };
