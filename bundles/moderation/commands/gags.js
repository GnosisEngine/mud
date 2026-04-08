// bundles/communication/commands/gags.js
'use strict';

const { Broadcast, PlayerRoles } = require('ranvier');

module.exports = {
  requiredRole: PlayerRoles.ADMIN,
  usage: 'gags',
  command: state => (args, player) => {
    const rows = [];

    for (const target of state.PlayerManager.getPlayersAsArray()) {
      const commEffects = target.effects.entries().filter(e => Array.isArray(e.config.blockedChannels));

      if (!commEffects.length) {
        continue;
      }

      const effectNames = commEffects.map(e => e.config.type).join(', ');
      rows.push(`  ${target.name.padEnd(20)} ${effectNames}`);
    }

    if (!rows.length) {
      Broadcast.sayAt(player, `No players have active communication effects.`);
      return;
    }

    Broadcast.sayAt(player, `${'Player'.padEnd(20)} Effects`);
    Broadcast.sayAt(player, `${'-'.repeat(20)} ${'-'.repeat(30)}`);
    for (const row of rows) {
      Broadcast.sayAt(player, row);
    }
  },
};