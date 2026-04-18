'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../../types/ranvier').RanvierCharacter} RanvierCharacter */


const { Broadcast } = require('ranvier');
const {
  isSelf,
  isFollowing,
} = require('../logic');

module.exports = {
  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    if (!args) {
      return Broadcast.sayAt(player, 'Follow whom?');
    }

    /** @type {RanvierCharacter|null} */
    let target;
    if (args === 'self') {
      target = player;
    } else {
      target = /** @type {RanvierCharacter|null} */ (state.getTarget(player, args, ['player']));
      if (!target) {
        return Broadcast.sayAt(player, "You can't find anyone named that.");
      }
    }

    if (isSelf(state, player, { target })) {
      if (isFollowing(state, player)) {
        Broadcast.sayAt(player.following, `${player.name} stops following you.`);
        Broadcast.sayAt(player, `You stop following ${player.following.name}.`);
        player.unfollow();
      } else {
        Broadcast.sayAt(player, "You can't follow yourself...");
      }
      return;
    }

    Broadcast.sayAt(player, `You start following ${target.name}.`);
    Broadcast.sayAt(target, `${player.name} starts following you.`);
    player.follow(target);
  }
};
