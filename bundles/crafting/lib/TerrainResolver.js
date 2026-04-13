// resources/lib/TerrainResolver.js
'use strict';

const ResourceDefinitions = require('./ResourceDefinitions');

const FALLBACK_TERRAIN = 'default';

let _resolverFn = null;

function init(resolverFn) {
  if (typeof resolverFn !== 'function') {
    throw new Error('TerrainResolver.init: resolverFn must be a function');
  }
  _resolverFn = resolverFn;
}

function getTerrain(room) {
  if (!_resolverFn) return FALLBACK_TERRAIN;

  let terrain;
  try {
    terrain = _resolverFn(room);
  } catch (_) {
    return FALLBACK_TERRAIN;
  }

  if (typeof terrain !== 'string' || !terrain.length) return FALLBACK_TERRAIN;

  const table = ResourceDefinitions.getSpawnTable(terrain);
  const defaultTable = ResourceDefinitions.getSpawnTable(FALLBACK_TERRAIN);
  if (table === defaultTable && terrain !== FALLBACK_TERRAIN) return FALLBACK_TERRAIN;

  return terrain;
}

function reset() {
  _resolverFn = null;
}

module.exports = {
  init,
  getTerrain,
  reset,
};
