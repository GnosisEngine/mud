'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

const { Random } = require('rando-js');
const { Broadcast } = require('ranvier');
const { CommandParser } = require('../../lib/lib/CommandParser');
const { emit: playerEmit } = require('../../player-events/events');
const {
  roomExists,
  isDoorImpassable,
  isInCombat
} = require('../logic');

const say = Broadcast.sayAt;

module.exports = {
  usage: 'flee [direction]',

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (direction, player) => {
    if (!isInCombat(state, player)) {
      return say(player, 'You jump at the sight of your own shadow.');
    }


    let roomExit = null;
    if (direction) {
      roomExit = CommandParser.canGo(player, direction);
    } else {
      roomExit = Random.fromArray(player.room.getExits());
    }

    const randomRoom = state.RoomManager.getRoom(roomExit.roomId);

    if (!roomExists(state, player, { room: randomRoom })) {
      say(player, "You can't find anywhere to run!");
      return;
    }


    const door = player.room.getDoor(randomRoom) || randomRoom.getDoor(player.room);
    if (randomRoom && isDoorImpassable(state, player, { door })) {
      say(player, 'In your panic you run into a closed door!');
      return;
    }

    say(player, 'You cowardly flee from the battle!');

    player.removeFromCombat();
    playerEmit.move(player, roomExit);
  }
};
