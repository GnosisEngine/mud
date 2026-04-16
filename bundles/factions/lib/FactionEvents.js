// bundles/factions/lib/FactionEvents.js
'use strict';

const { EVENTS } = require('../events');
const { FACTION_EVENT_NAMES } = require('../constants');
const { hasFactionStanceChanged } = require('../logic');

function _validate(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'payload must be an object';
  }
  if (typeof payload.playerId !== 'string' || !payload.playerId) {
    return 'payload.playerId must be a non-empty string';
  }
  if (typeof payload.factionId !== 'number') {
    return 'payload.factionId must be a number';
  }
  if (typeof payload.eventType !== 'string' || !payload.eventType) {
    return 'payload.eventType must be a non-empty string';
  }
  if (!FACTION_EVENT_NAMES.has(payload.eventType)) {
    return `unknown eventType "${payload.eventType}"`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a handler function for the 'factionEvent' player event.
 *
 * The handler validates the payload, routes to FactionManager.applyEvent(),
 * and emits 'faction:stanceChanged' back on the player object if any bracket
 * label shifts as a result.
 *
 * The handler never throws — all errors are logged and the call returns null.
 * The game loop must not crash due to a bad faction event payload.
 *
 * @param {object} factionManager  — state.FactionManager
 * @param {object} [logger]        — object with .warn() method; defaults to console
 * @returns {Function}             — async (payload) => { profile, action } | null
 */
function createHandler(factionManager, logger) {
  const log = logger ?? console;

  return async function handleFactionEvent(payload) {
    const validationError = _validate(payload);
    if (validationError) {
      const safe = { playerId: payload.playerId, factionId: payload.factionId, eventType: payload.eventType };
      log.warn(`[factions] invalid factionEvent payload — ${validationError}: ${JSON.stringify(safe)}`);
      return null;
    }

    const { playerId, factionId, eventType, player } = payload;

    if (!factionManager.getFaction(factionId)) {
      log.warn(`[factions] factionEvent for unknown factionId ${factionId} — ignored`);
      return null;
    }

    let stanceBefore;
    let result;
    try {
      stanceBefore = await factionManager.getStance(playerId, factionId);
      result = await factionManager.applyEvent(playerId, factionId, eventType);
    } catch (err) {
      log.warn(`[factions] applyEvent failed for player "${playerId}" faction ${factionId} event "${eventType}": ${err.message}`);
      return null;
    }

    const { profile, action } = result;

    if (player && hasFactionStanceChanged(null, null, { before: stanceBefore && stanceBefore.brackets, after: profile.brackets })) {
      player.emit(EVENTS.FACTION_STANCE_CHANGED, {
        factionId,
        before: stanceBefore ? stanceBefore.brackets : null,
        after:  profile.brackets,
      });
    }

    return { profile, action };
  };
}

module.exports = { createHandler };
