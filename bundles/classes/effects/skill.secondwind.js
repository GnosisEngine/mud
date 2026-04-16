'use strict';

const { Broadcast, EffectFlag, Heal } = require('ranvier');
const { isBelowEnergyThreshold, isSkillOnCooldown } = require('../logic');

module.exports = {
  config: {
    name: 'Second Wind',
    type: 'skill:secondwind'
  },
  flags: [EffectFlag.BUFF],
  listeners: {
    damaged: function(damage) {
      if (damage.attribute !== 'energy') {
        return;
      }

      if (isSkillOnCooldown(null, null, { skill: this.skill, target: this.target })) {
        return;
      }

      if (!isBelowEnergyThreshold(null, this.target, { threshold: this.state.threshold })) {
        return;
      }

      Broadcast.sayAt(this.target, '<bold><yellow>You catch a second wind!</bold></yellow>');
      const amount = Math.floor(this.target.getMaxAttribute('energy') * (this.state.restorePercent / 100));
      const heal = new Heal('energy', amount, this.target, this.skill);
      heal.commit(this.target);

      this.skill.cooldown(this.target);
    }
  }
};
