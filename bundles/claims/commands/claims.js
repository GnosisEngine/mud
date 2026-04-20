'use strict';
const { claimList } = require('./claim');

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

module.exports = {
  aliases: [],

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (_, player) => {
    return claimList(state, player);
  },
};
