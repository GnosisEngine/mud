'use strict';
const NOOP = {};

const STATUS_LABEL = {
  EN_ROUTE:  'En route',
  STATIONED: 'Stationed',
  RETURNING: 'Returning home',
  FLEEING:   'Fleeing',
};

module.exports = {
  hasNoArgs: (_, __, { args } = NOOP) => {
    return !args || !args.trim().length;
  },

  getMercVendorInRoom: (_, player) => {
    return Array.from(player.room.npcs).find(npc => npc.getMeta('mercenary')) || null;
  },

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
  },

  getStatusLabel: (_, __, { entry } = NOOP) => {
    return entry && (STATUS_LABEL[entry.status] || entry.status);
  },

  formatUpkeep: (_, __, { entry } = NOOP) => {
    if (!entry) return '—';
    const msLeft = Math.max(0, entry.nextUpkeepAt - Date.now());
    const hoursLeft = Math.floor(msLeft / 3600000);
    const minutesLeft = Math.floor((msLeft % 3600000) / 60000);
    return `${hoursLeft}h ${minutesLeft}m`;
  },

  getTargetLabel: (state, __, { entry } = NOOP) => {
    if (!entry || !entry.targetRoomId) return '—';
    const room = state.RoomManager.getRoom(entry.targetRoomId);
    return room ? (room.title || entry.targetRoomId) : entry.targetRoomId;
  },
};
