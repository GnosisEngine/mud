'use strict';
const { SkillFlag } = require('ranvier');
const NOOP = {};

module.exports = {
  hasNoArgs: (_, __, { args } = NOOP) => {
    return !args || !args.length;
  },

  isSpellKnown: (state, __, { spellName } = NOOP) => {
    return !!state.SpellManager.find(spellName);
  },

  isPassiveSkill: (_, __, { skill } = NOOP) => {
    return !!(skill && skill.flags && skill.flags.includes(SkillFlag.PASSIVE));
  },

  hasResourceCost: (_, __, { skill } = NOOP) => {
    return !!(skill && skill.resource && skill.resource.cost);
  },

  hasCooldown: (_, __, { skill } = NOOP) => {
    return !!(skill && skill.cooldownLength);
  },

  hasAbilitiesAtLevel: (_, __, { abilities } = NOOP) => {
    return !!((abilities.skills && abilities.skills.length) || (abilities.spells && abilities.spells.length));
  },

  isAbilityUnlocked: (_, player, { level } = NOOP) => {
    return player.level >= level;
  },

  hasShield: (_, player) => {
    return player.equipment.has('shield');
  },

  hasWeapon: (_, player) => {
    return player.equipment.has('wield');
  },

  isBelowEnergyThreshold: (_, player, { threshold } = NOOP) => {
    return (player.getAttribute('energy') / player.getMaxAttribute('energy')) * 100 <= threshold;
  },

  isSkillOnCooldown: (_, __, { skill, target } = NOOP) => {
    return !!(skill && skill.onCooldown(target));
  },
};
