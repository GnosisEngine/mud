'use strict';

const Ranvier = require('ranvier');
const B = Ranvier.Broadcast;
const Logger = Ranvier.Logger;

const Combat = require('../lib/Combat');
const { cannotFight, isNpc } = require('../logic');

module.exports = {
  aliases: ['attack', 'slay'],
  command : state => (args, player) => {
    args = args.trim();

    if (!args.length) {
      return B.sayAt(player, 'Kill whom?');
    }

    let target = null;
    try {
      target = Combat.findCombatant(player, args);
    } catch (e) {
      if (cannotFight(state, player, e)) {
        return B.sayAt(player, e.message);
      }

      Logger.error(e.message);
    }

    if (!target) {
      return B.sayAt(player, "They aren't here.");
    }

    B.sayAt(player, `You attack ${target.name}.`);

    player.initiateCombat(target);

    B.sayAtExcept(player.room, `${player.name} attacks ${target.name}!`, [player, target]);

    if (!isNpc(state, target)) {
      B.sayAt(target, `${player.name} attacks you!`);
    }
  }
};
