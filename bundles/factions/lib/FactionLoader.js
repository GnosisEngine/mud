// bundles/factions/lib/FactionLoader.js
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const {
  BRACKET_THRESHOLDS_DEFAULT,
  RENOWN_THRESHOLD_DEFAULT,
  FACTION_EVENTS,
} = require('../constants');

const REQUIRED_FACTION_FIELDS = ['name', 'policies'];
const AXES = ['affinity', 'honor', 'trust', 'debt'];

function _mergeEventOverrides(eventOverrides) {
  const merged = {};
  for (const [eventType, defaults] of Object.entries(FACTION_EVENTS)) {
    const override = eventOverrides && eventOverrides[eventType];
    if (override) {
      merged[eventType] = { ...defaults, ...override };
    } else {
      merged[eventType] = { ...defaults };
    }
  }
  return merged;
}

function _parseThresholds(raw) {
  if (!raw) return { ...buildDefaultThresholds() };
  const result = {};
  for (const axis of AXES) {
    if (raw[axis]) {
      const t = raw[axis];
      if (!Array.isArray(t) || t.length !== 4) {
        throw new Error(
          `FactionLoader: thresholds.${axis} must be an array of 4 numbers`
        );
      }
      result[axis] = t;
    } else {
      result[axis] = BRACKET_THRESHOLDS_DEFAULT;
    }
  }
  return result;
}

function buildDefaultThresholds() {
  const result = {};
  for (const axis of AXES) {
    result[axis] = BRACKET_THRESHOLDS_DEFAULT;
  }
  return result;
}

function _parseFaction(id, raw) {
  for (const field of REQUIRED_FACTION_FIELDS) {
    if (!raw[field]) {
      throw new Error(`FactionLoader: faction ${id} is missing required field "${field}"`);
    }
  }

  if (typeof raw.policies !== 'object' || Array.isArray(raw.policies)) {
    throw new Error(`FactionLoader: faction ${id} policies must be an object`);
  }

  for (const [situation, policyName] of Object.entries(raw.policies)) {
    if (typeof policyName !== 'string') {
      throw new Error(
        `FactionLoader: faction ${id} policy "${situation}" must be a string (policy name)`
      );
    }
  }

  const factionRelations = {};
  if (raw.factionRelations) {
    for (const [otherId, relation] of Object.entries(raw.factionRelations)) {
      factionRelations[Number(otherId)] = relation;
    }
  }

  return {
    id,
    name: raw.name,
    color: raw.color ?? null,
    defaultStrangerPolicy: raw.defaultStrangerPolicy ?? 'warn',
    thresholds: _parseThresholds(raw.thresholds),
    renownThreshold: raw.renownThreshold ?? RENOWN_THRESHOLD_DEFAULT,
    policies: { ...raw.policies },
    factionRelations,
    eventOverrides: _mergeEventOverrides(raw.eventOverrides),
  };
}

/**
 * Parses a raw factions data object (already loaded from YAML or supplied
 * directly in tests). Returns a Map<factionId, FactionDef>.
 *
 * @param {object} raw
 * @returns {Map<number, object>}
 */
function parse(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('FactionLoader: input must be an object');
  }

  const factionBlock = raw.factions;

  if (factionBlock === undefined || factionBlock === null) {
    throw new Error('FactionLoader: input must have a "factions" key');
  }

  if (typeof factionBlock !== 'object' || Array.isArray(factionBlock)) {
    throw new Error('FactionLoader: factions must be an object');
  }

  const result = new Map();
  const entries = Object.entries(factionBlock);

  if (entries.length === 0) return result;

  for (const [idStr, factionRaw] of entries) {
    const id = Number(idStr);
    if (!Number.isInteger(id)) {
      throw new Error(`FactionLoader: faction key "${idStr}" is not a valid integer`);
    }
    if (result.has(id)) {
      throw new Error(`FactionLoader: duplicate faction id ${id}`);
    }
    result.set(id, _parseFaction(id, factionRaw));
  }

  return result;
}

/**
 * Loads and parses factions.yml from the given path.
 *
 * @param {string} filePath
 * @returns {Map<number, object>}
 */
function load(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`FactionLoader: cannot find factions.yml at ${resolved}`);
  }

  let raw;
  try {
    raw = yaml.load(fs.readFileSync(resolved, 'utf8'));
  } catch (e) {
    throw new Error(`FactionLoader: failed to parse YAML at ${resolved}: ${e.message}`);
  }

  return parse(raw);
}

module.exports = { parse, load };
