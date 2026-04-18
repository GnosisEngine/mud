'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../../types/ranvier').RanvierQuest} RanvierQuest */

const { QuestReward } = require('ranvier');
const { emit: questsEmit } = require('../events');

/**
 * Quest reward that gives experience
 *
 * Config options:
 *   currency: string, required, currency to award
 *   amount: number, required
 */
module.exports = class CurrencyReward extends QuestReward {
  /**
   * @param {GameState} GameState
   * @param {RanvierQuest} quest
   * @param {Record<string, any>} config
   * @param {RanvierPlayer} player
   */
  static reward(GameState, quest, config, player) {
    const amount = this._getAmount(quest, config);
    questsEmit.currency(player, config.currency, amount);
  }

  /**
   * @param {GameState} GameState
   * @param {RanvierQuest} quest
   * @param {Record<string, any>} config
   */
  static display(GameState, quest, config) {
    const amount = this._getAmount(quest, config);
    const friendlyName = config.currency.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    return `Currency: <b>${amount}</b> x <b><white>[${friendlyName}]</white></b>`;
  }

  /**
   * @param {RanvierQuest} quest
   * @param {Record<string, any>} config
   */
  static _getAmount(quest, config) {
    config = Object.assign({
      amount: 0,
      currency: null,
    }, config);

    if (!config.currency) {
      throw new Error(`Quest [${quest.id}] currency reward has invalid configuration`);
    }

    return config.amount;
  }
};
