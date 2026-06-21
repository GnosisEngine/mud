// bundles/channels/logic.js
'use strict';

/** @typedef {import('types').LogicCheck} LogicCheck */

const NOOP = {};
const CHANNEL_NAME_PATTERN = /^[a-z][a-z0-9_-]{1,15}$/;

module.exports = {
  /** @type {import('types').LogicCheck} */
  isValidChannelName: (_, __, { name } = NOOP) => {
    return !!(name && CHANNEL_NAME_PATTERN.test(name));
  },

  /** @type {import('types').LogicCheck} */
  isChannelNameAvailable: (state, __, { name } = NOOP) => {
    return !state.CommandManager.get(name)
      && !state.CommandManager.find(name)
      && !state.ChannelManager.find(name);
  },

  /** @type {import('types').LogicCheck} */
  isDynamicChannel: (state, __, { name } = NOOP) => {
    return state.DynamicChannelRegistry.has(name);
  },

  /** @type {import('types').LogicCheck} */
  isChannelMember: (state, player, { name } = NOOP) => {
    return state.DynamicChannelRegistry.isMember(name, player.name);
  },

  /** @type {import('types').LogicCheck} */
  isChannelPersistent: (state, __, { name } = NOOP) => {
    return state.DynamicChannelRegistry.isPersistent(name);
  },
};
