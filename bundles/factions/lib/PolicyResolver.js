// bundles/factions/lib/PolicyResolver.js
'use strict';

const fs = require('fs');
const path = require('path');

const {
  BRACKET_LABELS,
  FACTION_EVENT_NAMES,
} = require('../constants');

const AXES = ['affinity', 'honor', 'trust', 'debt'];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _scoreToIndex(score, thresholds) {
  for (let i = 0; i < thresholds.length; i++) {
    if (score <= thresholds[i]) return i;
  }
  return thresholds.length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Maps raw axis scores to bracket label strings using per-axis thresholds.
 *
 * For each axis the threshold array is four boundary values that divide the
 * score range into five named brackets. A score equal to a boundary value
 * falls into the lower bracket (score <= threshold[i]).
 *
 * @param {{ affinity, honor, trust, debt }} scores
 * @param {{ affinity, honor, trust, debt }} thresholds  — per-axis arrays of 4 numbers
 * @returns {{ affinity, honor, trust, debt }}            — bracket label strings
 */
function scoresToBrackets(scores, thresholds) {
  const result = {};
  for (const axis of AXES) {
    const idx = _scoreToIndex(scores[axis] ?? 0, thresholds[axis]);
    result[axis] = BRACKET_LABELS[axis][idx];
  }
  return result;
}

/**
 * Derives a renown value from raw axis scores.
 * Renown is the sum of the absolute values of all four axes.
 * A player with all scores at zero has zero renown — they are a stranger.
 *
 * @param {{ affinity, honor, trust, debt }} scores
 * @returns {number}
 */
function deriveRenown(scores) {
  return AXES.reduce((sum, axis) => sum + Math.abs(scores[axis] ?? 0), 0);
}

/**
 * Resolves a full reputation profile from raw scores and a faction definition.
 *
 * @param {{ affinity, honor, trust, debt }} scores
 * @param {object} factionDef   — from FactionLoader
 * @returns {{ axes, brackets, renown, isStranger }}
 */
function resolveProfile(scores, factionDef) {
  const axes = {
    affinity: scores.affinity ?? 0,
    honor:    scores.honor    ?? 0,
    trust:    scores.trust    ?? 0,
    debt:     scores.debt     ?? 0,
  };
  const brackets  = scoresToBrackets(axes, factionDef.thresholds);
  const renown    = deriveRenown(axes);
  const isStranger = renown < factionDef.renownThreshold;
  return { axes, brackets, renown, isStranger };
}

/**
 * Returns the fully-merged delta object for an event type against a faction.
 * FactionLoader pre-merges eventOverrides, so this is a guarded lookup.
 * Throws if the eventType is not a known FACTION_EVENTS key.
 *
 * @param {string} eventType
 * @param {object} factionDef
 * @returns {{ affinity, honor, trust, debt }}
 */
function mergeDeltas(eventType, factionDef) {
  if (!FACTION_EVENT_NAMES.has(eventType)) {
    throw new Error(`PolicyResolver: unknown event type "${eventType}"`);
  }
  return { ...factionDef.eventOverrides[eventType] };
}

/**
 * Loads all policy functions from a directory.
 * Each .js file must export a single function. The Map key is the filename
 * without the .js extension.
 *
 * @param {string} policiesDir
 * @returns {Map<string, Function>}
 */
function loadPolicies(policiesDir) {
  const resolved = path.resolve(policiesDir);
  const files = fs.readdirSync(resolved).filter(f => f.endsWith('.js'));
  const policyMap = new Map();

  for (const file of files) {
    const name = path.basename(file, '.js');
    const fn = require(path.join(resolved, file));
    if (typeof fn !== 'function') {
      throw new Error(
        `PolicyResolver: policy file "${file}" must export a function, got ${typeof fn}`
      );
    }
    policyMap.set(name, fn);
  }

  return policyMap;
}

module.exports = { scoresToBrackets, deriveRenown, resolveProfile, mergeDeltas, loadPolicies };
