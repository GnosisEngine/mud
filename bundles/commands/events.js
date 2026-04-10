// bundles/commands/events.js
'use strict';

const { buildEmitHelpers } = require('../lib/lib/EventHelpers');

const EVENTS = Object.freeze({
  GET:              'get',
  DROP:             'drop',
  PUT:              'put',
  PLAYER_DROP_ITEM: 'playerDropItem',
});

// Player-perspective schema entries — these are the emits with active cross-bundle
// consumers (FetchGoal, future WS relay). Item-perspective emits share the same
// event strings but are appended to emit below as manual helpers.
const SCHEMA = {
  [EVENTS.GET]: {
    emitter: 'player',
    payload: { item: 'object' },
    relay:   false,
  },
  [EVENTS.DROP]: {
    emitter: 'player',
    payload: { item: 'object' },
    relay:   false,
  },
  [EVENTS.PUT]: {
    emitter: 'player',
    payload: { item: 'object', toContainer: 'object' },
    relay:   false,
  },
  [EVENTS.PLAYER_DROP_ITEM]: {
    emitter: 'npc',
    payload: { player: 'object', item: 'object' },
    relay:   false,
  },
};

const emit = buildEmitHelpers(EVENTS, SCHEMA);

// Item-perspective emits — same event strings, emitter is item, payload is flipped.
// Item behavior listeners will destructure { player } or { player, toContainer }.
emit.getOnItem  = (item, player)               => item.emit(EVENTS.GET,  { player });
emit.dropOnItem = (item, player)               => item.emit(EVENTS.DROP, { player });
emit.putOnItem  = (item, player, toContainer)  => item.emit(EVENTS.PUT,  { player, toContainer });

module.exports = { EVENTS, SCHEMA, emit };
