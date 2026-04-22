// resources/commands/gather.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

const { Broadcast: B } = require('ranvier');
const GatherLogic = require('../lib/GatherLogic');
const ResourceDefinitions = require('../lib/ResourceDefinitions');

module.exports = {

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    if (player.room === null) {
      return;
    }

    const room = player.room;
    const roomItems = [...room.items];

    const result = GatherLogic.execute(player, room, args, {
      roomItems,
      currentTick: state.TimeService ? state.TimeService.getTick() : null,
      // @todo: inject split resolver from claims bundle at startup
      splitResolver: null,
      roomDropper: (r, resourceKey/*, amount*/) => {
        const def = ResourceDefinitions.getDefinition(resourceKey);
        const title = def ? def.title : resourceKey;
        B.sayAt(player, `<yellow>Some ${title} spills to the ground.</yellow>`);
      },
      removeNode: node => {
        room.removeItem(node);
        state.ItemManager.remove(node);
      },
    });

    if (!result.ok) {
      switch (result.reason) {
        case 'no_args':
          return B.sayAt(player, 'Gather what?');
        case 'not_found':
          return B.sayAt(player, "You don't see anything like that here.");
        case 'not_gatherable':
          return B.sayAt(player, "You can't gather anything from that.");
        case 'nothing_yielded':
          return B.sayAt(player, 'You find nothing useful.');
        case 'over_capacity':
          return B.sayAt(player, "You're carrying too much to gather anything.");
      }
      return;
    }

    const playerAlloc = result.allocation.find(a => a.entity === player);
    const received = playerAlloc ? playerAlloc.amounts : {};

    for (const [resourceKey, amount] of Object.entries(received)) {
      const def = ResourceDefinitions.getDefinition(resourceKey);
      const title = def ? def.title : resourceKey;
      B.sayAt(player, `<green>You gather: ${title} x${amount}.</green>`);
    }

    B.sayAt(player, `The ${result.node.name} ${result.depletedMessage}`);
  },
};
