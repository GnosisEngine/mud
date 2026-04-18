'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../../types/ranvier').RanvierQuest} RanvierQuest */

const { QuestReward } = require('ranvier');
const LevelUtil = require('../../lib/lib/LevelUtil');
const { emit: playerEmit } = require('../../player-events/events');

/**
 * Quest reward that gives experience
 *
 * Config options:
 *   amount: number, default: 0, Either a static amount or a multipler to use for leveledTo
 *   leveledTo: "PLAYER"|"QUEST", default: null, If set scale the amount to either the quest's or player's level
 *
 * Examples:
 *
 *   Gives equivalent to 5 times mob xp for a mob of the quests level
 *     amount: 5
 *     leveledTo: quest
 *
 *   Gives a static 500 xp
 *     amount: 500
 */
module.exports = class ExperienceReward extends QuestReward {
  /**
   * @param {GameState} GameState
   * @param {RanvierQuest} quest
   * @param {Record<string, any>} config
   * @param {RanvierPlayer} player
   */
  static reward(GameState, quest, config, player) {
    const amount = this._getAmount(quest, config, player);
    playerEmit.experience(player, amount);
  }

  /**
   * @param {GameState} GameState
   * @param {RanvierQuest} quest
   * @param {Record<string, any>} config
   */
  static display(GameState, quest, config, player) {
    const amount = this._getAmount(quest, config, player);
    return `Experience: <b>${amount}</b>`;
  }

  /**
   * @param {RanvierQuest} quest
   * @param {Record<string, any>} config
   */
  static _getAmount(quest, config, player) {
    config = Object.assign({
      amount: 0,
      leveledTo: null,
    }, config);

    let amount = config.amount;
    if (config.leveledTo) {
      const level = config.leveledTo === 'PLAYER' ? player.level : quest.config.level;
      amount = LevelUtil.mobExp(level) * amount;
    }

    return amount;
  }
};
