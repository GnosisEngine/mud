'use strict';

/** @typedef {import('types').LogicCheck} LogicCheck */

const { EffectFlag } = require('ranvier');
const NOOP = {};

module.exports = {
  /** @type {LogicCheck} */
  hasNoVisibleEffects: (_, player) => {
    return player.effects.entries().filter(e => !e.config.hidden).length === 0;
  },

  /** @type {LogicCheck} */
  isBuff: (_, __, { effect } = NOOP) => {
    return effect && effect.flags.includes(EffectFlag.BUFF);
  },

  /** @type {LogicCheck} */
  isDebuff: (_, __, { effect } = NOOP) => {
    return effect && effect.flags.includes(EffectFlag.DEBUFF);
  },

  /** @type {LogicCheck} */
  isStackable: (_, __, { effect } = NOOP) => {
    return effect && !!effect.config.maxStacks;
  },

  /** @type {LogicCheck} */
  isPermanent: (_, __, { effect } = NOOP) => {
    return effect && effect.duration === Infinity;
  },
};
