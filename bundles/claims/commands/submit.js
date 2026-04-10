'use strict';

const enforcement = require('../lib/enforcement');
const { applySubmission } = require('./enforce');
const { Broadcast } = require('ranvier');
const say = Broadcast.sayAt;

module.exports = {
  aliases: [],
  command: state => (args, player) => {
    const pending = enforcement.findThreatAgainst(player.name);

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
