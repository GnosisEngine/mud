'use strict';

/** @typedef {import('../../types/state').GameState} GameState */
/** @typedef {import('../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../types/ranvier').RanvierExit} RanvierExit */


const sprintf = require('sprintf-js').sprintf;
const LevelUtil = require('../lib/lib/LevelUtil');
const { Broadcast: B, Config, Logger } = require('ranvier');
const { EVENTS, emit } = require('./events');
const {
  hasPendingCommands,
  isIdleKickable,
  hasRoomExit,
  isInCombat,
  isDoorLocked,
  isDoorClosed,
  isFollowerInRoom,
  isNpc,
  isLevelUp,
} = require('./logic');

module.exports = {
  listeners: {
    /**
     * @param {GameState} state
     * @returns {function(): void}
     */
    save: state => /** @this { RanvierPlayer} */ async function(callback) {
      await state.PlayerManager.save(this);
      if (typeof callback === 'function') {
        callback();
      }
    },

    /**
     * @param {GameState} _
     * @returns {function(number): void}
     */
    commandQueued: (_) => /** @this { RanvierPlayer} */ function(commandIndex) {
      const command = this.commandQueue.queue[commandIndex];
      const ttr = sprintf('%.1f', this.commandQueue.getTimeTilRun(commandIndex));
      B.sayAt(this, `<bold><yellow>Executing</yellow> '<white>${command.label}</white>' <yellow>in</yellow> <white>${ttr}</white> <yellow>seconds.</yellow>`);
    },

    /**
     * @param {GameState} state
     * @returns {function(): void}
     */

    updateTick: state => /** @this { RanvierPlayer} */ function() {
      if (hasPendingCommands(state, this)) {
        B.sayAt(this);
        this.commandQueue.execute();
        B.prompt(this);
      }

      const lastCommandTime = this._lastCommandTime || Infinity;
      const timeSinceLastCommand = Date.now() - lastCommandTime;
      const maxIdleTime = (Math.abs(Config.get('maxIdleTime')) * 60000) || Infinity;

      if (isIdleKickable(state, this, { timeSinceLastCommand, maxIdleTime })) {
        this.save(() => {
          B.sayAt(this, `You were kicked for being idle for more than ${maxIdleTime / 60000} minutes!`);
          B.sayAtExcept(this.room, `${this.name} disappears.`, [this]);
          Logger.log(`Kicked ${this.name} for being idle.`);
          state.PlayerManager.removePlayer(this, true);
        });
      }
    },

    /**
     * @param {GameState} state
     * @returns {function({ roomExit: RanvierExit}): void}
     */
    [EVENTS.MOVE]: state => /** @this { RanvierPlayer} */ function({ roomExit }) {
      if (!hasRoomExit(state, this, { roomExit })) {
        return B.sayAt(this, "You can't go that way!");
      }

      if (isInCombat(state, this)) {
        return B.sayAt(this, 'You are in the middle of a fight!');
      }

      const nextRoom = state.RoomManager.getRoom(roomExit.roomId);
      const oldRoom = this.room;
      const door = oldRoom.getDoor(nextRoom) || nextRoom.getDoor(oldRoom);

      if (door) {
        if (isDoorLocked(state, this, { door })) {
          return B.sayAt(this, 'The door is locked.');
        }

        if (isDoorClosed(state, this, { door })) {
          return B.sayAt(this, 'The door is closed.');
        }
      }

      this.moveTo(nextRoom, _ => {
        state.CommandManager.get('look').execute('', this);
      });

      B.sayAt(oldRoom, `${this.name} leaves.`);
      B.sayAtExcept(nextRoom, `${this.name} enters.`, [this]);

      for (const follower of this.followers) {
        if (!isFollowerInRoom(state, this, { follower, room: oldRoom })) {
          continue;
        }

        if (isNpc(state, follower)) {
          follower.moveTo(nextRoom);
        } else {
          B.sayAt(follower, `\r\nYou follow ${this.name} to ${nextRoom.title}.`);
          emit.move(follower, roomExit);
        }
      }
    },

    /**
     * @param {GameState} _
     * @returns {function({ amount: number}): void}
     */
    [EVENTS.EXPERIENCE]: (_) => /** @this { RanvierPlayer} */ function({ amount }) {
      B.sayAt(this, `<blue>You gained <bold>${amount}</bold> experience!</blue>`);

      const totalTnl = LevelUtil.expToLevel(this.level + 1);

      if (isLevelUp(null, this, { amount, totalTnl })) {
        B.sayAt(this, '                                   <bold><blue>!Level Up!</blue></bold>');
        B.sayAt(this, B.progress(80, 100, 'blue'));

        let nextTnl = totalTnl;
        while (isLevelUp(null, this, { amount, totalTnl: nextTnl })) {
          amount = (this.experience + amount) - nextTnl;
          this.level++;
          this.experience = 0;
          nextTnl = LevelUtil.expToLevel(this.level + 1);
          B.sayAt(this, `<blue>You are now level <bold>${this.level}</bold>!</blue>`);
          this.emit(EVENTS.LEVEL);
        }
      }

      this.experience += amount;
      this.save();
    },
  }
};
