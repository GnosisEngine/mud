'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../../types/ranvier').RanvierNpc} RanvierNpc */

const enforcement = require('../lib/enforcement');
const { Broadcast } = require('ranvier');
const { emit: claimsEmit } = require('../events');
const { withinRange } = require('../../lib/lib/TypeUtil');
const {
  isTargetSelf,
  hasBeenThreatened,
  hasSubmitted,
  ownsClaim
} = require('../logic');
const say = Broadcast.sayAt;
const sayToRoom = Broadcast.sayAtExcept;

const RESPONSE_WINDOW_MS   = 60 * 1000;
const MAX_DURATION_MINUTES = 60;

module.exports = {
  aliases: ['threaten'],

  /**
   * @param {GameState} state
   * @returns {function(string, RanvierPlayer): void}
   */
  command: state => (args, player) => {
    const parts = (args || '').trim().split(/\s+/);
    const [targetName, durationStr = '60'] = parts;
    const { store } = state.StorageManager;

    if (!targetName || !durationStr) {
      return say(player,  'Usage: enforce <playerName> <durationMinutes 1–60>');
    }

    const room   = player.room;
    const roomId = room.entityReference;
    const claim  = store.getClaimByRoom(roomId);

    if (ownsClaim(state, player, { claim }) === false) {
    //if (!claim || claim.ownerId !== player.name) {
      return say(player,  'You do not hold a claim on this room.');
    }

    const duration = parseInt(durationStr, 10);
    if (withinRange(duration, 1, MAX_DURATION_MINUTES)) {
      return say(player,  `Submission duration must be between 1 and ${MAX_DURATION_MINUTES} minutes.`);
    }

    const target = /** @type {RanvierPlayer | RanvierNpc | null} */ (state.getTarget(player, targetName, ['player']));
    if (isTargetSelf(state, player, { target })) return say(player, "You can't enforce against yourself.");

    if (!target) return say(player,  `${targetName} is not in this room.`);

    if (hasBeenThreatened(state, player, { target })) {
      return say(player,  `You already have an active enforcement demand against ${target.name}.`);
    }
    if (hasSubmitted(state, player, { target })) {
      return say(player,  `${target.name} has already submitted to you.`);
    }

    const meta = { enforcerId: player.name, claimId: claim.id, roomId, duration };

    claimsEmit.enforceReceived(target, meta.enforcerId, meta.claimId, meta.roomId, meta.duration);

    const timeoutHandle = setTimeout(() => {
      if (hasSubmitted(state, player, { target }) === false) {
        enforcement.removeThreat(player.name, target.name);
        applySubmission({
          enforcer: player,
          target,
          room: player.room,
          claimId: meta.claimId,
          roomId: meta.roomId,
          duration: meta.duration,
        });
      }
    }, RESPONSE_WINDOW_MS);

    enforcement.addThreat(player.name, target.name, meta, timeoutHandle);

    sayToRoom(room, `${player.name} demands submission from ${target.name}.`, [target]);
    say(target, `${player.name} demands you pay tax while harvesting from their territory. You can <b>submit</b> or <b>attack ${player.name}</b>.  After 60 seconds, you will automatically submit and begin paying tax.`);
  },
};

/**
 *
 * @param {*} param0
 */
function applySubmission({ enforcer, target, claimId, roomId, duration }) {
  enforcement.removeThreat(enforcer.name, target.name);
  enforcement.removeSubmission(target.name);
  const durationMs = duration * 60 * 1000;

  const expiryHandle = setTimeout(() => {
    if (hasSubmitted(null, enforcer, { target })) {
      enforcement.removeSubmission(target.name);
      say(target, `Your submission to ${enforcer.name} has ended.`);
      say(enforcer, `${target.name}'s submission to you has ended.`);
    }
  }, durationMs);

  enforcement.addSubmission(target.name, {
    enforcerId: enforcer.name,
    claimId,
    roomId,
    duration,
    endsAt: Date.now() + durationMs,
    timeoutHandle: expiryHandle,
  });

  say(target, `For the next ${duration} minutes, you will pay a tax on all resources harvest from the territory of ${enforcer.name}`);
  say(enforcer, `${target.name} has submitted to you for ${duration} minutes.`);
}

module.exports.applySubmission = applySubmission;
