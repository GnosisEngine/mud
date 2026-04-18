// bundles/communication/lib/canSpeak.js
'use strict';

/** @typedef {import('../../../types/ranvier').RanvierEffect} RanvierEffect */
/** @typedef {import('../../../types/ranvier').RanvierCharacter} RanvierCharacter */

/**
 * Check whether a player is permitted to use a given communication channel.
 *
 * Each effect that restricts communication declares a `blockedChannels` array
 * in its config, e.g.:
 *
 *   config: {
 *     name: 'Raspy',
 *     type: 'raspy',
 *     persists: false,
 *     blockedChannels: ['yell', 'chat'],
 *   }
 *
 * Effects without `blockedChannels` are ignored entirely.
 * Restrictions are evaluated independently per active effect — no combined
 * mask is accumulated, so expiry of one effect never corrupts another.
 *
 * @param {RanvierCharacter} player
 * @param {string}    channel  The channel name to check, e.g. 'say', 'yell'
 * @returns {{ blocked: boolean, effect: RanvierEffect|null }}
 */
function canSpeak(player, channel) {
  for (const effect of player.effects.entries()) {
    const blocked = effect.config.blockedChannels;
    if (!Array.isArray(blocked)) {
      continue;
    }
    if (blocked.includes(channel)) {
      return { blocked: true, effect };
    }
  }
  return { blocked: false, effect: null };
}

module.exports = canSpeak;
