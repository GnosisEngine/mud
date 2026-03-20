'use strict';

/**
 * CombatNarrativeBuilders
 *
 * Assembles the final strings that get passed to B.sayAt().
 * Each builder calls the reader stack, calls the selector stack,
 * interpolates name tokens, and returns a ready-to-display string.
 *
 * Builders are the only layer that knows about Ranvier's color tag syntax.
 * Everything below them is plain strings.
 *
 * Nothing here touches B.sayAt() — that belongs to the event listeners.
 * Builders return strings. Listeners display them.
 *
 * File path: mud/bundles/bundle-example-combat/lib/CombatNarrativeBuilders.js
 */

const {
  getAttackType,
  getDamageTier,
  getArmorType,
  getEntityType,
  getExhaustionTier,
  getClarityTier,
  getHealMagnitude,
  shouldEmitFlavor,
} = require('./CombatNarrativeReaders');

const {
  selectHitTemplate,
  selectAvoidTemplate,
  selectExhaustionFlavor,
  selectStatusFlavor,
  selectHealTemplate,
  selectKillTemplate,
} = require('./CombatNarrativeSelectors');

const ArcTracker = require('./ArcTracker');
const { getNpcEmoji } = require('../../fancy-rooms/lib/EmojiMapper');

// ---------------------------------------------------------------------------
// Entity emoji
// ---------------------------------------------------------------------------

const PLAYER_EMOJI = '🧍';

/**
 * Return the appropriate emoji for an entity.
 * Players always get PLAYER_EMOJI.
 * NPCs are resolved via EmojiMapper using their keywords array.
 *
 * @param {Object} entity — a Character or NPC
 * @returns {string}      — a single emoji character
 */
function getEntityEmoji(entity) {
  if (!entity) return PLAYER_EMOJI;
  if (!entity.isNpc) return PLAYER_EMOJI;
  return getNpcEmoji(entity.keywords || []);
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
// Damage tier badge
// Prepended to hit messages so the player gets a tactile read on severity
// without seeing a number.
//
// Ranvier color/style tags:
//   <green>   <yellow>   <red>   <b>   </b>
// ---------------------------------------------------------------------------

const DAMAGE_BADGES = {
  graze:       '',                                    // silence = trivial
  light:       '',                                    // silence = minor
  moderate:    '<yellow>--</yellow> ',
  heavy:       '<b><yellow>---</yellow></b> ',
  severe:      '<b><red>----</red></b> ',
  devastating: '<b><red>-----</red></b> ',
};

/**
 * Return the badge prefix for a given damage tier.
 * Empty string for graze/light — no visual noise for small hits.
 *
 * @param {string} tier — from getDamageTier()
 * @returns {string}
 */
function damageBadge(tier) {
  return DAMAGE_BADGES[tier] || '';
}

// ---------------------------------------------------------------------------
// Public builders
// ---------------------------------------------------------------------------

/**
 * Build a hit message from the attacker's perspective.
 * Called from the 'hit' event listener on the attacking entity.
 *
 * @param {Object} attacker    — the entity doing the hitting
 * @param {Object} target      — the entity being hit
 * @param {Object} damage      — Ranvier Damage object
 * @param {number} finalAmount — post-mitigation damage value
 * @returns {string}
 */
function buildHitMessage(attacker, target, damage, finalAmount) {
  const source     = damage.source !== attacker ? damage.source : attacker;
  const attackType = getAttackType(source);
  const damageTier = getDamageTier(finalAmount, target.getMaxAttribute('health'));
  const armorType  = getArmorType(target);

  const template = selectHitTemplate('attacker', attackType, damageTier, armorType);
  const badge    = damageBadge(damageTier);

  return getEntityEmoji(attacker) + ' ' + badge + interpolate(template, attacker, target);
}

/**
 * Build a hit message from the target's perspective.
 * Called from the 'damaged' event listener on the entity taking damage.
 *
 * @param {Object} attacker    — the entity that struck (may be null for env damage)
 * @param {Object} target      — the entity receiving the damage (self)
 * @param {Object} damage      — Ranvier Damage object
 * @param {number} finalAmount — post-mitigation damage value
 * @returns {string}
 */
function buildDamagedMessage(attacker, target, damage, finalAmount) {
  const source     = damage.source !== attacker ? damage.source : (attacker || target);
  const attackType = getAttackType(source);
  const damageTier = getDamageTier(finalAmount, target.getMaxAttribute('health'));
  const armorType  = getArmorType(target);

  const template = selectHitTemplate('target', attackType, damageTier, armorType);
  const badge    = damageBadge(damageTier);

  // Environmental damage (no attacker) — strip attacker name gracefully
  const effectiveAttacker = attacker || { name: 'Something' };

  return getEntityEmoji(effectiveAttacker) + ' ' + badge + interpolate(template, effectiveAttacker, target);
}

/**
 * Build an avoidance message (miss, dodge, block, parry, partial).
 *
 * @param {string} pov       — 'attacker' (your attack was avoided)
 *                             'target'   (you avoided their attack)
 * @param {string} avoidType — 'miss' | 'dodge' | 'block' | 'parry' | 'partial'
 * @param {string} ease      — 'effortless' | 'narrow' | 'desperate'
 * @param {Object} attacker  — entity doing the attacking
 * @param {Object} target    — entity doing the defending
 * @returns {string}
 */
function buildAvoidMessage(pov, avoidType, ease, attacker, target) {
  const template = selectAvoidTemplate(pov, avoidType, ease);
  // For attacker pov the actor is the attacker; for target pov the actor is the defender
  const actor = pov === 'attacker' ? attacker : target;
  return getEntityEmoji(actor) + ' ' + interpolate(template, attacker, target);
}

/**
 * Build a heal message for the entity being healed (self pov).
 * Called from the 'healed' event listener.
 *
 * @param {Object} entity      — the entity receiving the heal
 * @param {Object} heal        — Ranvier Heal object
 * @param {number} finalAmount — post-calculation heal value
 * @returns {string}
 */
function buildHealedMessage(entity, heal, finalAmount) {
  const magnitude = getHealMagnitude(finalAmount, entity.getMaxAttribute('health'));
  const arcStage  = ArcTracker.getCurrentStage(entity);
  const template  = selectHealTemplate('self', magnitude, arcStage);

  // Healer name for interpolation — source may be the entity itself (potion)
  const healer = (heal.attacker && heal.attacker !== entity)
    ? heal.attacker
    : { name: 'Something' };

  return getEntityEmoji(entity) + ' ' + interpolate(template, healer, entity);
}

/**
 * Build a heal message for the entity doing the healing (other pov).
 * Called from the 'heal' event listener on the healer.
 *
 * @param {Object} healer      — the entity casting/applying the heal
 * @param {Object} target      — the entity being healed
 * @param {Object} heal        — Ranvier Heal object
 * @param {number} finalAmount — post-calculation heal value
 * @returns {string}
 */
function buildHealMessage(healer, target, heal, finalAmount) {
  const magnitude = getHealMagnitude(finalAmount, target.getMaxAttribute('health'));
  const arcStage  = ArcTracker.getCurrentStage(target);
  const template  = selectHealTemplate('other', magnitude, arcStage);

  return getEntityEmoji(healer) + ' ' + interpolate(template, healer, target);
}

// ---------------------------------------------------------------------------
// Exhaustion color gradient
// Tier 1 (fresh) = no color. Tier 2–6 steps from magenta to bold red.
// Ranvier supports standard ANSI color tags.
// ---------------------------------------------------------------------------

const EXHAUSTION_COLORS = {
  // tier 1 & 2 — fresh/winded: no color, silence reads as minor
  3: (s) => `<magenta>${s}</magenta>`,
  4: (s) => `<b><magenta>${s}</magenta></b>`,
  5: (s) => `<b><magenta>${s}</magenta></b>`,
  6: (s) => `<b><red>${s}</red></b>`,
};

function colorExhaustion(tier, str) {
  const fn = EXHAUSTION_COLORS[tier];
  return fn ? fn(str) : str;
}

// ---------------------------------------------------------------------------
// Death message colors
// Kill (you won):  bold yellow  — gold, triumphant
// Death (you lost): bold red    — stark, final
// ---------------------------------------------------------------------------

function colorKill(str)  { return `<b><yellow>${str}</yellow></b>`; }
function colorDeath(str) { return `<b><red>${str}</red></b>`; }

/**
 * Build a status flavor line for the player.
 * Returns null if the throttle says it's too soon, or if both tiers are
 * at their resting state (no interesting state to narrate).
 *
 * Called from the updateTick listener, after arc tracking.
 *
 * @param {Object} entity — the player entity
 * @returns {string|null}
 */
function buildStatusFlavor(entity) {
  if (!shouldEmitFlavor(entity)) return null;

  const exhaustionTier = getExhaustionTier(entity);
  const clarityTier    = getClarityTier(entity);
  const flavor         = selectStatusFlavor(exhaustionTier, clarityTier);

  if (!flavor) return null;
  const tier = exhaustionTier >= clarityTier ? exhaustionTier : clarityTier;
  return getEntityEmoji(entity) + ' ' + colorExhaustion(tier, interpolate(flavor, entity, entity));
}

/**
 * Build an exhaustion flavor line for a visible target (what the player
 * observes about their opponent's condition).
 * Returns null if the throttle says it's too soon or the target is fresh.
 *
 * @param {Object} observer — the player doing the observing (owns combatData)
 * @param {Object} target   — the entity being observed
 * @returns {string|null}
 */
function buildTargetExhaustionFlavor(observer, target) {
  if (!shouldEmitFlavor(observer)) return null;

  const tier   = getExhaustionTier(target);
  const flavor = selectExhaustionFlavor('target', tier);

  if (!flavor) return null;
  return getEntityEmoji(target) + ' ' + colorExhaustion(tier, interpolate(flavor, observer, target));
}

/**
 * Build the kill message for the entity that landed the killing blow.
 *
 * @param {Object} killer — the entity that did the killing
 * @param {Object} dead   — the entity that died
 * @returns {string}
 */
function buildKillMessage(killer, dead) {
  const template = selectKillTemplate('killer');
  return getEntityEmoji(killer) + ' ' + colorKill(interpolate(template, killer, dead));
}

/**
 * Build the death message for the entity that was killed.
 *
 * @param {Object} dead   — the entity that died
 * @param {Object} killer — the entity that did the killing (may be null)
 * @returns {string}
 */
function buildDeathMessage(dead, killer) {
  const template = selectKillTemplate('killed');
  const effectiveKiller = killer || { name: 'Something' };
  return getEntityEmoji(effectiveKiller) + ' ' + colorDeath(interpolate(template, effectiveKiller, dead));
}

module.exports = {
  buildHitMessage,
  buildDamagedMessage,
  buildAvoidMessage,
  buildHealedMessage,
  buildHealMessage,
  buildStatusFlavor,
  buildTargetExhaustionFlavor,
  buildKillMessage,
  buildDeathMessage,
  // Exported for testing
  damageBadge,
  interpolate,
};