'use strict';

/**
 * ArcTracker
 *
 * Tracks the narrative arc of a fight and emits transition language when the
 * arc stage changes. Reads from combatData on the player entity, writes back
 * to it, and delegates all state reading and template selection to the
 * established reader/selector stack.
 *
 * This module is the only place in the narrative system that intentionally
 * mutates entity state (combatData.arcStage, combatData.roundCount).
 *
 * Usage
 * -----
 *   const ArcTracker = require('./ArcTracker');
 *
 *   // In the updateTick or damaged listener, after each exchange:
 *   const arcLine = ArcTracker.update(state, attacker, target);
 *   if (arcLine) B.sayAt(target, arcLine);
 *
 *   // To initialize combatData at fight start:
 *   ArcTracker.init(entity);
 *
 * File path: mud/bundles/combat/lib/ArcTracker.js
 */

const { getArcStage } = require('./CombatNarrativeReaders');
const { selectArcLanguage } = require('./CombatNarrativeSelectors');

// ---------------------------------------------------------------------------
// Arc stage color gradient
// Green (early/hopeful) → yellow (turning) → red (desperate/closing)
// ---------------------------------------------------------------------------

const ARC_COLORS = {
  'opening':        (s) => `<green>${s}</green>`,
  'exchange':       (s) => `<green>${s}</green>`,
  'turning:winning':(s) => `<yellow>${s}</yellow>`,
  'turning:losing': (s) => `<yellow>${s}</yellow>`,
  'desperate':      (s) => `<b><red>${s}</red></b>`,
  'closing':        (s) => `<yellow>${s}</yellow>`,
};

function colorize(stage, str) {
  const fn = ARC_COLORS[stage];
  return fn ? fn(str) : str;
}

// ---------------------------------------------------------------------------
// Arc stage emoji assignment
// Which entity leads the arc line — the one with narrative focus.
// player-focused stages get 🧍; enemy-focused stages get the enemy's emoji.
// ---------------------------------------------------------------------------

const ARC_EMOJI_FOCUS = {
  'opening':        'player',
  'exchange':       'player',
  'turning:winning':'player',
  'turning:losing': 'attacker',
  'desperate':      'attacker',
  'closing':        'attacker',
};

const PLAYER_EMOJI = '🧍';

function arcEmoji(stage, attacker) {
  const focus = ARC_EMOJI_FOCUS[stage] || 'player';
  if (focus === 'player') return PLAYER_EMOJI;
  try {
    const { getNpcEmoji } = require('../../fancy-rooms/lib/EmojiMapper');
    return getNpcEmoji((attacker && attacker.keywords) || []);
  } catch (e) {
    return '🧑';
  }
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

/**
 * Replace {attacker} and {target} tokens in a template string.
 *
 * @param {string} template
 * @param {Object} attacker — entity with a .name property
 * @param {Object} target   — entity with a .name property
 * @returns {string}
 */
function interpolate(template, attacker, target) {
  return template
    .replace(/\{attacker\}/g, (attacker && attacker.name) || 'Someone')
    .replace(/\{target\}/g,   (target   && target.name)   || 'Someone');
}

// ---------------------------------------------------------------------------
// combatData schema additions (for reference — not enforced here)
// ---------------------------------------------------------------------------
//
//   combatData.roundCount        {number}  — incremented each call to update()
//   combatData.arcStage          {string}  — current arc stage key
//   combatData.lastFlavorRound   {number}  — used by shouldEmitFlavor() in readers
//   combatData.arcTransitions    {number}  — count of arc stage changes this fight
//
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Stage progression order
// A fight should only move to stages of equal or greater narrative weight.
// Prevents regression e.g. turning:winning → exchange when health values
// oscillate around a tier boundary.
// Same-weight lateral shifts (turning:winning ↔ turning:losing) are allowed.
// ---------------------------------------------------------------------------

const STAGE_ORDER = {
  'opening':        0,
  'exchange':       1,
  'turning:winning':2,
  'turning:losing': 2,
  'desperate':      3,
  'closing':        3,
};

function isProgressionAllowed(previousStage, currentStage) {
  const prev = STAGE_ORDER[previousStage] ?? 0;
  const curr = STAGE_ORDER[currentStage]  ?? 0;
  return curr >= prev;
}

/**
 * Initialize narrative combat fields on an entity's combatData.
 * Call this when a fight begins (e.g. in the first updateTick after
 * isInCombat() becomes true, guarded by absence of arcStage).
 *
 * @param {Object} entity — a Character with a combatData object
 */
function init(entity) {
  if (!entity.combatData) entity.combatData = {};

  // Only initialize if not already set — do not reset mid-fight
  entity.combatData.roundCount      = entity.combatData.roundCount      ?? 0;
  entity.combatData.arcStage        = entity.combatData.arcStage        ?? 'opening';
  entity.combatData.lastFlavorRound = entity.combatData.lastFlavorRound ?? 0;
  entity.combatData.arcTransitions  = entity.combatData.arcTransitions  ?? 0;
}

/**
 * Update the arc state for a fight exchange and return a transition line
 * if the arc stage has changed, or an opening line on the very first round.
 *
 * Called once per combat round from the player's updateTick listener,
 * after Combat.updateRound() has run and damage has been applied.
 *
 * @param {Object} attacker — the NPC or player doing the attacking
 * @param {Object} target   — the player entity (primary POV, holds combatData)
 * @returns {string|null}   — interpolated arc line, or null if no transition
 */
function update(attacker, target) {
  if (!target || !attacker) return null;

  init(target);

  target.combatData.roundCount += 1;

  const previousStage = target.combatData.arcStage;
  const currentStage  = getArcStage(attacker, target);

  // Always emit the opening line on the very first round
  if (target.combatData.roundCount === 1) {
    target.combatData.arcStage = currentStage;
    const line = selectArcLanguage('opening');
    return arcEmoji('opening', attacker) + ' ' + colorize('opening', interpolate(line, attacker, target));
  }

  // No change — nothing to say
  if (currentStage === previousStage) return null;

  // Block regression — only allow forward or lateral progression
  if (!isProgressionAllowed(previousStage, currentStage)) return null;

  // Stage changed and progression is valid — record it and emit
  target.combatData.arcStage       = currentStage;
  target.combatData.arcTransitions += 1;

  // Suppress a transition back to 'opening' — shouldn't happen, but guard it
  if (currentStage === 'opening') return null;

  const line = selectArcLanguage(currentStage);
  return arcEmoji(currentStage, attacker) + ' ' + colorize(currentStage, interpolate(line, attacker, target));
}

/**
 * Get the current arc stage without mutating any state.
 * Useful for heal template selection where we need the stage but
 * don't want to trigger a transition.
 *
 * @param {Object} entity — the player entity
 * @returns {string}      — current arc stage, or 'exchange' if not initialized
 */
function getCurrentStage(entity) {
  return (entity && entity.combatData && entity.combatData.arcStage) || 'exchange';
}

/**
 * Reset all narrative combat fields on fight end.
 * Ranvier already resets combatData = {} on removeFromCombat(), so this
 * is only needed if you want explicit cleanup without a full combatData wipe.
 *
 * @param {Object} entity
 */
function reset(entity) {
  if (!entity || !entity.combatData) return;

  delete entity.combatData.arcStage;
  delete entity.combatData.arcTransitions;
  delete entity.combatData.lastFlavorRound;
  // roundCount is deliberately left — Combat.js may use it elsewhere
}

module.exports = { init, update, getCurrentStage, reset };