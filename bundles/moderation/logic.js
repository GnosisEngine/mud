'use strict';
const { PlayerRoles } = require('ranvier');
const NOOP = {};

module.exports = {
  isAdmin: (_, player) => {
    return player.role >= PlayerRoles.ADMIN;
  },

  hasNoArgs: (_, __, { args } = NOOP) => {
    return !args || !args.trim().length;
  },

  isSelf: (_, player, { target } = NOOP) => {
    return target === player;
  },

  isOnline: (state, __, { targetName } = NOOP) => {
    return !!state.PlayerManager.getPlayer(targetName);
  },

  isValidEffect: (_, __, { effectName, validEffects } = NOOP) => {
    return validEffects.has(effectName);
  },

  hasEffect: (_, __, { target, effectName } = NOOP) => {
    return target && target.effects.hasEffectType(effectName);
  },

  hasCommEffects: (_, __, { target } = NOOP) => {
    return !!(target && target.effects.entries().filter(e => Array.isArray(e.config.blockedChannels)).length);
  },
};
