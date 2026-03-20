'use strict';

/**
 * CombatNarrativeReaders
 *
 * Pure functions that read raw combat state and return normalized string
 * constants consumed by CombatNarrativeSelectors.
 *
 * None of these functions produce output. None of them have side effects.
 * Each takes the minimum data it needs and returns a single value.
 *
 * Keyword inference
 * -----------------
 * When a metadata field is absent, readers scan names and descriptions for
 * known keywords and infer the closest match. If nothing matches, they
 * return 'generic' so the selector falls through to the generic template pool.
 *
 * File path: mud/bundles/bundle-example-combat/lib/CombatNarrativeReaders.js
 */

// ---------------------------------------------------------------------------
// Keyword maps used for inference
// Ordered from most specific to most general so the first match wins.
// ---------------------------------------------------------------------------

const ATTACK_TYPE_KEYWORDS = {
  // bite and claw are checked before piercing/bladed to avoid 'fang'/'talon'
  // matching the wrong type
  bite:        ['bite','jaw','maw','tooth','teeth','chomp','gnaw'],
  claw:        ['claw','talon','rake','scratch','swipe','nail'],
  // arcane checked before piercing so 'arcane bolt' resolves correctly
  arcane:      ['arcane','spell','magic','wand','orb','rune','enchant',
                'mystic','sorcery','hex','curse','blast'],
  elemental:   ['fire','flame','frost','ice','lightning','thunder','shock',
                'earth','stone','wind','gust','water','acid','poison','venom'],
  bladed:      ['sword','blade','axe','dagger','knife','scimitar','rapier',
                'sabre','falchion','cutlass','cleaver','edge','slash','cut'],
  piercing:    ['spear','lance','pike','javelin','arrow','bolt','needle',
                'spike','thorn','stinger','fang','thrust','pierce','puncture'],
  bludgeoning: ['mace','hammer','club','staff','flail','maul','fist','punch',
                'smash','bash','crush','pummel','warhammer','morningstar'],
};

const ARMOR_TYPE_KEYWORDS = {
  plate:    ['plate','full plate','armor','armour','steel','iron','metal',
             'knight','cuirass','breastplate','pauldron','gorget','gauntlet'],
  chain:    ['chain','chainmail','mail','ringmail','links','ring armor'],
  leather:  ['leather','hide','studded','padded','brigandine','scale leather',
             'tanned','fur','pelt','skin armor'],
  cloth:    ['cloth','robe','vestment','tunic','shirt','garment','fabric',
             'silk','wool','linen','cotton','dress'],
  scales:   ['scales','scale','reptile','lizard','drake','dragon','serpent',
             'natural armor','carapace','shell','chitin','exoskeleton'],
  ethereal: ['ethereal','spirit','ghost','wraith','phantom','spectral',
             'undead','lich','shade','incorporeal','mist','void'],
  bare:     ['bare','naked','unarmored','unclothed','flesh','skin'],
};

const ENTITY_TYPE_KEYWORDS = {
  biped:      ['human','elf','dwarf','orc','goblin','gnome','halfling',
               'person','man','woman','folk','humanoid','troll','ogre'],
  quadruped:  ['wolf','bear','horse','lion','tiger','deer','boar','dog',
               'cat','fox','hound','panther','leopard','hyena','rhino'],
  slime:      ['slime','ooze','blob','pudding','gel','jelly','goo','mold',
               'cube','amorphous','oozing'],
  undead:     ['zombie','skeleton','ghoul','wight','specter','lich','vampire',
               'revenant','corpse','undead','bones','risen','wraith','shade'],
  insectoid:  ['spider','beetle','ant','mantis','scorpion','centipede',
               'wasp','moth','cricket','roach','bug','insect','arachnid'],
  serpentine: ['snake','serpent','naga','worm','wyrm','viper','cobra',
               'constrictor','asp','basilisk','hydra'],
  avian:      ['harpy','griffon','roc','eagle','hawk','vulture','phoenix',
               'bird','winged','feathered','wyvern'],
  elemental:  ['elemental','golem','construct','animated','fire elemental',
               'earth elemental','water elemental','air elemental','wisp'],
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function pick(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Scan a set of strings (name, description, keywords) for the first matching
 * keyword map entry.
 *
 * @param {string[]} candidates  — lowercased strings to search in
 * @param {Object}   keywordMap  — { typeName: string[] } from the maps above
 * @returns {string|null}        — matched type name or null
 */
function inferFromKeywords(candidates, keywordMap) {
  for (const [type, keywords] of Object.entries(keywordMap)) {
    for (const keyword of keywords) {
      if (candidates.some(c => c.includes(keyword))) {
        return type;
      }
    }
  }
  return null;
}

/**
 * Build a lowercased candidate string array from an entity or item,
 * pulling whatever text fields are available.
 *
 * @param {Object} obj — entity, weapon, or armor item
 * @returns {string[]}
 */
function getCandidates(obj) {
  if (!obj) return [];
  const fields = [
    obj.name,
    obj.description,
    obj.roomDesc,
    obj.metadata && obj.metadata.type,
    obj.metadata && obj.metadata.keywords,
    obj.keywords
  ];
  return fields
    .filter(Boolean)
    .map(f => (Array.isArray(f) ? f.join(' ') : String(f)).toLowerCase());
}

// ---------------------------------------------------------------------------
// Public reader functions
// ---------------------------------------------------------------------------

/**
 * Determine the attack type of a weapon or attacker.
 * Checks metadata.damageType first, then infers from keywords.
 *
 * @param {Object} source — the weapon item, or the attacker Character if unarmed
 * @returns {string} — 'bladed' | 'bludgeoning' | 'piercing' | 'bite' |
 *                     'claw' | 'arcane' | 'elemental' | 'generic'
 */
function getAttackType(source) {
  if (!source) return 'generic';

  const explicit = source.metadata && source.metadata.damageType;
  if (explicit) {
    const val = Array.isArray(explicit) ? pick(explicit) : explicit;
    return val.toLowerCase();
  }

  const inferred = inferFromKeywords(getCandidates(source), ATTACK_TYPE_KEYWORDS);
  return inferred || 'generic';
}

/**
 * Bucket a raw damage amount into a named tier.
 * Uses percentage of the target's maximum health.
 *
 * @param {number} amount    — final damage dealt
 * @param {number} maxHealth — target's maximum health attribute value
 * @returns {string} — 'graze' | 'light' | 'moderate' | 'heavy' | 'severe' | 'devastating'
 */
function getDamageTier(amount, maxHealth) {
  if (!maxHealth || maxHealth <= 0) return 'moderate'; // safe fallback

  const pct = (amount / maxHealth) * 100;

  if (pct <= 5)  return 'graze';
  if (pct <= 15) return 'light';
  if (pct <= 25) return 'moderate';
  if (pct <= 40) return 'heavy';
  if (pct <= 60) return 'severe';
  return 'devastating';
}

/**
 * Determine the armor type of an entity.
 * Checks the 'body' equipment slot metadata first, then infers from keywords.
 * Falls back to the entity's own metadata.naturalArmor, then keyword inference
 * on the entity itself, then 'bare'.
 *
 * @param {Object} entity — a Character or NPC
 * @returns {string} — 'plate' | 'chain' | 'leather' | 'cloth' | 'bare' |
 *                     'scales' | 'ethereal' | 'generic'
 */
function getArmorType(entity) {
  if (!entity) return 'generic';

  // 1. Check equipped body armor metadata
  const armor = entity.equipment && entity.equipment.get('body');
  if (armor) {
    const explicit = armor.metadata && armor.metadata.armorType;
    if (explicit) {
      const val = Array.isArray(explicit) ? pick(explicit) : explicit;
      return val.toLowerCase();
    }
    const inferred = inferFromKeywords(getCandidates(armor), ARMOR_TYPE_KEYWORDS);
    if (inferred) return inferred;
  }

  const natural = entity.metadata && entity.metadata.naturalArmor;
  if (natural) {
    const val = Array.isArray(natural) ? pick(natural) : natural;
    return val.toLowerCase();
  }

  // 3. Infer from the entity itself (e.g. ghost, skeleton, slime)
  const entityInferred = inferFromKeywords(getCandidates(entity), ARMOR_TYPE_KEYWORDS);
  if (entityInferred) return entityInferred;

  // 4. No armor equipped and no natural armor — bare skin
  return 'bare';
}

/**
 * Determine the entity type of a combatant.
 * Checks metadata.entityType first, then infers from keywords.
 *
 * @param {Object} entity — a Character or NPC
 * @returns {string} — 'biped' | 'quadruped' | 'slime' | 'undead' |
 *                     'insectoid' | 'serpentine' | 'avian' | 'elemental' | 'generic'
 */
function getEntityType(entity) {
  if (!entity) return 'generic';

  const explicit = entity.metadata && entity.metadata.entityType;
  if (explicit) {
    const val = Array.isArray(explicit) ? pick(explicit) : explicit;
    return val.toLowerCase();
  }

  const inferred = inferFromKeywords(getCandidates(entity), ENTITY_TYPE_KEYWORDS);
  return inferred || 'generic';
}

/**
 * Determine how physically worn down an entity is.
 * Based on percentage of maximum health missing.
 *
 * @param {Object} entity — a Character or NPC with a 'health' attribute
 * @returns {number} — 1 (fresh) through 6 (death's door)
 */
function getExhaustionTier(entity) {
  if (!entity || !entity.hasAttribute('health')) return 1;

  const current = entity.getAttribute('health');
  const max     = entity.getMaxAttribute('health');

  if (!max || max <= 0) return 1;

  const missing = 1 - (current / max);

  if (missing <= 0.10) return 1; // fresh
  if (missing <= 0.25) return 2; // winded
  if (missing <= 0.50) return 3; // hurt
  if (missing <= 0.75) return 4; // bloodied
  if (missing <= 0.90) return 5; // failing
  return 6;                       // death's door
}

/**
 * Determine how mentally/resource depleted an entity is.
 * Checks for any of: mana, energy, focus, stamina, favor — in that order.
 * Uses whichever attribute exists first. Returns 1 (sharp) if none found.
 *
 * @param {Object} entity — a Character or NPC
 * @returns {number} — 1 (sharp) through 5 (delirious)
 */
function getClarityTier(entity) {
  if (!entity) return 1;

  const CLARITY_ATTRIBUTES = ['mana', 'energy', 'focus', 'stamina', 'favor'];

  let current = null;
  let max     = null;

  for (const attr of CLARITY_ATTRIBUTES) {
    if (entity.hasAttribute(attr)) {
      current = entity.getAttribute(attr);
      max     = entity.getMaxAttribute(attr);
      break;
    }
  }

  // None of the known clarity attributes exist — entity is treated as sharp
  if (current === null || !max || max <= 0) return 1;

  const missing = 1 - (current / max);

  if (missing <= 0.10) return 1; // sharp
  if (missing <= 0.25) return 2; // strained
  if (missing <= 0.50) return 3; // foggy
  if (missing <= 0.75) return 4; // dazed
  return 5;                       // delirious
}

/**
 * Bucket a heal amount into a named magnitude.
 * Uses percentage of the recipient's maximum health.
 *
 * @param {number} amount    — final heal amount
 * @param {number} maxHealth — recipient's maximum health
 * @returns {string} — 'minor' | 'moderate' | 'major'
 */
function getHealMagnitude(amount, maxHealth) {
  if (!maxHealth || maxHealth <= 0) return 'minor'; // safe fallback

  const pct = (amount / maxHealth) * 100;

  if (pct <= 10) return 'minor';
  if (pct <= 30) return 'moderate';
  return 'major';
}

/**
 * Determine the current arc stage of a fight.
 * Called after each exchange to detect transitions.
 *
 * @param {Object} attacker — the NPC or player attacking
 * @param {Object} target   — the player being attacked (primary POV)
 * @returns {string} — 'opening' | 'exchange' | 'turning:winning' |
 *                     'turning:losing' | 'desperate' | 'closing'
 */
function getArcStage(attacker, target) {
  const roundCount       = (target.combatData && target.combatData.roundCount) || 0;
  const playerExhaustion = getExhaustionTier(target);
  const enemyExhaustion  = getExhaustionTier(attacker);

  // Opening: first two rounds while both are still fresh
  if (roundCount <= 2) return 'opening';

  // Closing: enemy is near death, player is in reasonable shape
  // Must be checked before desperate so it doesn't get swallowed.
  // Player up to tier 3 (hurt) still counts as "in reasonable shape" here.
  if (enemyExhaustion >= 5 && playerExhaustion <= 3) return 'closing';

  // Desperate: either combatant is critically wounded
  if (playerExhaustion >= 5 || enemyExhaustion >= 5) return 'desperate';

  // Turning: one side has a clear advantage
  if (enemyExhaustion >= 4 && playerExhaustion <= 2) return 'turning:winning';
  if (playerExhaustion >= 4 && enemyExhaustion <= 2) return 'turning:losing';

  // Default: even exchange
  return 'exchange';
}

/**
 * Determine whether the combat flavor throttle should fire this round.
 * Emits every 4–6 rounds, randomised so it doesn't feel mechanical.
 * Mutates entity.combatData.lastFlavorRound as a side effect — this is the
 * one intentional exception to the no-side-effects rule, since the throttle
 * state has to live somewhere and combatData is the right place.
 *
 * @param {Object} entity — a Character with combatData
 * @returns {boolean}
 */
function shouldEmitFlavor(entity) {
  if (!entity.combatData) return false;

  const round = entity.combatData.roundCount   || 0;
  const last  = entity.combatData.lastFlavorRound || 0;
  const gap   = 4 + Math.floor(Math.random() * 3); // 4, 5, or 6

  if ((round - last) >= gap) {
    entity.combatData.lastFlavorRound = round;
    return true;
  }

  return false;
}

module.exports = {
  getAttackType,
  getDamageTier,
  getArmorType,
  getEntityType,
  getExhaustionTier,
  getClarityTier,
  getHealMagnitude,
  getArcStage,
  shouldEmitFlavor,

  // Exported for testing and for the selectors to reference
  ATTACK_TYPE_KEYWORDS,
  ARMOR_TYPE_KEYWORDS,
  ENTITY_TYPE_KEYWORDS,
};