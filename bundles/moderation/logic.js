'use strict';
const { isAdmin, isPlayerOnline, isSelf } = require('../lib/logic');

const NOOP = {};

module.exports = {
  isAdmin,

  isSelf,

  isOnline: isPlayerOnline,

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
