// bundles/vendor-npcs/behaviors/npc/merc-patrol.js
'use strict';

/** @typedef {import('../../../../types/state').GameState} GameState */
/** @typedef {import('../../../../types/ranvier').RanvierPlayer} RanvierPlayer */

// HP fraction at which a merc breaks off and flees toward homeRoomId.
const FLEE_HP_THRESHOLD = 0.5;

module.exports = {
  listeners: {
    /**
     * Fires every entity tick (~100ms). Responsible only for detecting the
     * HP threshold that triggers FLEEING. Movement itself is driven by
     * MercenaryService.tick() so that movement intervals are enforced
     * consistently regardless of the entity tick rate.
     *
     * @param {GameState} state
     * @returns {function(string, RanvierPlayer): void}
     */
    updateTick: state => function() {
      if (!this.room || !state.MercenaryService) return;

      const contractId = this.getMeta('merc.contractId');
      if (!contractId) return;

      const status = this.getMeta('merc.status');
      if (!status || status === 'idle' || status === 'FLEEING' || status === 'RETURNING') return;

      // Only check HP when the merc is active and not already withdrawing.
      let hp;
      let maxHp;
      try {
        hp = this.getAttribute('health');
        maxHp = this.getMaxAttribute('health');
      } catch (_) {
        // Attribute not initialised — skip this tick.
        return;
      }

      if (maxHp <= 0) return;

      if (hp / maxHp < FLEE_HP_THRESHOLD) {
        state.MercenaryService.beginFleeing(contractId, state);
      }
    },
  },
};
