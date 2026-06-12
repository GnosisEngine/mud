// bundles/recall/commands/recall.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

const { Broadcast } = require('ranvier');
const { hasRecallPoint } = require('../logic');
const { isAlreadyHere, isInCombat } = require('../../debug/logic');

module.exports = {
  usage: 'recall [label]',

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    const recallPoints = player.metadata.recallPoints || {};
    const labels = Object.keys(recallPoints);

    if (!args.trim()) {
      if (!labels.length) {
        return Broadcast.sayAt(player, 'You have nowhere to recall to.');
      }

      Broadcast.sayAt(player, 'You can recall to:');
      for (const label of labels) {
        const room = state.RoomManager.getRoom(recallPoints[label]);
        Broadcast.sayAt(player, `  ${label} - ${room ? room.title : recallPoints[label]}`);
      }
      return;
    }

    const label = args.trim().toLowerCase();

    if (!hasRecallPoint(state, player, { label })) {
      return Broadcast.sayAt(player, `You have no recall point named '${label}'.`);
    }

    const targetRoom = state.RoomManager.getRoom(recallPoints[label]);

    if (!targetRoom) {
      return Broadcast.sayAt(player, 'That place no longer exists.');
    }

    if (isAlreadyHere(state, player, { targetRoom })) {
      return Broadcast.sayAt(player, "You're already there.");
    }

    player.followers.forEach(follower => {
      follower.unfollow();
      if (!follower.isNpc) {
        Broadcast.sayAt(follower, `You stop following ${player.name}.`);
      }
    });

    if (isInCombat(state, player)) {
      player.removeFromCombat();
    }

    const oldRoom = player.room;

    if (!oldRoom) {
      throw new RangeError('Player has no room!');
    }

    player.moveTo(targetRoom, () => {
      const look = state.CommandManager.get('look');

      if (look) {
        Broadcast.sayAt(player, '<b><cyan>The world blurs and reshapes itself around you.</cyan></b>\r\n');
        look.execute('', player);
      }
    });

    Broadcast.sayAt(oldRoom, `${player.name} fades away in a blur of motion.`);
    Broadcast.sayAtExcept(targetRoom, `${player.name} appears in a blur of motion.`, [player]);
  }
};
