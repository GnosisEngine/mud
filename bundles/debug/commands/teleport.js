'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

const { Broadcast, PlayerRoles } = require('ranvier');
const {
  isAdmin,
  isRoomReference,
  isAlreadyHere,
  isInCombat,
} = require('../logic');

module.exports = {
  aliases: ['tp'],
  usage: 'teleport <player/room>',
  requiredRole: PlayerRoles.ADMIN,

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    if (!isAdmin(state, player)) {
      return Broadcast.sayAt(player, 'You do not have permission to use this command.');
    }

    if (!args) {
      return Broadcast.sayAt(player, 'Must specify a destination using an online player or room entity reference.');
    }

    const target = args;
    let targetRoom = null;

    if (isRoomReference(state, player, { target })) {
      targetRoom = state.RoomManager.getRoom(target);
      if (!targetRoom) {
        return Broadcast.sayAt(player, 'No such room entity reference exists.');
      }
      if (isAlreadyHere(state, player, { targetRoom })) {
        return Broadcast.sayAt(player, "You try really hard to teleport before realizing you're already at your destination.");
      }
    } else {
      const targetPlayer = state.PlayerManager.getPlayer(target);
      if (!targetPlayer) {
        return Broadcast.sayAt(player, 'No such player online.');
      }
      if (isAlreadyHere(state, player, { targetRoom: targetPlayer.room })) {
        return Broadcast.sayAt(player, "You try really hard to teleport before realizing you're already at your destination.");
      }
      targetRoom = targetPlayer.room;
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

    if (!targetRoom || !oldRoom) {
      throw new RangeError('Rooms are missing!');
    }

    player.moveTo(targetRoom, () => {
      const look = state.CommandManager.get('look');

      if (look) {
        Broadcast.sayAt(player, '<b><green>You snap your finger and instantly appear in a new room.</green></b>\r\n');
        look.execute('', player);
      }
    });

    Broadcast.sayAt(oldRoom, `${player.name} teleported away.`);
    Broadcast.sayAtExcept(targetRoom, `${player.name} teleported here.`, [player]);
  }
};
