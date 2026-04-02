// bundles/world/test/layer7.test.js
'use strict';

const assert      = require('assert');
const path        = require('path');
const fs          = require('fs');
const { build }   = require('../lib/RoomBuilder');
const { getRoomId } = require('../lib/AreaSchema');
const { load }    = require('../lib/WorldLoader');
const { resolve: resolveCluster } = require('../lib/ClusterResolver');
const { build: buildIndex }       = require('../lib/TileIndex');
const { resolve: resolveExits }   = require('../lib/ExitResolver');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const LEGENDS = {
  terrain: {
    '0':  'none',
    '1':  'bog',
    '2':  'cave',
    '3':  'forest_coniferous',
    '4':  'forest_deciduous',
    '5':  'hills',
    '6':  'forest_edge',
    '7':  'grassland',
    '8':  'meadow',
    '9':  'lakeshore',
    '10': 'mountain_outcrop',
    '11': 'mountain_valley',
    '12': 'mountain',
    '13': 'river',
    '14': 'pasture',
    '15': 'wetland',
  },
  features: {
    '0': 'none',
    '1': 'road',
    '2': 'wilderness',
    '3': 'supply',
    '4': 'outpost',
  },
  featuresByName: { none: 0, road: 1, wilderness: 2, supply: 3, outpost: 4 },
  terrainsByName: { none: 0, bog: 1, cave: 2, forest_coniferous: 3, forest_deciduous: 4,
    hills: 5, forest_edge: 6, grassland: 7, meadow: 8, lakeshore: 9,
    mountain_outcrop: 10, mountain_valley: 11, mountain: 12, river: 13, pasture: 14, wetland: 15 },
};

function tile(x, y, featureId, terrainId, clusterId = 1) {
  return { coords: [x, y], terrain: terrainId, feature: featureId,
           cluster: clusterId, canonicalCluster: clusterId };
}

const REAL_WORLD_PATH      = path.resolve(__dirname, '../../../data/world.json');
const REAL_WORLD_AVAILABLE = fs.existsSync(REAL_WORLD_PATH);

const ALL_TERRAIN_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

console.log('\nLayer 7 — RoomBuilder\n');

// ---------------------------------------------------------------------------

console.log('return shape');

test('returns an object', () => {
  const room = build(tile(0, 0, 3, 1), [], LEGENDS);
  assert.strictEqual(typeof room, 'object');
  assert.ok(room !== null);
});

test('id is getRoomId for tile coords', () => {
  const t    = tile(42, 17, 3, 1);
  const room = build(t, [], LEGENDS);
  assert.strictEqual(room.id, getRoomId(42, 17));
});

test('id handles negative coordinates', () => {
  const t    = tile(-5, -12, 3, 1);
  const room = build(t, [], LEGENDS);
  assert.strictEqual(room.id, getRoomId(-5, -12));
});

test('coordinates is [x, y, 0]', () => {
  const room = build(tile(10, 20, 3, 1), [], LEGENDS);
  assert.deepStrictEqual(room.coordinates, [10, 20, 0]);
});

test('coordinates z is always 0', () => {
  for (const [x, y] of [[0,0],[5,10],[-3,7]]) {
    const room = build(tile(x, y, 3, 1), [], LEGENDS);
    assert.strictEqual(room.coordinates[2], 0);
  }
});

test('metadata.terrain is the terrain name string', () => {
  const room = build(tile(0, 0, 3, 1), [], LEGENDS);
  assert.strictEqual(room.metadata.terrain, 'bog');
});

test('metadata.worldCoords is [x, y]', () => {
  const room = build(tile(7, 13, 3, 1), [], LEGENDS);
  assert.deepStrictEqual(room.metadata.worldCoords, [7, 13]);
});

test('title is a non-empty string', () => {
  const room = build(tile(0, 0, 3, 1), [], LEGENDS);
  assert.strictEqual(typeof room.title, 'string');
  assert.ok(room.title.length > 0);
});

test('description is a non-empty string', () => {
  const room = build(tile(0, 0, 3, 1), [], LEGENDS);
  assert.strictEqual(typeof room.description, 'string');
  assert.ok(room.description.length > 0);
});

// ---------------------------------------------------------------------------

console.log('\nexits');

test('no exits: exits key is absent', () => {
  const room = build(tile(0, 0, 3, 1), [], LEGENDS);
  assert.ok(!('exits' in room));
});

test('empty exits array: exits key is absent', () => {
  const room = build(tile(0, 0, 3, 1), [], LEGENDS);
  assert.strictEqual(room.exits, undefined);
});

test('exits are passed through unchanged', () => {
  const exits = [{ direction: 'north', roomId: 'c2:r_0_1' }];
  const room  = build(tile(0, 0, 3, 1), exits, LEGENDS);
  assert.deepStrictEqual(room.exits, exits);
});

test('multiple exits are preserved', () => {
  const exits = [
    { direction: 'north', roomId: 'c2:r_0_1' },
    { direction: 'east',  roomId: 'roads:r_1_0' },
  ];
  const room = build(tile(0, 0, 3, 1), exits, LEGENDS);
  assert.strictEqual(room.exits.length, 2);
});

// ---------------------------------------------------------------------------

console.log('\nterrain coverage');

test('all 15 terrain types produce a non-empty title', () => {
  for (const terrainId of ALL_TERRAIN_IDS) {
    const room = build(tile(0, 0, 3, terrainId), [], LEGENDS);
    assert.ok(room.title.length > 0, `terrain ${terrainId} produced empty title`);
  }
});

test('all 15 terrain types produce a non-empty description', () => {
  for (const terrainId of ALL_TERRAIN_IDS) {
    const room = build(tile(0, 0, 3, terrainId), [], LEGENDS);
    assert.ok(room.description.length > 0, `terrain ${terrainId} produced empty description`);
  }
});

test('all 15 terrain types produce distinct descriptions', () => {
  const descs = ALL_TERRAIN_IDS.map(id => build(tile(0, 0, 3, id), [], LEGENDS).description);
  const unique = new Set(descs);
  assert.strictEqual(unique.size, descs.length, 'duplicate descriptions found across terrain types');
});

test('all 15 terrain types produce distinct titles (non-road)', () => {
  const titles = ALL_TERRAIN_IDS.map(id => build(tile(0, 0, 3, id), [], LEGENDS).title);
  const unique = new Set(titles);
  assert.strictEqual(unique.size, titles.length, 'duplicate titles found across terrain types');
});

test('unknown terrain ID produces fallback title not a throw', () => {
  const t    = tile(0, 0, 3, 99);
  const room = build(t, [], LEGENDS);
  assert.strictEqual(typeof room.title, 'string');
  assert.ok(room.title.length > 0);
});

test('unknown terrain ID produces fallback description not a throw', () => {
  const t    = tile(0, 0, 3, 99);
  const room = build(t, [], LEGENDS);
  assert.strictEqual(typeof room.description, 'string');
  assert.ok(room.description.length > 0);
});

test('metadata.terrain is "none" for unknown terrain', () => {
  const t    = tile(0, 0, 3, 99);
  const room = build(t, [], LEGENDS);
  assert.strictEqual(room.metadata.terrain, 'none');
});

// ---------------------------------------------------------------------------

console.log('\nfeature effects');

test('road tile always uses road description regardless of terrain', () => {
  const descs = ALL_TERRAIN_IDS.map(id =>
    build(tile(0, 0, 1, id), [], LEGENDS).description
  );
  const unique = new Set(descs);
  assert.strictEqual(unique.size, 1, 'road tiles should all have the same description');
});

test('road tile title includes terrain name and "Road"', () => {
  const room = build(tile(0, 0, 1, 7), [], LEGENDS);
  assert.ok(room.title.includes('Road'), `expected "Road" in title, got "${room.title}"`);
  assert.ok(room.title.includes('Grassland'), `expected terrain in title, got "${room.title}"`);
});

test('outpost tile title includes "Settlement"', () => {
  const room = build(tile(0, 0, 4, 3), [], LEGENDS);
  assert.ok(room.title.includes('Settlement'), `expected "Settlement", got "${room.title}"`);
});

test('supply tile title is terrain name without feature modifier', () => {
  const room = build(tile(0, 0, 3, 1), [], LEGENDS);
  assert.strictEqual(room.title, 'Bogland');
});

test('wilderness tile title is terrain name without feature modifier', () => {
  const room = build(tile(0, 0, 2, 4), [], LEGENDS);
  assert.strictEqual(room.title, 'Deciduous Forest');
});

test('road tile description differs from non-road description for same terrain', () => {
  const roadRoom    = build(tile(0, 0, 1, 1), [], LEGENDS);
  const supplyRoom  = build(tile(0, 0, 3, 1), [], LEGENDS);
  assert.notStrictEqual(roadRoom.description, supplyRoom.description);
});

// ---------------------------------------------------------------------------

console.log('\nreal world.json integration');

test('builds a room for every tile in real world without throwing', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolveCluster(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap } = buildIndex(resolved.tiles);
  for (const tile of resolved.tiles) {
    const exits = resolveExits(tile, coordMap);
    build(tile, exits, loaded.legends);
  }
});

test('real world: all rooms have a non-empty title and description', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolveCluster(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap } = buildIndex(resolved.tiles);
  for (const tile of resolved.tiles) {
    const exits = resolveExits(tile, coordMap);
    const room  = build(tile, exits, loaded.legends);
    assert.ok(room.title.length > 0,       `empty title at ${tile.coords}`);
    assert.ok(room.description.length > 0, `empty desc at ${tile.coords}`);
  }
});

test('real world: all rooms have coordinates [x, y, 0]', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolveCluster(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap } = buildIndex(resolved.tiles);
  for (const tile of resolved.tiles) {
    const room = build(tile, resolveExits(tile, coordMap), loaded.legends);
    assert.strictEqual(room.coordinates[0], tile.coords[0]);
    assert.strictEqual(room.coordinates[1], tile.coords[1]);
    assert.strictEqual(room.coordinates[2], 0);
  }
});

test('real world: all metadata.terrain values are non-empty strings', () => {
  if (!REAL_WORLD_AVAILABLE) { console.log('    (skipped)'); return; }
  const loaded   = load(REAL_WORLD_PATH);
  const resolved = resolveCluster(loaded.tiles, loaded.clusters, loaded.legends);
  const { coordMap } = buildIndex(resolved.tiles);
  for (const tile of resolved.tiles) {
    const room = build(tile, resolveExits(tile, coordMap), loaded.legends);
    assert.strictEqual(typeof room.metadata.terrain, 'string');
    assert.ok(room.metadata.terrain.length > 0, `empty terrain at ${tile.coords}`);
  }
});

// ---------------------------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);