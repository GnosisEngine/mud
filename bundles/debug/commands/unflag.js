// bundles/debug/commands/unflag.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

const { Broadcast, PlayerRoles } = require('ranvier');
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
    const parts = args.length ? args.split(/\s+/) : [];

    if (parts.length < 2) {
      return Broadcast.sayAt(player, 'unflag <player> <variable>');
    }

    const [targetName, variable] = parts;

    const target = state.PlayerManager.getPlayer(targetName);
    if (!target) {
      return Broadcast.sayAt(player, `No player named '${targetName}' is online.`);
    }

    const account = target.account;
    if (!account || !account.metadata || !(variable in account.metadata)) {
      return Broadcast.sayAt(player, `${target.name}'s account has no '${variable}' flag.`);
    }

    delete account.metadata[variable];
    account.save();

    Broadcast.sayAt(player, `Unflagged ${account.username}.${variable} (via ${target.name}).`);
  }
};