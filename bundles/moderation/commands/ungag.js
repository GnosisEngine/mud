// bundles/communication/commands/ungag.js
'use strict';

const { Broadcast } = require('ranvier');
const {
  isAdmin,
  hasNoArgs,
  isOnline,
  hasCommEffects,
} = require('../logic');

module.exports = {
  requiredRole: require('ranvier').PlayerRoles.ADMIN,
  usage: 'ungag <player> [effect]',
  command: state => (args, player) => {
    if (!isAdmin(state, player)) {
      return Broadcast.sayAt(player, 'You do not have permission to use this command.');
    }

    args = args.trim();

    if (hasNoArgs(state, player, { args })) {
      Broadcast.sayAt(player, 'Usage: ungag <player> [effect]');
      return;
    }

    const [targetName, effectName] = args.split(/\s+/);

    if (!isOnline(state, player, { targetName })) {
      Broadcast.sayAt(player, `No online player found with name '${targetName}'.`);
      return;
    }

    const target = state.PlayerManager.getPlayer(targetName);

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

    if (!hasCommEffects(state, player, { target })) {
      Broadcast.sayAt(player, `${target.name} has no active communication effects.`);
      return;
    }

    for (const effect of target.effects.entries().filter(e => Array.isArray(e.config.blockedChannels))) {
      effect.remove();
    }

    Broadcast.sayAt(player, `Removed all communication effects from ${target.name}.`);
  },
};
