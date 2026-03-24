'use strict';

// const store       = require('../lib/store');
const enforcement = require('../lib/enforcement');

const RESPONSE_WINDOW_MS   = 60 * 1000;
const MAX_DURATION_MINUTES = 60;

module.exports = {
  aliases: ['threaten'],
  command: state => (args, player) => {
    const parts = (args || '').trim().split(/\s+/);
    const [targetName, durationStr] = parts;
    const { store } = state.StorageManager

    if (!targetName || !durationStr) {
      return player.emit('message', 'Usage: enforce <playerName> <durationMinutes 1–60>');
    }

    const room   = player.room;
    const roomId = room.entityReference;
    const claim  = store.getClaimByRoom(roomId);

    if (!claim || claim.ownerId !== player.id) {
      return player.emit('message', 'You do not hold a claim on this room.');
    }

    const duration = parseInt(durationStr, 10);
    if (isNaN(duration) || duration < 1 || duration > MAX_DURATION_MINUTES) {
      return player.emit('message', `Submission duration must be between 1 and ${MAX_DURATION_MINUTES} minutes.`);
    }

    // Find target by name in current room
    const target = [...room.players].find(
      p => p.name.toLowerCase() === targetName.toLowerCase() && p !== player
    );
    if (!target) return player.emit('message', `${targetName} is not in this room.`);

    if (enforcement.hasThreat(player.id, target.id)) {
      return player.emit('message', `You already have an active enforcement demand against ${target.name}.`);
    }
    if (enforcement.isSubmittedTo(target.id, player.id)) {
      return player.emit('message', `${target.name} is already submitted to you.`);
    }

    room.emit('message', `${player.name} rounds on ${target.name}. "Submit for ${duration} minutes — or face the consequences." (${target.name} has 60 seconds to respond or will submit automatically.)`);

    target.emit('enforce:received', {
      enforcerId:   player.id,
      enforcerName: player.name,
      roomId,
      claimId:      claim.id,
      duration,
    });

    const meta = { enforcerId: player.id, enforcerName: player.name, claimId: claim.id, roomId, duration };

    const timeoutHandle = setTimeout(() => {
      enforcement.removeThreat(player.id, target.id);
      applySubmission({ enforcer: player, target, room, claimId: claim.id, roomId, duration });
      room.emit('message', `${target.name} did not respond — and is now subject to ${player.name}'s terms.`);
    }, RESPONSE_WINDOW_MS);

    enforcement.addThreat(player.id, target.id, meta, timeoutHandle);
    player.emit('message', `Enforcement demand issued to ${target.name}. ${duration}-minute submission. They have 60 seconds to respond or submit automatically.`);
  },
};

function applySubmission({ enforcer, target, room, claimId, roomId, duration }) {
  enforcement.removeSubmission(target.id);

  const expiryHandle = setTimeout(() => {
    enforcement.removeSubmission(target.id);
    target.emit('message',   `Your submission to ${enforcer.name} has ended.`);
    enforcer.emit('message', `${target.name}'s submission to you has ended.`);
  }, duration * 60 * 1000);

  enforcement.addSubmission(target.id, {
    enforcerId:    enforcer.id,
    enforcerName:  enforcer.name,
    claimId,
    roomId,
    duration,
    endsAt:        Date.now() + duration * 60 * 1000,
    timeoutHandle: expiryHandle,
  });

  target.emit('message',   `You are now submitted to ${enforcer.name} for ${duration} minutes. Tax is collected automatically.`);
  enforcer.emit('message', `${target.name} is now submitted to you for ${duration} minutes.`);
}

module.exports.applySubmission = applySubmission;