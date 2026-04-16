'use strict';
const ResourceContainer = require('./lib/ResourceContainer');
const NOOP = {};

module.exports = {
  hasNoArgs: (_, __, { args } = NOOP) => {
    return !args || !args.length;
  },

  isValidCategory: (_, __, { category } = NOOP) => {
    return !!category;
  },

  isValidRecipeEntry: (_, __, { entry } = NOOP) => {
    return !!entry;
  },

  hasSufficientResource: (_, player, { key, required } = NOOP) => {
    return ResourceContainer.getAmount(player, key) >= required;
  },

  hasInventorySpace: (_, player) => {
    return !player.isInventoryFull();
  },

  hasResources: (_, player) => {
    return Object.keys(ResourceContainer.getHeld(player)).length > 0;
  },

  isSelf: (_, player, { target } = NOOP) => {
    return target === player;
  },

  isOnline: (state, __, { targetName } = NOOP) => {
    return !!state.PlayerManager.getPlayer(targetName);
  },

  isTradeResponse: (_, __, { subcommand } = NOOP) => {
    return subcommand === 'accept' || subcommand === 'reject';
  },
};
