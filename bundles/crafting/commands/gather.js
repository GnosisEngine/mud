// resources/commands/gather.js
'use strict';

const { Broadcast: B } = require('ranvier');
const GatherLogic = require('../lib/GatherLogic');
const ResourceDefinitions = require('../lib/ResourceDefinitions');

module.exports = {
  command: state => (args, player) => {
    const room = player.room;
    const roomItems = [...room.items];

    const result = GatherLogic.execute(player, room, args, {
      roomItems,
      splitResolver: options => {
        const claimsBundle = state.BundleManager && state.BundleManager.getBundle('claims');
        if (!claimsBundle) return null;
        return claimsBundle.getSplitForRoom(room);
      },
      roomDropper: (r, resourceKey, amount) => {
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
      }
      return;
    }

    for (const [resourceKey, amount] of Object.entries(result.yields)) {
      const def = ResourceDefinitions.getDefinition(resourceKey);
      const title = def ? def.title : resourceKey;
      B.sayAt(player, `<green>You gather: ${title} x${amount}.</green>`);
    }

    B.sayAt(player, `The ${result.node.name} ${result.depletedMessage}`);
  },
};