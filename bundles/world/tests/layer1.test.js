// bundles/world/test/layer1.test.js
'use strict';

const assert = require('assert');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');
const { load } = require('../lib/WorldLoader');

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

function throws(fn, fragment) {
  let threw = false;
  try { fn(); } catch (e) {
    threw = true;
    if (fragment && !e.message.includes(fragment)) {
      throw new Error(`Expected error containing "${fragment}", got: "${e.message}"`);
    }
  }
  if (!threw) throw new Error('Expected function to throw but it did not');
}

function writeTmp(obj) {
  const p = path.join(os.tmpdir(), `wl-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(p, JSON.stringify(obj));
  return p;
}

const VALID_TILE = { coords: [0, 0], terrain: 1, feature: 0, cluster: 0 };

const VALID_WORLD = {
  metadata: { width: 10, height: 10, seed: 1 },
  legends: {
    terrain:  { '0': 'none', '1': 'bog', '2': 'cave' },
    features: { '0': 'none', '1': 'road', '2': 'wilderness', '3': 'supply', '4': 'outpost' },
  },
  clusters: { '0': 'none', '1': 'Test Cluster' },
  map: [VALID_TILE],
};

const REAL_WORLD_PATH = path.resolve(__dirname, '../../../data/world.json');

// ---------------------------------------------------------------------------

console.log('\nLayer 1 — WorldLoader\n');

console.log('file loading');

test('loads real world.json without throwing', () => {
  if (!fs.existsSync(REAL_WORLD_PATH)) {
    console.log('    (skipped — data/world.json not present)');
    return;
  }
  const result = load(REAL_WORLD_PATH);
  assert.ok(result.tiles.length > 0);
});

test('missing file throws with actionable message', () => {
  throws(
    () => load('/absolutely/does/not/exist/world.json'),
    'world editor'
  );
});

test('missing file error includes the attempted path', () => {
  throws(
    () => load('/no/such/file.json'),
    '/no/such/file.json'
  );
});

test('invalid JSON throws with path in message', () => {
  const p = path.join(os.tmpdir(), 'bad.json');
  fs.writeFileSync(p, '{ not valid json }');
  throws(() => load(p), path.basename(p));
});

test('non-object JSON throws', () => {
  const p = writeTmp([1, 2, 3]);
  throws(() => load(p), 'JSON object');
});

// ---------------------------------------------------------------------------

console.log('\nlegends validation');

test('missing legends throws', () => {
  const p = writeTmp({ ...VALID_WORLD, legends: undefined });
  throws(() => load(p), 'legends');
});

test('missing legends.terrain throws', () => {
  const w = JSON.parse(JSON.stringify(VALID_WORLD));
  delete w.legends.terrain;
  const p = writeTmp(w);
  throws(() => load(p), 'legends.terrain');
});

test('missing legends.features throws', () => {
  const w = JSON.parse(JSON.stringify(VALID_WORLD));
  delete w.legends.features;
  const p = writeTmp(w);
  throws(() => load(p), 'legends.features');
});

test('missing required feature name throws', () => {
  const w = JSON.parse(JSON.stringify(VALID_WORLD));
  w.legends.features = { '0': 'none', '1': 'road', '2': 'wilderness', '3': 'supply' };
  const p = writeTmp(w);
  throws(() => load(p), 'outpost');
});

test('duplicate legend names throw', () => {
  const w = JSON.parse(JSON.stringify(VALID_WORLD));
  w.legends.features = { '0': 'none', '1': 'road', '2': 'wilderness', '3': 'supply', '4': 'supply' };
  const p = writeTmp(w);
  throws(() => load(p), 'duplicate');
});

test('empty legend name throws', () => {
  const w = JSON.parse(JSON.stringify(VALID_WORLD));
  w.legends.terrain = { '0': '', '1': 'bog' };
  const p = writeTmp(w);
  throws(() => load(p), 'empty');
});

// ---------------------------------------------------------------------------

console.log('\nmap validation');

test('missing map throws', () => {
  const p = writeTmp({ ...VALID_WORLD, map: undefined });
  throws(() => load(p), 'map');
});

test('non-array map throws', () => {
  const p = writeTmp({ ...VALID_WORLD, map: {} });
  throws(() => load(p), 'array');
});

test('empty map array throws', () => {
  const p = writeTmp({ ...VALID_WORLD, map: [] });
  throws(() => load(p), 'empty');
});

test('map entry missing coords throws', () => {
  const p = writeTmp({ ...VALID_WORLD, map: [{ terrain: 1, feature: 0, cluster: 0 }] });
  throws(() => load(p), 'coords');
});

test('map entry with wrong coords length throws', () => {
  const p = writeTmp({ ...VALID_WORLD, map: [{ coords: [1], terrain: 1, feature: 0, cluster: 0 }] });
  throws(() => load(p), 'coords');
});

// ---------------------------------------------------------------------------

console.log('\nclusters validation');

test('missing clusters throws', () => {
  const p = writeTmp({ ...VALID_WORLD, clusters: undefined });
  throws(() => load(p), 'clusters');
});

test('array clusters throws', () => {
  const p = writeTmp({ ...VALID_WORLD, clusters: [] });
  throws(() => load(p), 'clusters');
});

test('clusters missing "0" entry throws', () => {
  const p = writeTmp({ ...VALID_WORLD, clusters: { '1': 'Something' } });
  throws(() => load(p), '"0"');
});

// ---------------------------------------------------------------------------

console.log('\nreturn shape');

test('returns tiles array', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  assert.ok(Array.isArray(r.tiles));
  assert.strictEqual(r.tiles.length, 1);
});

test('returns legends.terrain and legends.features raw', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  assert.deepStrictEqual(r.legends.terrain,  VALID_WORLD.legends.terrain);
  assert.deepStrictEqual(r.legends.features, VALID_WORLD.legends.features);
});

test('returns featuresByName inverse map', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  assert.strictEqual(r.legends.featuresByName.road,       1);
  assert.strictEqual(r.legends.featuresByName.wilderness,  2);
  assert.strictEqual(r.legends.featuresByName.supply,      3);
  assert.strictEqual(r.legends.featuresByName.outpost,     4);
  assert.strictEqual(r.legends.featuresByName.none,        0);
});

test('returns terrainsByName inverse map', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  assert.strictEqual(r.legends.terrainsByName.bog,  1);
  assert.strictEqual(r.legends.terrainsByName.cave, 2);
  assert.strictEqual(r.legends.terrainsByName.none, 0);
});

test('returns clusters object', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  assert.strictEqual(r.clusters['1'], 'Test Cluster');
});

test('returns meta object', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  assert.strictEqual(r.meta.width,  10);
  assert.strictEqual(r.meta.height, 10);
  assert.strictEqual(r.meta.seed,   1);
});

test('featuresByName values are numbers not strings', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  for (const val of Object.values(r.legends.featuresByName)) {
    assert.strictEqual(typeof val, 'number');
  }
});

test('terrainsByName values are numbers not strings', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  for (const val of Object.values(r.legends.terrainsByName)) {
    assert.strictEqual(typeof val, 'number');
  }
});

test('featuresByName and features are inverse of each other', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  for (const [id, name] of Object.entries(r.legends.features)) {
    assert.strictEqual(r.legends.featuresByName[name], Number(id));
  }
});

test('terrainsByName and terrain are inverse of each other', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  for (const [id, name] of Object.entries(r.legends.terrain)) {
    assert.strictEqual(r.legends.terrainsByName[name], Number(id));
  }
});

test('tiles reference is the original map array contents', () => {
  const p = writeTmp(VALID_WORLD);
  const r = load(p);
  assert.deepStrictEqual(r.tiles[0].coords, [0, 0]);
  assert.strictEqual(r.tiles[0].terrain, 1);
  assert.strictEqual(r.tiles[0].feature, 0);
  assert.strictEqual(r.tiles[0].cluster, 0);
});

// ---------------------------------------------------------------------------

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);