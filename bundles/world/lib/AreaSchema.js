// bundles/world/lib/AreaSchema.js
'use strict';

const ZONE_TYPE_MAP = {
  supply: 'SUPPLY',
  wilderness: 'WILDERNESS',
  outpost: 'OUTPOST',
};

/**
 * Returns the area folder name for a canonical cluster ID.
 * Cluster 0 (the unnamed road backbone) always maps to 'roads'.
 * All other clusters map to 'c{id}'.
 *
 * @param {number} canonicalClusterId
 * @returns {string}
 */
function getFolderName(canonicalClusterId) {
  return canonicalClusterId === 0 ? 'roads' : `c${canonicalClusterId}`;
}

/**
 * Returns the Ranvier metadata.zoneType constant for a dominant feature name,
 * or null for features that should not spawn resources (road, outpost, unknown).
 *
 * @param {string|null} dominantFeatureName
 * @returns {string|null}
 */
function getZoneType(dominantFeatureName) {
  return ZONE_TYPE_MAP[dominantFeatureName] ?? null;
}

/**
 * Returns the Ranvier room ID for a tile at (x, y).
 * Format: r_{x}_{y}  e.g. r_42_17, r_-5_0
 *
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
function getRoomId(x, y) {
  return `r_${x}_${y}`;
}

/**
 * Returns the fully-qualified Ranvier room reference for a tile:
 * '{folderName}:{roomId}'  e.g. 'c13:r_42_17', 'roads:r_80_60'
 *
 * @param {number} canonicalClusterId
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
function getRoomRef(canonicalClusterId, x, y) {
  return `${getFolderName(canonicalClusterId)}:${getRoomId(x, y)}`;
}

module.exports = { getFolderName, getZoneType, getRoomId, getRoomRef };
