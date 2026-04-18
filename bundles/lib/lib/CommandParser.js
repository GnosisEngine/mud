'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../../types/ranvier').RanvierExit} RanvierExit */

const { CommandType, Room } = require('ranvier');

/**
 * Interpreter.. you guessed it, interprets command input
 */
class CommandParser {
  /**
   * Parse a given string to find the resulting command/arguments
   * @param {GameState} state
   * @param {string} data
   * @param {RanvierPlayer} player
   * @return {{
   *   type: symbol,
   *   command?: any,
   *   skill?: any,
   *   channel?: any,
   *   args: string,
   *   originalCommand?: string
   *   roomExit?: RanvierExit | false
   * }}
   */
  static parse(state, data, player) {
    data = data.trim();

    const parts = data.split(' ');

    const command = parts.shift().toLowerCase();
    if (!command.length) {
      throw new InvalidCommandError();
    }

    const args = parts.join(' ');

    // Kludge so that 'l' alone will always force a look,
    // instead of mixing it up with lock or list.
    // TODO: replace this a priority list
    if (command === 'l') {
      return {
        type: CommandType.COMMAND,
        command: state.CommandManager.get('look'),
        args: args
      };
    }

    // Same with 'i' and inventory.
    if (command === 'i') {
      return {
        type: CommandType.COMMAND,
        command: state.CommandManager.get('inventory'),
        args: args
      };
    }

    // see if they matched a direction for a movement command
    const roomDirection = this.checkMovement(player, command);

    if (roomDirection) {
      const roomExit = this.canGo(player, roomDirection);

      return {
        type: CommandType.MOVEMENT,
        args,
        originalCommand: command,
        roomExit,
      };
    }

    // see if they matched exactly a command
    if (state.CommandManager.get(command)) {
      return {
        type: CommandType.COMMAND,
        command: state.CommandManager.get(command),
        args,
        originalCommand: command
      };
    }

    // see if they typed at least the beginning of a command and try to match
    let found = state.CommandManager.find(command, /* returnAlias: */ true);
    if (found) {
      return {
        type: CommandType.COMMAND,
        command: found.command,
        args,
        originalCommand: found.alias
      };
    }

    // check channels
    found = state.ChannelManager.find(command);
    if (found) {
      return {
        type: CommandType.CHANNEL,
        channel: found,
        args
      };
    }

    // finally check skills
    found = state.SkillManager.find(command);
    if (found) {
      return {
        type: CommandType.SKILL,
        skill: found,
        args
      };
    }

    throw new InvalidCommandError();
  }

  /**
   * Check command for partial match on primary directions, or exact match on secondary name or abbreviation
   * @param {RanvierPlayer} player
   * @param {string} command
   * @return {?string}
   */
  static checkMovement(player, command)
  {
    if (!player.room || !(player.room instanceof Room)) {
      return null;
    }

    const primaryDirections = ['north', 'south', 'east', 'west', 'up', 'down'];

    for (const direction of primaryDirections) {
      if (direction.indexOf(command) === 0) {
        return direction;
      }
    }

    const secondaryDirections = [
      { abbr: 'ne', name: 'northeast' },
      { abbr: 'nw', name: 'northwest' },
      { abbr: 'se', name: 'southeast' },
      { abbr: 'sw', name: 'southwest' }
    ];

    for (const direction of secondaryDirections) {
      if (direction.abbr === command || direction.name.indexOf(command) === 0) {
        return direction.name;
      }
    }

    const otherExit = player.room.getExits().find(roomExit => roomExit.direction === command);

    return otherExit ? otherExit.direction : null;
  }

  /**
   * Determine if a player can leave the current room to a given direction
   * @param {RanvierPlayer} player
   * @param {string} direction
   * @return {RanvierExit|false}
   */
  static canGo(player, direction)
  {
    if (!player.room) {
      return false;
    }

    return player.room.getExits().find(roomExit => roomExit.direction === direction) || false;
  }
}
exports.CommandParser = CommandParser;

/**
 * Used when the player enters a bad command
 * @extends Error
 */
class InvalidCommandError extends Error {}
/**
 * Used when the player tries a command they don't have access to
 * @extends Error
 */
class RestrictedCommandError extends Error {}
exports.InvalidCommandError = InvalidCommandError;
exports.RestrictedCommandError = RestrictedCommandError;
