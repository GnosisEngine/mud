// bundles/channels/server-events/index.js
'use strict';

/** @typedef {import('types').GameState} GameState */

const DynamicChannelRegistry = require('../lib/DynamicChannelRegistry');

module.exports = {
  listeners: {
    /**
     * @param {GameState} state
     * @returns {function(): Promise<void>}
     */
    startup: state => async() => {
      state.DynamicChannelRegistry = new DynamicChannelRegistry();
    },
  },
};
