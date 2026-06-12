// bundles/channels/server-events/index.js
'use strict';

/** @typedef {import('types').GameState} GameState */

const DynamicChannelRegistry = require('../lib/DynamicChannelRegistry');
const channelStore = require('../lib/channelStore');
const { buildDynamicChannel } = require('../lib/buildDynamicChannel');

module.exports = {
  listeners: {
    /**
     * @param {GameState} state
     * @returns {function(): Promise<void>}
     */
    startup: state => async() => {
      const registry = new DynamicChannelRegistry();
      const persisted = channelStore.load();

      registry.restore(persisted);

      for (const { name, owner } of persisted) {
        state.ChannelManager.add(buildDynamicChannel(registry, name, owner));
      }

      state.DynamicChannelRegistry = registry;
    },
  },
};
