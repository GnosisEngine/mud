'use strict';
const NOOP = {};

module.exports = {
  isVendorTarget: (_, __, { target, vendorNpc } = NOOP) => {
    return !!target && target === vendorNpc;
  },

  hasEmptyInventory: (_, player) => {
    return !player.inventory || !player.inventory.size;
  },

  findContractInInventory: (_, player, { query } = NOOP) => {
    for (const [, item] of player.inventory) {
      const contract = item.getMeta ? item.getMeta('contract') : null;
      if (!contract || !contract.contractId) continue;
      if (contract.mercName && contract.mercName.toLowerCase().includes(query)) {
        return { contractId: contract.contractId, mercName: contract.mercName };
      }
    }
    return null;
  },

  hasActiveContract: (_, __, { entries, contractId } = NOOP) => {
    return !!(entries && entries.find(e => e.contractId === contractId));
  },

  isContractRetiring: (_, __, { active } = NOOP) => {
    return active && (active.status === 'RETURNING' || active.status === 'FLEEING');
  },

  hasNoContracts: (_, __, { entries } = NOOP) => {
    return !entries || !entries.length;
  }
};
