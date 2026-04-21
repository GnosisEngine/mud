'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierCharacter} RanvierCharacter */
/** @typedef {import('types').RanvierDamage} RanvierDamage */

const Combat = require('../../lib/Combat');

/**
 * Example real-time combat behavior for NPCs that goes along with the player's player-combat.js
 * Have combat implemented in a behavior like this allows two NPCs with this behavior to fight without
 * the player having to be involved
 */
module.exports = () => {
  return  {
    listeners: {
      /**
       * @param {GameState} state
       * @returns {function(Record<string, any>): void}
       */
      updateTick: state => /** @this {RanvierCharacter} */ function(/*config*/) {
        Combat.updateRound(state, this);
      },

      /**
       * NPC was killed
       * @param {GameState} _
       * @returns {function(Record<string, any>, RanvierCharacter): void}
       */
      killed: (_) => /** @this {RanvierCharacter} */ function(/*config, killer*/) {
      },

      /**
       * NPC hit another character
       * @param {GameState} _
       * @returns {function(Record<string, any>, RanvierDamage, RanvierCharacter): void}
       */
      hit: (_) => /** @this {RanvierCharacter} */ function(/*config, damage, target*/) {
      },

      /**
       * @param {GameState} state
       * @returns {function(Record<string, any>, RanvierDamage): void}
       */
      damaged: state => /** @this {RanvierCharacter} */ function(_, damage) {
        if (this.getAttribute('health') <= 0) {
          Combat.handleDeath(state, this, damage.attacker);
        }
      },

      /**
       * NPC killed a target
       * @param {GameState} state
       * @returns {function(Record<string, any>, RanvierDamage): void}

       */
      deathblow: state => /** @this {RanvierCharacter} */ function(/*config, target*/) {
        if (!this.isInCombat()) {
          Combat.startRegeneration(state, this);
        }
      }
    }
  };
};
