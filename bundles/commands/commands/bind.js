// bundles/recall/commands/bind.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

const { Broadcast, PlayerRoles } = require('ranvier');
const Parser = require('../../lib/lib/ArgParser');
const { isAdmin } = require('../../lib/logic');
const { isRoomReference } = require('../../debug/logic');

module.exports = {
  usage: 'bind <player> <label> [room reference]',
  requiredRole: PlayerRoles.ADMIN,

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    if (!isAdmin(state, player)) {
      return Broadcast.sayAt(player, 'You do not have permission to use this command.');
    }

    const [targetName, rawLabel, roomRef] = args.trim().split(/\s+/);

    if (!targetName || !rawLabel) {
      return Broadcast.sayAt(player, `Usage: ${module.exports.usage}`);
    }

    if (!player.room) {
      throw new RangeError('Player not in room!');
    }

    const target = Parser.parseDot(targetName, player.room.players);

    if (!target) {
      return Broadcast.sayAt(player, 'They are not here.');
    }

    const label = rawLabel.toLowerCase();
    let destination;

    if (roomRef) {
      if (!isRoomReference(state, player, { target: roomRef })) {
        return Broadcast.sayAt(player, 'That is not a valid room reference.');
      }

      if (!state.RoomManager.getRoom(roomRef)) {
        return Broadcast.sayAt(player, 'No such room entity reference exists.');
      }

      destination = roomRef;
    } else {
      destination = player.room.entityReference;
    }

    target.metadata.recallPoints = target.metadata.recallPoints || {};
    target.metadata.recallPoints[label] = destination;

    Broadcast.sayAt(player, `${target.name} can now recall to '${label}'.`);
    Broadcast.sayAt(target, `${player.name} grants you the ability to recall to '${label}'.`);
  }
};
