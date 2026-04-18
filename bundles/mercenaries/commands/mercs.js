// bundles/vendor-npcs/commands/mercs.js
'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B } = require('ranvier');
const {
  hasNoContracts,
} = require('../logic');

const STATUS_LABEL = {
  EN_ROUTE:  'En route',
  STATIONED: 'Stationed',
  RETURNING: 'Returning home',
  FLEEING:   'Fleeing',
};

module.exports = {
  usage: 'mercs',
  aliases: ['mercenaries'],
  command: state => (_args, player) => {
    const entries = state.MercenaryService.getContractsByPlayer(player.name);

    if (hasNoContracts(state, player, { entries })) {
      return B.sayAt(player, 'You have no active mercenary contracts.');
    }

    B.sayAt(player, '.' + B.center(78, 'Active Mercenaries', 'yellow', '-') + '.');

    for (const entry of entries) {
      let upkeepStr;
      let statusLabel;
      let targetLabel;

      if (entry) {
        // Merc exists
        const msLeft = Math.max(0, entry.nextUpkeepAt - Date.now());
        const hoursLeft = Math.floor(msLeft / 3600000);
        const minutesLeft = Math.floor((msLeft % 3600000) / 60000);
        upkeepStr = `${hoursLeft}h ${minutesLeft}m`;
        statusLabel = (STATUS_LABEL[entry.status] || entry.status);

        if (!entry.targetRoomId) {
          // Merc home unknown
          targetLabel = '—';
        } else {
          // Merc home known
          const room = state.RoomManager.getRoom(entry.targetRoomId);
          targetLabel = room
            ? (room.title || entry.targetRoomId)
            : entry.targetRoomId;
        }
      } else {
        // No merc
        upkeepStr = '—';
        targetLabel = '—';
      }

      B.sayAt(player,
        '<yellow>|</yellow> ' +
        sprintf('<b><white>%-20s</white></b>', entry.mercName) +
        sprintf(' %-14s', statusLabel) +
        sprintf(' %-28s', targetLabel.slice(0, 28)) +
        sprintf(' <yellow>%6s</yellow>', upkeepStr) +
        ' <yellow>|</yellow>'
      );
    }

    B.sayAt(player, "'" + B.line(78, '-', 'yellow') + "'");
    B.sayAt(player, sprintf(
      '  <white>%d</white> of <white>%d</white> claim slots garrisoned.',
      entries.length,
      (state.StorageManager.store.getClaimsByOwner(player.name)).length
    ));
  },
};
