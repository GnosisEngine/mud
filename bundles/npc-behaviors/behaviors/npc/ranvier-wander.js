'use strict';

/** @typedef {import('../../../../types/state').GameState} GameState */
/** @typedef {import('../../../../types/ranvier').RanvierNpc} RanvierNpc */

const { Random } = require('rando-js');
const { Broadcast, Logger } = require('ranvier');
const {
  isInCombat,
  isWanderReady,
  hasExits,
  isDoorPassable,
  isRoomAllowed,
} = require('../../logic');

module.exports = {
  listeners: {
    /**
     * @param {GameState} state
     * @returns {function(WanderBehaviorConfig|true): void}
     */
    updateTick: state => /** @this {RanvierNpc} */ function(config) {
      if (isInCombat(state, this) || !this.room) {
        return;
      }

      if (config === true) {
        config = {};
      }

      config = Object.assign({
        areaRestricted: false,
        restrictTo: null,
        interval: 20,
      }, config);

      if (!this._lastWanderTime) {
        this._lastWanderTime = Date.now();
      }

      if (!isWanderReady(state, this, { interval: config.interval })) {
        return;
      }

      this._lastWanderTime = Date.now();

      const exits = this.room.getExits();
      if (!hasExits(state, this, { exits })) {
        return;
      }

      const roomExit = Random.fromArray(exits);
      const randomRoom = state.RoomManager.getRoom(roomExit.roomId);
      const door = this.room.getDoor(randomRoom) || (randomRoom && randomRoom.getDoor(this.room));

      if (!isDoorPassable(state, this, { door })) {
        Logger.verbose(`NPC [${this.uuid}] wander blocked by door.`);
        return;
      }

      if (!isRoomAllowed(state, this, { config, randomRoom })) {
        return;
      }

      Logger.verbose(`NPC [${this.uuid}] wandering from ${this.room.entityReference} to ${randomRoom.entityReference}.`);
      Broadcast.sayAt(this.room, `${this.name} wanders ${roomExit.direction}.`);
      this.moveTo(randomRoom);
    }
  }
};
