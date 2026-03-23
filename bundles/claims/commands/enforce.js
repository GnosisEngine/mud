'use strict';

const store = require('../lib/store');

/**
 * enforce <playerName> <durationMinutes>
 *
 * Issues a submission demand to a player in the same room.
 * The target has 60 seconds to respond: submit, fight, or flee.
 *
 * Rules from the design doc:
 *   - Max submission duration: 60 minutes
 *   - One active threat per target at a time
 *   - You must own a claim on the current room to enforce
 *   - Target must be in the same room
 *
 * Submission acceptance, combat, and flee are handled by separate
 * command / event handlers — this command only issues the demand and
 * starts the 60-second response timer.
 */

// Track active threats in memory: Map<enforcerId, Map<targetId, timeoutHandle>>
const activeThreats = new Map();

const RESPONSE_WINDOW_MS  = 60 * 1000;   // 60 seconds to respond
const MAX_DURATION_MINUTES = 60;

module.exports = {
  name: 'enforce',
  aliases: ['threaten'],

  execute(args, { player, room }) {
    const parts = (args || '').trim().split(/\s+/);
    const [targetName, durationStr] = parts;

    if (!targetName || !durationStr) {
      return player.emit('message', 'Usage: enforce <playerName> <durationMinutes 1–60>');
    }

    // Must hold a claim on this room
    const roomId = room.entityReference;
    const claim  = store.getClaimByRoom(roomId);

    if (!claim || claim.ownerId !== player.id) {
      return player.emit('message', 'You do not hold a claim on this room.');
    }

    // Parse duration
    const duration = parseInt(durationStr, 10);
    if (isNaN(duration) || duration < 1 || duration > MAX_DURATION_MINUTES) {
      return player.emit('message', `Submission duration must be between 1 and ${MAX_DURATION_MINUTES} minutes.`);
    }

    // Find target in room
    const target = room.playerInRoom ? room.playerInRoom(targetName) : null;
    if (!target) {
      return player.emit('message', `${targetName} is not in this room.`);
    }
    if (target.id === player.id) {
      return player.emit('message', `You cannot enforce against yourself.`);
    }

    // One active threat per target per enforcer
    if (!activeThreats.has(player.id)) {
      activeThreats.set(player.id, new Map());
    }
    const myThreats = activeThreats.get(player.id);

    if (myThreats.has(target.id)) {
      return player.emit('message', `You already have an active enforcement demand against ${target.name}.`);
    }

    // Announce to the room
    room.emit('message', `${player.name} fixes ${target.name} with a hard stare. "Submit for ${duration} minutes — or face the consequences." (${target.name} has 60 seconds to respond.)`);

    // Emit the threat event to the target so their client / other handlers can act
    target.emit('enforce:received', {
      enforcerId:   player.id,
      enforcerName: player.name,
      roomId,
      claimId:      claim.id,
      duration,     // minutes
    });

    // Response timer — 60 seconds
    const timeout = setTimeout(() => {
      myThreats.delete(target.id);

      // Only notify if both are still in the room
      if (room.playerInRoom && room.playerInRoom(target.name)) {
        player.emit('message', `${target.name} did not respond to your enforcement demand.`);
        target.emit('message', `${player.name}'s enforcement demand has expired with no answer.`);
        room.emit('enforce:timeout', { enforcerId: player.id, targetId: target.id });
      }
    }, RESPONSE_WINDOW_MS);

    myThreats.set(target.id, timeout);

    player.emit('message', `Enforcement demand issued to ${target.name}. ${duration}-minute submission. Awaiting response.`);
  },
};

/**
 * Cancel an active threat — call this when the target responds (submit / fight / flee)
 * so the timeout doesn't fire spuriously.
 *
 * @param {string} enforcerId
 * @param {string} targetId
 */
function cancelThreat(enforcerId, targetId) {
  const myThreats = activeThreats.get(enforcerId);
  if (!myThreats) return;

  const handle = myThreats.get(targetId);
  if (handle) {
    clearTimeout(handle);
    myThreats.delete(targetId);
  }
}

module.exports.cancelThreat = cancelThreat;