'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

require('../hints');
const { getTarget } = require('../lib/Targeter');

module.exports = {
  listeners: {

    /**
     * @param {GameState} state
     * @returns {function(string, RanvierPlayer): void}
     */
    startup: state => async() => {
      state.getTarget = getTarget;
    }
  }
};
