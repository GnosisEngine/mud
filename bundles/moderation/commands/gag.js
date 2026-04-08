// bundles/communication/commands/gag.js
'use strict';

const { Broadcast, PlayerRoles } = require('ranvier');

const VALID_EFFECTS = new Set(['censored', 'muted', 'raspy', 'outcasted', 'dull']);

module.exports = {
  requiredRole: PlayerRoles.ADMIN,
  usage: 'gag <player> <effect>',
  command: state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      Broadcast.sayAt(player, `Usage: gag <player> <effect>`);
      Broadcast.sayAt(player, `Valid effects: ${[...VALID_EFFECTS].join(', ')}`);
      return;
    }

    const [targetName, effectName] = args.split(/\s+/);

    if (!effectName) {
      Broadcast.sayAt(player, `Usage: gag <player> <effect>`);
      Broadcast.sayAt(player, `Valid effects: ${[...VALID_EFFECTS].join(', ')}`);
      return;
    }

    if (!VALID_EFFECTS.has(effectName)) {
      Broadcast.sayAt(player, `Unknown effect '${effectName}'. Valid effects: ${[...VALID_EFFECTS].join(', ')}`);
      return;
    }

    const target = state.PlayerManager.getPlayer(targetName);

    if (!target) {
      Broadcast.sayAt(player, `No online player found with name '${targetName}'.`);
      return;
    }

    if (target === player) {
      Broadcast.sayAt(player, `You cannot gag yourself.`);
      return;
    }

    if (target.effects.hasEffectType(effectName)) {
      Broadcast.sayAt(player, `${target.name} already has the ${effectName} effect.`);
      return;
    }

    const effect = state.EffectFactory.create(effectName);
    target.addEffect(effect);

    Broadcast.sayAt(player, `You apply the ${effectName} effect to ${target.name}.`);
  },
};