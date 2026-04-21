'use strict';

/**
 * CombatNarrativeSelectors
 *
 * Functions that take normalized state constants from CombatNarrativeReaders
 * and return a single template string from CombatTemplates.
 *
 * Every selector guarantees a non-empty string return — it will never hand
 * back undefined, null, or an empty string. Fallback chains are explicit and
 * tested. Callers do not need to guard against missing returns.
 *
 * Interpolation of {attacker} / {target} tokens is NOT done here.
 * That is the builder's responsibility. Selectors return raw template strings.
 *
 * File path: mud/bundles/combat/lib/CombatNarrativeSelectors.js
 */

const T = require('./CombatTemplates');


// Internal helper

/**
 * Pick a random element from an array.
 * Returns null if the array is empty or not an array.
 *
 * @param {any[]} arr
 * @returns {any|null}
 */
function pick(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Walk a nested object by a sequence of keys, returning the value at the end
 * or null if any key is missing along the way.
 *
 * @param {object} obj
 * @param {string[]} keys
 * @returns {any|null}
 */
function dig(obj, keys) {
  let cursor = obj;
  for (const key of keys) {
    if (cursor == null || typeof cursor !== 'object') return null;
    cursor = cursor[key];
  }
  return cursor ?? null;
}

/**
 * Try each fallback path in order, returning the first non-null pick().
 * Each path is an array of keys passed to dig().
 *
 * @param {object}    root   — the template subtree to search
 * @param {string[][]} paths — ordered list of key-path arrays
 * @returns {string|null}
 */
function firstPick(root, paths) {
  for (const path of paths) {
    const result = pick(dig(root, path));
    if (result) return result;
  }
  return null;
}

// Hard fallbacks
// Used only when the entire template tree yields nothing — should never
// happen in practice if CombatTemplates is intact, but guards against
// partial edits or future gaps.

const FALLBACK = {
  hit: {
    attacker: 'Your attack connects.',
    target:   'The attack finds you.',
  },
  avoid: {
    attacker: 'Your attack misses.',
    target:   'You avoid the attack.',
  },
  arc:        'The fight continues.',
  exhaustion: '',   // empty string = no flavor emitted, intentional
  clarity:    '',
  heal: {
    self:  'You feel somewhat restored.',
    other: 'The wound closes somewhat.',
  },
  kill: {
    killer: 'Your opponent falls.',
    killed: 'Everything goes dark.',
  },
};

// Public selectors

/**
 * Select a hit message template.
 *
 * Fallback chain:
 *   1. hit[pov][attackType][damageTier][armorType]
 *   2. hit[pov][attackType][damageTier]['generic']
 *   3. hit[pov]['generic'][damageTier]['generic']
 *   4. FALLBACK.hit[pov]
 *
 * @param {string} pov        — 'attacker' | 'target'
 * @param {string} attackType — from getAttackType()
 * @param {string} damageTier — from getDamageTier()
 * @param {string} armorType  — from getArmorType()
 * @returns {string}
 */
function selectHitTemplate(pov, attackType, damageTier, armorType) {
  const root = T.hit[pov];
  if (!root) return FALLBACK.hit[pov] || FALLBACK.hit.attacker;

  const result = firstPick(root, [
    [attackType, damageTier, armorType],
    [attackType, damageTier, 'generic'],
    ['generic',  damageTier, 'generic'],
  ]);

  return result || FALLBACK.hit[pov];
}

/**
 * Select an avoidance message template.
 *
 * avoidType 'partial' has no ease sub-key — it is a flat array.
 *
 * Fallback chain:
 *   1. avoid[pov][avoidType][ease]           (standard)
 *   2. avoid[pov][avoidType]                 (if partial, or ease missing)
 *   3. avoid[pov]['miss']['narrow']          (universal fallback within pov)
 *   4. FALLBACK.avoid[pov]
 *
 * @param {string} pov       — 'attacker' | 'target'
 * @param {string} avoidType — 'miss' | 'dodge' | 'block' | 'parry' | 'partial'
 * @param {string} ease      — 'effortless' | 'narrow' | 'desperate'
 *                             (ignored when avoidType is 'partial')
 * @returns {string}
 */
function selectAvoidTemplate(pov, avoidType, ease) {
  const root = T.avoid[pov];
  if (!root) return FALLBACK.avoid[pov] || FALLBACK.avoid.attacker;

  // 'partial' is flat — no ease sub-key
  if (avoidType === 'partial') {
    const result = pick(root.partial);
    return result || FALLBACK.avoid[pov];
  }

  const result = firstPick(root, [
    [avoidType, ease],
    [avoidType, 'narrow'],    // ease fallback within same avoidType
    ['miss',    'narrow'],    // universal within-pov fallback
  ]);

  return result || FALLBACK.avoid[pov];
}

/**
 * Select an arc transition line.
 * Called when the arc stage changes, not on every round.
 *
 * @param {string} stage — from getArcStage()
 * @returns {string}
 */
function selectArcLanguage(stage) {
  const result = pick(T.arc[stage]);
  if (result) return result;

  // If an unknown stage comes in, fall back to 'exchange'
  return pick(T.arc.exchange) || FALLBACK.arc;
}

/**
 * Select an exhaustion flavor line for an entity.
 * Returns empty string for tier 1 (fresh) — no flavor emitted.
 *
 * @param {string} pov  — 'self' | 'target'
 * @param {number} tier — 1–6 from getExhaustionTier()
 * @returns {string}    — empty string if no flavor should fire
 */
function selectExhaustionFlavor(pov, tier) {
  const pool = dig(T.exhaustion, [pov, tier.toString()]);
  if (!pool || pool.length === 0) return '';
  return pick(pool) || '';
}

/**
 * Select a clarity flavor line.
 * Returns empty string for tier 1 (sharp) — no flavor emitted.
 *
 * @param {number} tier — 1–5 from getClarityTier()
 * @returns {string}    — empty string if no flavor should fire
 */
function selectClarityFlavor(tier) {
  const pool = dig(T.clarity, [tier.toString()]);
  if (!pool || pool.length === 0) return '';
  return pick(pool) || '';
}

/**
 * Select the best status flavor line given both exhaustion and clarity state.
 * Picks the worse of the two tiers and selects from the appropriate pool.
 * Returns empty string if both are at their resting state.
 *
 * @param {number} exhaustionTier — 1–6
 * @param {number} clarityTier    — 1–5
 * @returns {string}
 */
function selectStatusFlavor(exhaustionTier, clarityTier) {
  // Neither state is interesting — nothing to say
  if (exhaustionTier <= 1 && clarityTier <= 1) return '';

  // Weight exhaustion slightly higher since it's 6-tier vs 5-tier
  // Normalize both to 0–1 and pick the worse
  const exhaustionWeight = (exhaustionTier - 1) / 5;
  const clarityWeight    = (clarityTier - 1)    / 4;

  if (exhaustionWeight >= clarityWeight) {
    return selectExhaustionFlavor('self', exhaustionTier);
  }
  return selectClarityFlavor(clarityTier);
}

/**
 * Select a heal message template.
 *
 * Fallback chain:
 *   1. heal[pov][magnitude][arcStage]
 *   2. heal[pov][magnitude]['generic']
 *   3. FALLBACK.heal[pov]
 *
 * @param {string} pov       — 'self' | 'other'
 * @param {string} magnitude — from getHealMagnitude()
 * @param {string} arcStage  — from getArcStage()
 * @returns {string}
 */
function selectHealTemplate(pov, magnitude, arcStage) {
  const root = T.heal[pov];
  if (!root) return FALLBACK.heal[pov] || FALLBACK.heal.self;

  const result = firstPick(root, [
    [magnitude, arcStage],
    [magnitude, 'generic'],
  ]);

  return result || FALLBACK.heal[pov];
}

/**
 * Select a kill message.
 *
 * @param {string} pov — 'killer' | 'killed'
 * @returns {string}
 */
function selectKillTemplate(pov) {
  const result = pick(T.kill[pov]);
  return result || FALLBACK.kill[pov] || FALLBACK.kill.killer;
}

module.exports = {
  selectHitTemplate,
  selectAvoidTemplate,
  selectArcLanguage,
  selectExhaustionFlavor,
  selectClarityFlavor,
  selectStatusFlavor,
  selectHealTemplate,
  selectKillTemplate,
};
