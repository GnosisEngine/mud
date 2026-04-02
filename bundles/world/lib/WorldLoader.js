// bundles/world/lib/WorldLoader.js
'use strict';

const fs   = require('fs');
const path = require('path');

const REQUIRED_META_FIELDS    = ['width', 'height'];
const REQUIRED_LEGEND_KEYS    = ['terrain', 'features'];
const REQUIRED_FEATURE_NAMES  = ['none', 'road', 'wilderness', 'supply', 'outpost'];

function _invertLegend(legend, label) {
  const inverse = {};
  const seen    = {};

  for (const [id, name] of Object.entries(legend)) {
    if (typeof name !== 'string' || !name.length) {
      throw new Error(`WorldLoader: ${label} legend entry ${id} has a non-string or empty name`);
    }
    if (seen[name] !== undefined) {
      throw new Error(
        `WorldLoader: ${label} legend has duplicate name "${name}" at IDs ${seen[name]} and ${id}`
      );
    }
    seen[name]    = id;
    inverse[name] = Number(id);
  }

  return inverse;
}

function _validateLegends(legends) {
  for (const key of REQUIRED_LEGEND_KEYS) {
    if (!legends[key] || typeof legends[key] !== 'object') {
      throw new Error(`WorldLoader: legends.${key} is missing or not an object`);
    }
  }

  const featuresByName = _invertLegend(legends.features, 'features');

  for (const name of REQUIRED_FEATURE_NAMES) {
    if (featuresByName[name] === undefined) {
      throw new Error(`WorldLoader: legends.features is missing required feature name "${name}"`);
    }
  }
}

function _validateMap(map) {
  if (!Array.isArray(map)) {
    throw new Error('WorldLoader: map must be an array');
  }
  if (map.length === 0) {
    throw new Error('WorldLoader: map array is empty');
  }

  const sample = map[0];
  if (
    !Array.isArray(sample.coords) ||
    sample.coords.length !== 2 ||
    typeof sample.terrain  !== 'number' ||
    typeof sample.feature  !== 'number' ||
    typeof sample.cluster  !== 'number'
  ) {
    throw new Error(
      'WorldLoader: map entries must have coords:[x,y], terrain, feature, and cluster fields'
    );
  }
}

function _validateClusters(clusters) {
  if (!clusters || typeof clusters !== 'object' || Array.isArray(clusters)) {
    throw new Error('WorldLoader: clusters must be an object');
  }
  if (!('0' in clusters)) {
    throw new Error('WorldLoader: clusters must contain a "0" entry');
  }
}

function load(worldJsonPath) {
  const resolved = path.resolve(worldJsonPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `WorldLoader: cannot find world.json at ${resolved}.\n` +
      `Generate it from the world editor and place it at data/world.json.`
    );
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (e) {
    throw new Error(`WorldLoader: failed to parse JSON at ${resolved}: ${e.message}`);
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`WorldLoader: world.json at ${resolved} must be a JSON object`);
  }

  const { metadata = {}, legends, clusters, map } = raw;

  if (!legends || typeof legends !== 'object') {
    throw new Error('WorldLoader: world.json is missing a "legends" object');
  }

  _validateLegends(legends);
  _validateMap(map);
  _validateClusters(clusters);

  for (const field of REQUIRED_META_FIELDS) {
    if (metadata[field] === undefined) {
      console.warn(`WorldLoader: metadata.${field} is missing from world.json`);
    }
  }

  const featuresByName = _invertLegend(legends.features, 'features');
  const terrainsByName = _invertLegend(legends.terrain,  'terrain');

  const unknownTerrains = new Set();
  for (const tile of map) {
    const name = legends.terrain[String(tile.terrain)];
    if (!name) unknownTerrains.add(tile.terrain);
  }
  if (unknownTerrains.size > 0) {
    console.warn(
      `WorldLoader: ${unknownTerrains.size} unknown terrain ID(s) in map: ` +
      `${[...unknownTerrains].join(', ')}. Affected tiles will use fallback terrain.`
    );
  }

  return {
    tiles: map,
    legends: {
      terrain:        legends.terrain,
      features:       legends.features,
      featuresByName,
      terrainsByName,
    },
    clusters,
    meta: metadata,
  };
}

module.exports = { load };