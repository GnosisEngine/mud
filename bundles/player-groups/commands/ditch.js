'use strict';

require('../hints');
const { Broadcast } = require('ranvier');
const ArgParser = require('../../lib/lib/ArgParser');

module.exports = {
  command: () => (args, player) => {
    if (!args) {
      return Broadcast.sayAt(player, 'Ditch whom?');
    }

    const target = ArgParser.parseDot(args, player.followers);

    if (!target) {
      return Broadcast.sayAt(player, "They aren't following you.");
    }

    Broadcast.sayAt(player, `You ditch ${target.name} and they stop following you.`);
    Broadcast.sayAt(target, `${player.name} ditches you and you stop following them.`);
    target.unfollow();
  }
};
