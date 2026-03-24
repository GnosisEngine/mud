'use strict';

const enforcement         = require('../lib/enforcement');
const { applySubmission } = require('./enforce');

module.exports = {
  aliases: [],
  command: state => (args, player) => {
    const pending = enforcement.findThreatAgainst(player.id);

    if (!pending) {
      return player.emit('message', 'Nobody has issued an enforcement demand against you right now.');
    }

    const { enforcerId, meta } = pending;
    const room = player.room;

    const enforcer = [...room.players].find(p => p.id === enforcerId);
    if (!enforcer) {
      enforcement.removeThreat(enforcerId, player.id);
      return player.emit('message', 'The player who threatened you is no longer in the room.');
    }

    enforcement.removeThreat(enforcerId, player.id);

    applySubmission({
      enforcer,
      target:   player,
      room,
      claimId:  meta.claimId,
      roomId:   meta.roomId,
      duration: meta.duration,
    });

    room.emit('message', `${player.name} lowers their head and submits to ${enforcer.name}.`);
  },
};