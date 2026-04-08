// bundles/communication/commands/ungag.js
'use strict';

const { Broadcast, PlayerRoles } = require('ranvier');

module.exports = {
  requiredRole: PlayerRoles.ADMIN,
  usage: 'ungag <player> [effect]',
  command: state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      Broadcast.sayAt(player, `Usage: ungag <player> [effect]`);
      return;
    }

    const [targetName, effectName] = args.split(/\s+/);

    const target = state.PlayerManager.getPlayer(targetName);

    if (!target) {
      Broadcast.sayAt(player, `No online player found with name '${targetName}'.`);
      return;
    }

    if (effectName) {
      const effect = target.effects.getByType(effectName);

      if (!effect) {
        Broadcast.sayAt(player, `${target.name} does not have the ${effectName} effect.`);
        return;
      }

      effect.remove();
      Broadcast.sayAt(player, `Removed ${effectName} from ${target.name}.`);
      return;
    }

    const commEffects = target.effects.entries().filter(e => Array.isArray(e.config.blockedChannels));

    if (!commEffects.length) {
      Broadcast.sayAt(player, `${target.name} has no active communication effects.`);
      return;
    }

    for (const effect of commEffects) {
      effect.remove();
    }

    Broadcast.sayAt(player, `Removed all communication effects from ${target.name}.`);
  },
};