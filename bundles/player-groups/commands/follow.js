'use strict';

const { Broadcast } = require('ranvier');
const {
  isSelf,
  isFollowing,
} = require('../logic');

module.exports = {
  command: state => (args, player) => {
    if (!args) {
      return Broadcast.sayAt(player, 'Follow whom?');
    }

    let target;
    if (args === 'self') {
      target = player;
    } else {
      target = state.getTarget(player.room, args, ['player']);
      if (!target) {
        return Broadcast.sayAt(player, "You can't find anyone named that.");
      }
    }

    // if (!target) {
    //   if (arg === 'self') {
    //     target = player;
    //   } else {
    //     return Broadcast.sayAt(player, "You can't find anyone named that.");
    //   }
    // }

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
