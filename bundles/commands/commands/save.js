'use strict';

const { Broadcast } = require('ranvier');

module.exports = {
  usage: 'save',
  command: () => (args, player) => {
    player.save(() => {
      Broadcast.sayAt(player, 'Saved.');
    });
  }
};
