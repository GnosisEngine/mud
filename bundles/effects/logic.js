'use strict';
const { EffectFlag } = require('ranvier');
const NOOP = {};

module.exports = {
  hasNoVisibleEffects: (_, player) => {
    return player.effects.entries().filter(e => !e.config.hidden).length === 0;
  },

  getVisibleEffects: (_, player) => {
    return player.effects.entries().filter(e => !e.config.hidden);
  },

  isBuff: (_, __, { effect } = NOOP) => {
    return effect && effect.flags.includes(EffectFlag.BUFF);
  },

  isDebuff: (_, __, { effect } = NOOP) => {
    return effect && effect.flags.includes(EffectFlag.DEBUFF);
  },

  isStackable: (_, __, { effect } = NOOP) => {
    return effect && !!effect.config.maxStacks;
  },

  isPermanent: (_, __, { effect } = NOOP) => {
    return effect && effect.duration === Infinity;
  },

  getEffectColor: (_, __, { effect } = NOOP) => {
    if (!effect) return 'white';
    if (effect.flags.includes(EffectFlag.BUFF))   return 'green';
    if (effect.flags.includes(EffectFlag.DEBUFF)) return 'red';
    return 'white';
  },
};
