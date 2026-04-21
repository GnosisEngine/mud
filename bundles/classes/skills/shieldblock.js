'use strict';

const { Broadcast, SkillType } = require('ranvier');
const { hasShield } = require('../logic');

const cooldown = 45;
const cost = 50;
const healthPercent = 15;
const duration = 20 * 1000;

module.exports = {
  name: 'Shield Block',
  type: SkillType.SKILL,
  requiresTarget: false,
  resource: {
    attribute: 'energy',
    cost,
  },
  cooldown,

  run: () => /** @this {import('types').RanvierSkill } */function(args, player) {
    if (!hasShield(this.state, player)) {
      Broadcast.sayAt(player, "You aren't wearing a shield!");
      return false;
    }

    const effect = this.state.EffectFactory.create(
      'skill.shieldblock',
      {
        duration,
        description: this.info(player),
      },
      {
        magnitude: Math.round(player.getMaxAttribute('health') * (healthPercent / 100))
      }
    );
    effect.skill = this;

    Broadcast.sayAt(player, '<b>You raise your shield, bracing for incoming attacks!</b>');
    Broadcast.sayAtExcept(player.room, `<b>${player.name} raises their shield, bracing for incoming damage.</b>`, [player]);
    player.addEffect(effect);
  },

  info: () => {
    return `Raise your shield block damage up to <bold>${healthPercent}%</bold> of your maximum health for <bold>${duration / 1000}</bold> seconds. Requires a shield.`;
  }
};
