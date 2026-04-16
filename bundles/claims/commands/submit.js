'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

const enforcement = require('../lib/enforcement');
const { applySubmission } = require('./enforce');
const { Broadcast } = require('ranvier');
const { isThreatened } = require('../logic');
const say = Broadcast.sayAt;

module.exports = {
  aliases: [],

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    const pending = isThreatened(state, player);

    if (!pending) {
      return say(player,  'Nobody has issued an enforcement demand against you right now.');
    }

    const { enforcerId, meta } = pending;

    const enforcer = state.PlayerManager.getPlayer(enforcerId);

    enforcement.removeThreat(enforcerId, player.name);

    applySubmission({
      enforcer,
      target: player,
      room: player.room,
      claimId: meta.claimId,
      roomId: meta.roomId,
      duration: meta.duration,
    });
  },
};
