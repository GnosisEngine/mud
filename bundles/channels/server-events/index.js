// bundles/channels/server-events/index.js
'use strict';

/** @typedef {import('types').GameState} GameState */

const path = require('path');
const DynamicChannelRegistry = require('../lib/DynamicChannelRegistry');
const channelStore = require('../lib/channelStore');
const MessageStore = require('../lib/messageStore');
const { buildDynamicChannel } = require('../lib/buildDynamicChannel');
const startupPoll = require('../../lib/lib/StartupPoll');

module.exports = {
  listeners: {
    /**
     * @param {GameState} state
     * @returns {function(): Promise<void>}
     */
    startup: state => async() => {
      await startupPoll(
        () => !!state.Storage,
        async() => {
          const channelPath = path.join(state.Storage.namespaceDir('channels'), 'dynamic-channels.json');
          channelStore.configure(channelPath);

          const messageStore = await MessageStore.create(state);
          state.ChannelMessageStore = messageStore;

          const registry = new DynamicChannelRegistry();
          const persisted = channelStore.load();

          registry.restore(persisted);

          for (const { name, owner } of persisted) {
            state.ChannelManager.add(buildDynamicChannel(registry, name, owner, messageStore));
          }

          state.DynamicChannelRegistry = registry;
        }
      );
    },
  },
};
