'use strict';

const { Broadcast } = require('ranvier');
const ItemUtil = require('../../lib/lib/ItemUtil');
const { hasInventory } = require('../logic');

module.exports = {
  usage: 'inventory',
  command: () => (args, player) => {
    if (!hasInventory(null, player)) {
      return Broadcast.sayAt(player, "You aren't carrying anything.");
    }

    Broadcast.at(player, 'You are carrying');
    if (isFinite(player.inventory.getMax())) {
      Broadcast.at(player, ` (${player.inventory.size}/${player.inventory.getMax()})`);
    }
    Broadcast.sayAt(player, ':');

    for (const [, item] of player.inventory) {
      Broadcast.sayAt(player, ItemUtil.display(item));
    }
  }
};
