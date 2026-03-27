// resources/lib/ResourceDefinitions.js
'use strict';

const path = require('path');

const VALID_QUALITIES = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary', 'currency']);

const _resources = require(path.join(__dirname, '../data/resources.json'));
const _spawnTables = require(path.join(__dirname, '../data/spawn-tables.json'));

function _validateResources(resources) {
  for (const [key, def] of Object.entries(resources)) {
    if (typeof def.title !== 'string' || !def.title.length) {
      throw new Error('Resource "' + key + '": missing title');
    }
    if (!VALID_QUALITIES.has(def.quality)) {
      throw new Error('Resource "' + key + '": invalid quality "' + def.quality + '"');
    }
    if (typeof def.weight !== 'number' || def.weight <= 0) {
      throw new Error('Resource "' + key + '": weight must be a positive number');
    }
    if (!def.requires || !Array.isArray(def.requires.skills) || !Array.isArray(def.requires.effects)) {
      throw new Error('Resource "' + key + '": requires must have skills[] and effects[]');
    }
    if (!('rotTicks' in def)) {
      throw new Error('Resource "' + key + '": rotTicks field must be present (use null for non-perishable)');
    }
    if (def.rotTicks !== null && (typeof def.rotTicks !== 'number' || def.rotTicks <= 0)) {
      throw new Error('Resource "' + key + '": rotTicks must be a positive integer or null');
    }
  }
}

function _validateSpawnTables(tables, resources) {
  if (!tables.default) {
    throw new Error('spawn-tables.json: missing "default" terrain entry');
  }
  for (const [terrain, entries] of Object.entries(tables)) {
    if (!Array.isArray(entries)) {
      throw new Error('Spawn table "' + terrain + '": must be an array');
    }
    for (const entry of entries) {
      if (!resources[entry.resourceKey]) {
        throw new Error('Spawn table "' + terrain + '": unknown resourceKey "' + entry.resourceKey + '"');
      }
      if (typeof entry.spawnWeight !== 'number' || entry.spawnWeight <= 0) {
        throw new Error('Spawn table "' + terrain + '": spawnWeight must be a positive number');
      }
      if (typeof entry.min !== 'number' || typeof entry.max !== 'number' || entry.min > entry.max || entry.min < 1) {
        throw new Error('Spawn table "' + terrain + '": invalid min/max range for "' + entry.resourceKey + '"');
      }
      if (typeof entry.maxDensity !== 'number' || entry.maxDensity < 1) {
        throw new Error('Spawn table "' + terrain + '": maxDensity must be >= 1');
      }
    }
  }
}

_validateResources(_resources);
_validateSpawnTables(_spawnTables, _resources);

function getDefinition(key) {
  return _resources[key] || null;
}

function getWeight(key) {
  const def = getDefinition(key);
  if (!def) return null;
  return def.weight;
}

function getRequirements(key) {
  const def = getDefinition(key);
  if (!def) return null;
  return def.requires;
}

function getRotTicks(key) {
  const def = getDefinition(key);
  if (!def) return null;
  return def.rotTicks;
}

function getAllKeys() {
  return Object.keys(_resources);
}

function getSpawnTable(terrain) {
  return _spawnTables[terrain] || _spawnTables['default'];
}

function isValidKey(key) {
  return key in _resources;
}

module.exports = {
  getDefinition,
  getWeight,
  getRequirements,
  getRotTicks,
  getAllKeys,
  getSpawnTable,
  isValidKey,
};