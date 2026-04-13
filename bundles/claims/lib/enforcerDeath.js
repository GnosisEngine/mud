'use strict';

const store = require('../lib/store');
const enforcement = require('../lib/enforcement');

/**
 * onEnforcerKilled({ killer, killed, room })
 *
 * Call this from your combat resolution logic when a player dies.
 * Handles the full enforcer-death cascade:
 *
 *   1. Transfer ALL of the killed player's claims to the killer
 *   2. Cancel ALL pending threats the killed player had issued
 *   3. Dissolve ALL active submissions the killed player held
 *   4. Notify every freed submitter
 *
 * This is intentionally a standalone function rather than a Ranvier event
 * listener so combat code can await the async claim transfer before
 * continuing resolution.
 *
 * Usage in your combat handler:
 *
 *   const { onEnforcerKilled } = require('./enforcerDeath');
 *   // ...inside your kill resolution...
 *   await onEnforcerKilled({ killer: winnerPlayer, killed: loserPlayer, room });
 *
 * @param {object} opts
 * @param {object} opts.killer  — the winning player (Ranvier Player object)
 * @param {object} opts.killed  — the dying player
 * @param {object} opts.room    — the room the fight took place in
 */
async function onEnforcerKilled({ killer, killed, room }) {
  // 1. Transfer all claims
  const transferred = await store.transferAllClaims(killed.id, killer.id);

  if (transferred > 0) {
    killer.emit('message', `You inherit ${transferred} claim${transferred !== 1 ? 's' : ''} from ${killed.name}.`);
    killed.emit('message', `Your ${transferred} claim${transferred !== 1 ? 's' : ''} transfer to ${killer.name}.`);
    room.emit('message', `${killer.name} now holds ${killed.name}'s territory.`);
  }

  // 2. Cancel all pending threats the killed player had issued
  //    (people they had threatened but who hadn't yet submitted)
  enforcement.removeAllThreats(killed.id);

  // 3. Dissolve all active submission bonds the killed player held
  const freedIds = enforcement.removeSubmissionsByEnforcer(killed.id);

  // 4. Notify freed submitters
  //    We can only message players who are still online — look them up in room
  //    or fall back to a global player lookup if your engine supports it.
  for (const targetId of freedIds) {
    const freedPlayer = _findPlayerInRoom(room, targetId);
    if (freedPlayer) {
      freedPlayer.emit('message', `${killed.name} is dead. Your submission bond is dissolved.`);
    }
  }

  if (freedIds.length > 0) {
    room.emit('message', `With ${killed.name} dead, all submission bonds they held are void.`);
  }
}

function _findPlayerInRoom(room, playerId) {
  if (!room.players) return null;
  for (const p of room.players) {
    if (p.id === playerId) return p;
  }
  return null;
}

module.exports = { onEnforcerKilled };
