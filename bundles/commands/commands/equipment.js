'use strict';

const { Broadcast } = require('ranvier');
const ItemUtil = require('../../lib/lib/ItemUtil');
const { isWearingEquipment } = require('../logic');

module.exports = {
  aliases: ['worn'],
  usage: 'equipment',
  command: state => (args, player) => {
    if (!isWearingEquipment(state, player)) {
      return Broadcast.sayAt(player, 'You are completely naked!');
    }

    Broadcast.sayAt(player, 'Currently Equipped:');
    for (const [slot, item] of player.equipment) {
      Broadcast.sayAt(player, `  <${slot}> ${ItemUtil.display(item)}`);
    }
  }
};
