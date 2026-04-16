'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

const Ranvier = require('ranvier');
const { Broadcast } = Ranvier;

module.exports = {
  /**
   * @param {GameState} _
   * @returns {function(string, RanvierPlayer): void}
   */
  command : (_) => (args, player) => {
    const previousPvpSetting = player.getMeta('pvp') || false;
    const newPvpSetting = !previousPvpSetting;
    player.setMeta('pvp', newPvpSetting);

    const message = newPvpSetting ?
      'You are now able to enter into player-on-player duels.' :
      'You are now a pacifist and cannot enter player-on-player duels.';
    Broadcast.sayAt(player, message);
  }
};
