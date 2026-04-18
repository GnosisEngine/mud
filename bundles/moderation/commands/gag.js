// bundles/communication/commands/gag.js
'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

require('../hints');
const { Broadcast } = require('ranvier');
const {
  isAdmin,
  isSelf,
  isOnline,
  isValidEffect,
  hasEffect,
} = require('../logic');

const VALID_EFFECTS = new Set(['censored', 'muted', 'raspy', 'outcasted', 'dull']);

module.exports = {
  requiredRole: require('ranvier').PlayerRoles.ADMIN,
  usage: 'gag <player> <effect>',

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
      Broadcast.sayAt(player, 'Usage: gag <player> <effect>');
      Broadcast.sayAt(player, `Valid effects: ${[...VALID_EFFECTS].join(', ')}`);
      return;
    }

    const [targetName, effectName] = args.split(/\s+/);

    if (!effectName) {
      Broadcast.sayAt(player, 'Usage: gag <player> <effect>');
      Broadcast.sayAt(player, `Valid effects: ${[...VALID_EFFECTS].join(', ')}`);
      return;
    }

    if (!isValidEffect(state, player, { effectName, validEffecst: VALID_EFFECTS })) {
      Broadcast.sayAt(player, `Unknown effect '${effectName}'. Valid effects: ${[...VALID_EFFECTS].join(', ')}`);
      return;
    }

    if (!isOnline(state, player, { targetName })) {
      Broadcast.sayAt(player, `No online player found with name '${targetName}'.`);
      return;
    }

    const target = state.PlayerManager.getPlayer(targetName);

    if (isSelf(state, player, { target })) {
      Broadcast.sayAt(player, 'You cannot gag yourself.');
      return;
    }

    if (hasEffect(state, player, { target, effectName })) {
      Broadcast.sayAt(player, `${target.name} already has the ${effectName} effect.`);
      return;
    }

    const effect = state.EffectFactory.create(effectName);
    target.addEffect(effect);

    Broadcast.sayAt(player, `You apply the ${effectName} effect to ${target.name}.`);
  },
};
