// bundles/world/server-events/index.js
'use strict';

const path = require('path');

const { load } = require('../lib/WorldLoader');
const { resolve } = require('../lib/ClusterResolver');
const { build: buildIdx } = require('../lib/TileIndex');
const { build: buildSvc } = require('../lib/WorldService');
const { Logger } = require('ranvier');

const WORLD_JSON_PATH = path.resolve(__dirname, '../data/world.json');

const NULL_WORLD_MANAGER = {
  getTerrainForRoom:      () => null,
  getEntryByCoords:       () => null,
  getClusters:            () => ({}),
  getRoadPairs:           () => [],
  getPath:                () => null,
  getPathBetweenClusters: () => null,
  getDirection:           () => null,
  getClusterIndex:        () => new Map(),
  getFactionForRoom:      () => null,
  getRoomsByFaction:      () => [],
  getClustersByFaction:   () => [],
};

module.exports = {
  listeners: {
    startup: state => () => {
      Logger.log('[world] initializing...');

      let loaded;
      try {
        loaded = load(WORLD_JSON_PATH);
      } catch (err) {
        Logger.warn(`[world] world.json not found or invalid — running with null world manager. (${err.message})`);
        state.WorldManager = NULL_WORLD_MANAGER;
        return;
      }

      const resolved = resolve(loaded.tiles, loaded.clusters, loaded.legends);
      const index    = buildIdx(resolved.tiles);
      const service  = buildSvc(loaded, resolved, index);

      state.WorldManager = service;
      state.WorldReady   = true;

      Logger.log(`[world] ready — ${resolved.tiles.length} tiles, ${resolved.clusterIndex.size} clusters`);
    },
  },
};
