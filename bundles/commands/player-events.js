'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierItem} RanvierItem */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

require('./hints');

module.exports = {
  listeners: {
    /**
     * Handle a player equipping an item with a `stats` property
     * @param {GameState} state
     * @returns {function(string, RanvierItem): void}
     */
    equip: state => /** @this {RanvierPlayer} */function(slot, item) {
      if (!item.metadata.stats) {
        return;
      }

      const config = {
        name: 'Equip: ' + slot,
        type: 'equip.' + slot
      };

      const effectState = {
        slot,
        stats: item.metadata.stats,
      };

      this.addEffect(state.EffectFactory.create(
        'equip',
        config,
        effectState
      ));
    }
  }
};
