'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierSkill} RanvierSkill */

const { Damage, EffectFlag, Heal } = require('ranvier');

module.exports = {
  config: {
    name: 'Regenerate',
    description: 'You are regenerating over time.',
    type: 'regen',
    tickInterval: 3
  },
  flags: [EffectFlag.BUFF],
  state: {
    magnitude: 10,
  },
  listeners: {
    updateTick: /** @this {RanvierSkill} */function() {
      // pools that regenerate over time
      const target = this.target;

      if (!target) {
        return;
      }

      const regens = [
        { pool: 'health', modifier: target.isInCombat() ? 0 : 1 },
        // energy and mana recovers 50% faster than health
        { pool: 'energy', modifier: target.isInCombat() ? 0.25 : 1.5 },
        { pool: 'mana', modifier: target.isInCombat() ? 0.25 : 1.5 },
      ];

      for (const regen of regens) {
        if (!target.hasAttribute(regen.pool)) {
          continue;
        }

        const poolMax = target.getMaxAttribute(regen.pool);
        const amount = Math.round((poolMax / 10) * regen.modifier);
        const heal = new Heal(regen.pool, amount, target, this, {
          hidden: true,
        });
        heal.commit(target);
      }

      // favor is treated specially in that it drains over time
      if (target.hasAttribute('favor')) {
        if (target.getAttribute('favor') < 1 || target.isInCombat()) {
          return;
        }

        const amount = Math.ceil(target.getMaxAttribute('favor') / 10);
        const drain = new Damage('favor', amount, target, this, {
          hidden: true
        });
        drain.commit(target);
      }
    },
  }
};
