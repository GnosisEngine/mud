// bundles/factions/events.js
'use strict';

const { buildEmitHelpers } = require('../lib/lib/EventHelpers');

// FACTION_EVENT is the inbound channel — emitted by resources, claims, combat,
// mercenaries, vendor-npcs, and quests bundles on the player object when
// something faction-relevant occurs. The factions bundle listens and routes it
// to FactionManager.applyEvent().
//
// FACTION_STANCE_CHANGED is the outbound channel — emitted by the factions
// bundle back onto the player when one or more bracket labels shift as a
// result of processing a FACTION_EVENT. NPC behaviors and other systems can
// listen to know when a player's standing has meaningfully changed.
//
// Other bundles import { EVENTS, emit } from this file. They never import
// FactionService or any factions internals directly.

const EVENTS = Object.freeze({
  FACTION_EVENT:         'factionEvent',
  FACTION_STANCE_CHANGED: 'faction:stanceChanged',
});

const SCHEMA = {
  [EVENTS.FACTION_EVENT]: {
    emitter: 'player',
    payload: {
      factionId: 'number',
      eventType: 'string',
    },
    relay: false,
  },
  [EVENTS.FACTION_STANCE_CHANGED]: {
    emitter: 'player',
    payload: {
      factionId: 'number',
      before:    'object',
      after:     'object',
    },
    relay: true,
  },
};

const emit = buildEmitHelpers(EVENTS, SCHEMA);

module.exports = { EVENTS, SCHEMA, emit };
