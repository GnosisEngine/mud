'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

const { Broadcast, PlayerRoles } = require('ranvier');
const Parser = require('../../lib/lib/ArgParser');
const { isAdmin } = require('../logic');

module.exports = {
  requiredRole: PlayerRoles.ADMIN,

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    if (!isAdmin(state, player)) {
      return Broadcast.sayAt(player, 'You do not have permission to use this command.');
    }

    args = args.trim();

    if (!args) {
      return Broadcast.sayAt(player, 'setadmin <player>');
    }

    const target = Parser.parseDot(args, player.room.players);

    if (!target) {
      return Broadcast.sayAt(player, 'They are not here.');
    }

    if (isAdmin(state, target)) {
      return Broadcast.sayAt(player, 'They are already an administrator.');
    }

    target.role = PlayerRoles.ADMIN;
    Broadcast.sayAt(target, `You have been made an administrator by ${player.name}.`);
    Broadcast.sayAt(player, `${target.name} is now an administrator.`);
  }
};
