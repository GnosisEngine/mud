'use strict';
const ResourceContainer = require('./lib/ResourceContainer');
const { hasInventorySpace, isPlayerOnline, isSelf } = require('../lib/logic');
const NOOP = {};

module.exports = {
  isValidCategory: (_, __, { category } = NOOP) => {
    return !!category;
  },

  isValidRecipeEntry: (_, __, { entry } = NOOP) => {
    return !!entry;
  },

  hasSufficientResource: (_, player, { key, required } = NOOP) => {
    return ResourceContainer.getAmount(player, key) >= required;
  },

  hasInventorySpace,

  hasResources: (_, player) => {
    return Object.keys(ResourceContainer.getHeld(player)).length > 0;
  },

  isSelf,

  isOnline: isPlayerOnline,

  isTradeResponse: (_, __, { subcommand } = NOOP) => {
    return subcommand === 'accept' || subcommand === 'reject';
  },
};
