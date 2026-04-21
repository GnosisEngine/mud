'use strict';
const { SkillFlag } = require('ranvier');
const { hasWeapon } = require('../lib/logic');
const NOOP = {};

module.exports = {
  /** @type {import('types').LogicCheck} */
  isSpellKnown: (state, __, { spellName } = NOOP) => {
    return !!state.SpellManager.find(spellName);
  },

  /** @type {import('types').LogicCheck} */
  isPassiveSkill: (_, __, { skill } = NOOP) => {
    return !!(skill && skill.flags && skill.flags.includes(SkillFlag.PASSIVE));
  },

  /** @type {import('types').LogicCheck} */
  hasResourceCost: (_, __, { skill } = NOOP) => {
    return !!(skill && skill.resource && skill.resource.cost);
  },

  /** @type {import('types').LogicCheck} */
  hasCooldown: (_, __, { skill } = NOOP) => {
    return !!(skill && skill.cooldownLength);
  },

  /** @type {import('types').LogicCheck} */
  hasAbilitiesAtLevel: (_, __, { abilities } = NOOP) => {
    return !!((abilities.skills && abilities.skills.length) || (abilities.spells && abilities.spells.length));
  },

  /** @type {import('types').LogicCheck} */
  isAbilityUnlocked: (_, player, { level } = NOOP) => {
    return player.level >= level;
  },

  /** @type {import('types').LogicCheck} */
  hasShield: (_, player) => {
    return player.equipment.has('shield');
  },

  /** @type {import('types').LogicCheck} */
  hasWeapon,

  /** @type {import('types').LogicCheck} */
  isBelowEnergyThreshold: (_, player, { threshold } = NOOP) => {
    return (player.getAttribute('energy') / player.getMaxAttribute('energy')) * 100 <= threshold;
  },

  /** @type {import('types').LogicCheck} */
  isSkillOnCooldown: (_, __, { skill, target } = NOOP) => {
    return !!(skill && skill.onCooldown(target));
  },
};
