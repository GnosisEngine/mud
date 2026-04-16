'use strict';

const { Broadcast } = require('ranvier');
const { isInCombat } = require('../logic');

module.exports = {
  usage: 'quit',
  command: state => (args, player) => {
    if (isInCombat(state, player)) {
      return Broadcast.sayAt(player, "You're too busy fighting for your life!");
    }

    player.save(() => {
      Broadcast.sayAt(player, 'Goodbye!');
      Broadcast.sayAtExcept(player.room, `${player.name} disappears.`, player);
      state.PlayerManager.removePlayer(player, true);
    });
  }
};
