// resources/commands/resources.js
'use strict';

const { Broadcast: B } = require('ranvier');
const ResourceContainer = require('../lib/ResourceContainer');
const ResourceDefinitions = require('../lib/ResourceDefinitions');
const Colors = require('../../colors/lib/Colors');
const { CARRY_MULTIPLIER } = ResourceContainer;

module.exports = {
  aliases: ['materials'],
  command: state => (args, player) => {
    const held = ResourceContainer.getHeld(player);
    const keys = Object.keys(held);

    if (!keys.length) {
      return B.sayAt(player, "You aren't carrying any resources.");
    }

    const currentWeight = ResourceContainer.getTotalWeight(player);
    const capacity = (player.getAttribute('strength') || 0) * CARRY_MULTIPLIER;

    B.sayAt(player, '<b>Resources</b>');
    B.sayAt(player, B.line(40));

    for (const key of keys) {
      const amount = ResourceContainer.getAmount(player, key);
      const def = ResourceDefinitions.getDefinition(key);
      const title = def ? def.title : key;
      const unitWeight = def ? def.weight : 0;
      const totalWeight = (unitWeight * amount).toFixed(2);
      B.sayAt(player, Colors.parse(`  ${title} x${amount} <dim>(${totalWeight}kg)</dim>`));
    }

    B.sayAt(player, B.line(40));
    B.sayAt(player, `Weight: ${currentWeight.toFixed(2)}kg / ${capacity.toFixed(2)}kg`);
  },
};