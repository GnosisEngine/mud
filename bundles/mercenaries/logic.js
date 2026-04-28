'use strict';

/** @typedef {import('types').RanvierCharacter} RanvierCharacter */

const NOOP = {};

module.exports = {

  /** @type {import('types').LogicCheckOptionsOnly<{ target: RanvierCharacter, vendorNpc: RanvierCharacter}>} */
  isVendorTarget: ({ target, vendorNpc }) => {
    return !!target && target === vendorNpc;
  },

  /** @type {import('types').LogicCheckNoOptions} */
  hasEmptyInventory: (_, player) => {
    return !player.inventory || !player.inventory.size;
  },

  /** @type {import('types').LogicCheckOptionsOnly<{}>} */
  hasActiveContract: (_, __, { entries, contractId } = NOOP) => {
    return !!(entries && entries.find(e => e.contractId === contractId));
  },

  /** @type {import('types').LogicCheckOptionsOnly<{}>} */
  isContractRetiring: (_, __, { active } = NOOP) => {
    return active && (active.status === 'RETURNING' || active.status === 'FLEEING');
  },

  /** @type {import('types').LogicCheckOptionsOnly<{}>} */
  hasNoContracts: (_, __, { entries } = NOOP) => {
    return !entries || !entries.length;
  }
};
