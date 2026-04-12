// bundles/vendor-npcs/commands/mercs.js
'use strict';

const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B } = require('ranvier');

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

    if (!entries.length) {
      return B.sayAt(player, 'You have no active mercenary contracts.');
    }

    B.sayAt(player, '.' + B.center(78, 'Active Mercenaries', 'yellow', '-') + '.');

    for (const entry of entries) {
      const statusLabel = STATUS_LABEL[entry.status] || entry.status;
      const now = Date.now();
      const msLeft = Math.max(0, entry.nextUpkeepAt - now);
      const hoursLeft = Math.floor(msLeft / 3600000);
      const minutesLeft = Math.floor((msLeft % 3600000) / 60000);
      const upkeepStr = `${hoursLeft}h ${minutesLeft}m`;

      const targetLabel = entry.targetRoomId
        ? (() => {
          const room = state.RoomManager.getRoom(entry.targetRoomId);
          return room ? room.title || entry.targetRoomId : entry.targetRoomId;
        })()
        : '—';

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
