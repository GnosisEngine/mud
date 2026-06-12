// bundles/communication/lib/canSpeak.js
'use strict';

/** @typedef {import('types').RanvierEffect} RanvierEffect */
/** @typedef {import('types').RanvierCharacter} RanvierCharacter */

const DEFAULT_ROOM_BLOCKED_MESSAGE = 'A heavy hush fills this room. Only quiet, local conversation carries here.';

/**
 * Check whether a player is permitted to use a given communication channel.
 *
 * Two independent restriction sources are checked, room first:
 *
 * 1. Room-level allowlist — a room may declare `metadata.allowedChannels`,
 *    e.g. `allowedChannels: ['say']`. Any channel not in that list is
 *    blocked for everyone in the room. An optional
 *    `metadata.allowedChannelsMessage` overrides the default block message.
 *
 * 2. Per-effect blocklist — each effect that restricts communication
 *    declares a `blockedChannels` array in its config, e.g.:
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
 * @returns {{ blocked: boolean, effect: RanvierEffect|{config: {blockedMessage: string}}|null }}
 */
function canSpeak(player, channel) {
  const allowed = player.room?.metadata?.allowedChannels;
  if (Array.isArray(allowed) && !allowed.includes(channel)) {
    return {
      blocked: true,
      effect: {
        config: {
          blockedMessage: player.room.metadata.allowedChannelsMessage || DEFAULT_ROOM_BLOCKED_MESSAGE,
        },
      },
    };
  }

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
