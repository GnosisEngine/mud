// bundles/world/generate.js
'use strict';

const path = require('path');

const { load } = require('./lib/WorldLoader');
const { resolve } = require('./lib/ClusterResolver');
const { build: buildIdx } = require('./lib/TileIndex');
const { getFolderName, getZoneType } = require('./lib/AreaSchema');
const { resolve: resolveExits } = require('./lib/ExitResolver');
const { build: buildRoom } = require('./lib/RoomBuilder');
const { serializeManifest, serializeRooms } = require('./lib/YamlSerializer');
const { write } = require('./lib/AreaWriter');

const WORLD_JSON_PATH = path.resolve(__dirname, 'data/world.json');
const DEFAULT_OUTPUT = path.resolve(__dirname, 'areas');

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dryRun: false, clusterId: null, random: false, full: false, output: DEFAULT_OUTPUT };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') {
      args.dryRun = true;
    } else if (argv[i] === '--cluster' && argv[i + 1] !== undefined) {
      args.clusterId = Number(argv[++i]);
    } else if (argv[i] === '--random') {
      args.random = true;
    } else if (argv[i] === '--full') {
      args.full = true;
    } else if (argv[i] === '--output' && argv[i + 1] !== undefined) {
      args.output = path.resolve(argv[++i]);
    }
  }

  return args;
}

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

function generateArea(clusterId, tiles, clusterIndex, coordMap, legends, args) {
  const entry = clusterIndex.get(clusterId);
  const folderName = getFolderName(clusterId);
  const zoneType = getZoneType(entry ? entry.dominantFeature : null);
  const title = entry ? entry.name : `Cluster ${clusterId}`;

  const manifestYaml = serializeManifest({ title, zoneType });

  const renderTiles = clusterId === 0
    ? tiles.filter(tile => tile.feature !== 1)
    : tiles;

  const rooms = renderTiles.map(tile => {
    const exits = resolveExits(tile, coordMap);
    return buildRoom(tile, exits, legends);
  });

  const roomsYaml = serializeRooms(rooms);

  if (args.dryRun) {
    console.log(`\n--- ${folderName} (${title}) [${tiles.length} rooms] ---`);
    console.log('manifest.yml:');
    console.log(manifestYaml);
    if (args.full) {
      console.log('rooms.yml:');
      console.log(roomsYaml);
    } else {
      console.log('rooms.yml (first room only):');
      console.log(roomsYaml.split('\n\n')[0]);
    }
    return;
  }

  write(args.output, folderName, manifestYaml, roomsYaml);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('[world-gen] loading world.json...');
  const loaded = load(WORLD_JSON_PATH);
  const resolved = resolve(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap, clusterTiles } = buildIdx(resolved.tiles);
  const { clusterIndex } = resolved;

  if (args.dryRun) {
    console.log('[world-gen] DRY RUN — no files will be written');
  }

  if (args.random && args.clusterId === null) {
    const ids = [...clusterTiles.keys()];
    args.clusterId = ids[Math.floor(Math.random() * ids.length)];
    console.log(`[world-gen] random cluster selected: ${args.clusterId}`);
  }

  if (args.clusterId !== null) {
    const tiles = clusterTiles.get(args.clusterId);
    if (!tiles) {
      console.error(`[world-gen] cluster ${args.clusterId} not found`);
      process.exit(1);
    }
    generateArea(args.clusterId, tiles, clusterIndex, coordMap, loaded.legends, args);
    if (!args.dryRun) {
      console.log(`[world-gen] wrote 1 area → ${path.join(args.output, getFolderName(args.clusterId))}`);
    }
    return;
  }

  let areasWritten = 0;
  let roomsWritten = 0;

  for (const [clusterId, tiles] of clusterTiles.entries()) {
    generateArea(clusterId, tiles, clusterIndex, coordMap, loaded.legends, args);
    areasWritten++;
    roomsWritten += tiles.length;
  }

  if (args.dryRun) {
    console.log(`\n[world-gen] dry run complete — would generate ${areasWritten} areas, ${roomsWritten} rooms`);
  } else {
    console.log(`[world-gen] generated ${areasWritten} areas, ${roomsWritten} rooms → ${args.output}`);
  }
}

main();
