'use strict';
const { claimList } = require('./claim');

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

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
