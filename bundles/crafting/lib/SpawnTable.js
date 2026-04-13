// resources/lib/SpawnTable.js
'use strict';

const ResourceDefinitions = require('./ResourceDefinitions');

function _weightedDraw(candidates) {
  const totalWeight = candidates.reduce((sum, c) => sum + c.spawnWeight, 0);
  if (totalWeight <= 0) return null;

  let roll = Math.random() * totalWeight;
  for (const candidate of candidates) {
    roll -= candidate.spawnWeight;
    if (roll <= 0) return candidate;
  }

  return candidates[candidates.length - 1];
}

function _rollAmount(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getSpawnCandidates(terrainType) {
  return ResourceDefinitions.getSpawnTable(terrainType);
}

function getMaxDensityForResource(terrainType, resourceKey) {
  const candidates = getSpawnCandidates(terrainType);
  const entry = candidates.find(c => c.resourceKey === resourceKey);
  return entry ? entry.maxDensity : 0;
}

function drawSpawn(terrainType) {
  const candidates = getSpawnCandidates(terrainType);
  if (!candidates || candidates.length === 0) return null;

  const chosen = _weightedDraw(candidates);
  if (!chosen) return null;

  const amount = _rollAmount(chosen.min, chosen.max);
  return { resourceKey: chosen.resourceKey, amount };
}

module.exports = {
  getSpawnCandidates,
  getMaxDensityForResource,
  drawSpawn,
};
