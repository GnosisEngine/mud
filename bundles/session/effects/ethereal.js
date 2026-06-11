// bundles/session/effects/ethereal.js
'use strict';

const { Broadcast: B, Logger } = require('ranvier');
const { emit } = require('../events');

module.exports = {
  config: {
    name: 'Ethereal',
    type: 'ethereal',
    description: 'A faint, disconnected presence.',
    duration: 30000,
    persists: false,
    hidden: false,
  },
  listeners: state => ({
    effectActivated: function() {
      emit.enterEthereal(this.target);
    },

    effectDeactivated: function() {
      const player = this.target;

      if (this.isCurrent()) {
        emit.exitEthereal(player);
        return;
      }

      process.nextTick(() => {
        emit.graceExpired(player);

        player.save(() => {
          B.sayAtExcept(player.room, `${player.name} fades from view.`, [player]);
          Logger.log(`${player.name} went ethereal too long and was removed.`);
          state.PlayerManager.removePlayer(player, true);
        });
      });
    },
  }),
};
