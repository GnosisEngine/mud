// bundles/debug/commands/flag.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

const { Broadcast, PlayerRoles } = require('ranvier');
const { isAdmin } = require('../logic');

/**
 * Coerce a raw string value to a typed value: booleans, numbers, null, and
 * JSON objects/arrays are parsed; anything else stays a string.
 *
 * @param {string} raw
 * @returns {*}
 */
function coerce(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
}

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

    if (parts.length < 3) {
      return Broadcast.sayAt(player, 'flag <player> <variable> <value>');
    }

    const [targetName, variable] = parts;
    const value = coerce(parts.slice(2).join(' '));

    const target = state.PlayerManager.getPlayer(targetName);
    if (!target) {
      return Broadcast.sayAt(player, `No player named '${targetName}' is online.`);
    }

    const account = target.account;
    if (!account) {
      return Broadcast.sayAt(player, `${target.name} has no account to flag.`);
    }

    account.metadata = account.metadata || {};
    account.metadata[variable] = value;
    account.save();

    Broadcast.sayAt(player, `Flagged ${account.username}.${variable} = ${JSON.stringify(value)} (via ${target.name}).`);
  }
};