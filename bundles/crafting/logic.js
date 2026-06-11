'use strict';

/** @typedef {import('types').LogicCheck} LogicCheck */
/** @typedef {import('types').LogicCheckNoOptions} LogicCheckNoOptions */
/** @typedef {import('types').RanvierCharacter} RanvierCharacter */

const ResourceContainer = require('./lib/ResourceContainer');
const { hasInventorySpace, isPlayerOnline, isSelf } = require('../lib/logic');
const NOOP = {};

module.exports = {
  /** @type {LogicCheck} */
  isValidCategory: (_, __, { category } = NOOP) => {
    return !!category;
  },

  /** @type {LogicCheck} */
  isValidRecipeEntry: (_, __, { entry } = NOOP) => {
    return !!entry;
  },

  /** @type {LogicCheck} */
  hasSufficientResource: (_, player, { key, required } = NOOP) => {
    return ResourceContainer.getAmount(player, key) >= required;
  },

  /** @type {LogicCheckNoOptions} */
  hasInventorySpace,

  /** @type {LogicCheck} */
  hasResources: (_, player) => {
    return Object.keys(ResourceContainer.getHeld(player)).length > 0;
  },

  /** @type {import('types').LogicCheck<{ target: RanvierCharacter }>} */
  isSelf,

  /** @type {import('types').LogicCheck<{ targetName: string }>} */
  isOnline: isPlayerOnline,

  /** @type {LogicCheck} */
  isTradeResponse: (_, __, { subcommand } = NOOP) => {
    return subcommand === 'accept' || subcommand === 'reject';
  },
};
