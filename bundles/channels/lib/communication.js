// bundles/channels/lib/communication.js
'use strict';

/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

/**
 * @typedef {object} CommConfig
 * @property {Object<string, number>} levels
 * @property {{ max: number, windowMs: number, exempt?: string[] }} rateLimit
 * @property {number} maxPromptLength
 */

/**
 * @typedef {object} CommCheck
 * @property {boolean} allowed
 * @property {string}  [message]
 */

const MESSAGES = Object.freeze({
  notExperienced: "You're not experienced enough to commune in this manner.",
  almostReady:    'You are almost spiritually ready to commune in this manner.',
  throttle:       'You have exhausted your ability to commune. Please wait a short while to gather your spirits.',
  replyOnly:      'You can only commune in this manner with those who commune with you first.',
});

/**
 * Whether a player's account carries the `commune` privilege, which bypasses
 * the level-based communication restrictions (level gates and reply-only tell).
 * The rate limit still applies.
 *
 * @param {RanvierPlayer} player
 * @returns {boolean}
 */
function hasCommunePrivilege(player) {
  return !!(player && player.account && player.account.metadata &&
    player.account.metadata.commune === true);
}

/**
 * The required level for a channel. Built-in channels are keyed by name; any
 * other channel (a dynamic channel) falls back to the 'channels' level.
 *
 * @param {CommConfig} config
 * @param {string} channelName
 * @returns {number|undefined}
 */
function requiredLevelFor(config, channelName) {
  const levels = (config && config.levels) || {};
  if (Object.prototype.hasOwnProperty.call(levels, channelName)) {
    return levels[channelName];
  }
  return levels.channels;
}

/**
 * Level gate for a channel, with a proximity-aware block message: within one
 * level of the requirement gives an encouraging message, further below gives
 * the plain refusal.
 *
 * @param {CommConfig} config
 * @param {RanvierPlayer} player
 * @param {string} channelName
 * @returns {CommCheck}
 */
function checkLevel(config, player, channelName) {
  if (hasCommunePrivilege(player)) {
    return { allowed: true };
  }
  const required = requiredLevelFor(config, channelName);
  if (typeof required !== 'number') {
    return { allowed: true };
  }
  if (player.level >= required) {
    return { allowed: true };
  }
  if (player.level === required - 1) {
    return { allowed: false, message: MESSAGES.almostReady };
  }
  return { allowed: false, message: MESSAGES.notExperienced };
}

/**
 * Tell gate. At or above the configured tell level, any recipient is allowed.
 * Below it, a player may only reply to the last person who telled them.
 *
 * @param {CommConfig} config
 * @param {RanvierPlayer} sender
 * @param {RanvierPlayer} target
 * @returns {CommCheck}
 */
function checkTell(config, sender, target) {
  if (hasCommunePrivilege(sender)) {
    return { allowed: true };
  }
  const required = requiredLevelFor(config, 'tell');
  if (typeof required !== 'number' || sender.level >= required) {
    return { allowed: true };
  }
  if (target && sender._lastTeller && target.name === sender._lastTeller) {
    return { allowed: true };
  }
  return { allowed: false, message: MESSAGES.replyOnly };
}

/**
 * Records that `target` was last telled by `sender`, so a low-level target can
 * reply. Session-scoped; not persisted.
 *
 * @param {RanvierPlayer} target
 * @param {RanvierPlayer} sender
 */
function recordTell(target, sender) {
  target._lastTeller = sender.name;
}

function _isExempt(config, channelName) {
  const exempt = (config && config.rateLimit && config.rateLimit.exempt) || [];
  return exempt.includes(channelName);
}

function _times(player) {
  if (!player._commTimes) {
    player._commTimes = [];
  }
  return player._commTimes;
}

function _prune(times, windowMs, now) {
  const cutoff = now - windowMs;
  while (times.length && times[0] <= cutoff) {
    times.shift();
  }
}

/**
 * Whether a communication is within the rate limit, without recording it.
 * Exempt channels (e.g. gtell) are always allowed and never counted.
 *
 * @param {CommConfig} config
 * @param {RanvierPlayer} player
 * @param {string} channelName
 * @param {number} [now]
 * @returns {CommCheck}
 */
function checkRate(config, player, channelName, now = Date.now()) {
  if (_isExempt(config, channelName)) {
    return { allowed: true };
  }
  const { max, windowMs } = config.rateLimit;
  const times = _times(player);
  _prune(times, windowMs, now);
  if (times.length >= max) {
    return { allowed: false, message: MESSAGES.throttle };
  }
  return { allowed: true };
}

/**
 * Records a successful communication toward the rate limit. Exempt channels are
 * ignored. Call only after a message has actually been sent.
 *
 * @param {CommConfig} config
 * @param {RanvierPlayer} player
 * @param {string} channelName
 * @param {number} [now]
 */
function recordCommunication(config, player, channelName, now = Date.now()) {
  if (_isExempt(config, channelName)) {
    return;
  }
  const times = _times(player);
  _prune(times, config.rateLimit.windowMs, now);
  times.push(now);
}

module.exports = {
  MESSAGES,
  hasCommunePrivilege,
  requiredLevelFor,
  checkLevel,
  checkTell,
  recordTell,
  checkRate,
  recordCommunication,
};