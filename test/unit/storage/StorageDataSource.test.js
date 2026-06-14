// test/unit/storage/StorageDataSource.test.js
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const StorageDataSource = require('../../../bundles/storage/lib/StorageDataSource');

// Each test gets its own isolated tmp root via FIEF_TEST_DATA_DIR so
// StorageDataSource._resolveDir() returns a path under it.

let tmpRoot;
let source;
const REPO_ROOT = path.resolve(__dirname, '../../..');

function playersDir() {
  return path.join(tmpRoot, 'players');
}

before(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sds-test-'));
  process.env.FIEF_TEST_DATA_DIR = tmpRoot;
  source = new StorageDataSource({}, REPO_ROOT);
});

after(() => {
  delete process.env.FIEF_TEST_DATA_DIR;
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

const CFG = { path: 'players' };

describe('StorageDataSource', () => {
  it('hasData returns false when namespace directory does not exist', async() => {
    assert.equal(await source.hasData(CFG), false);
  });

  it('update creates the namespace directory and writes the entity file', async() => {
    await source.update(CFG, 'Alice', { name: 'Alice', level: 5 });

    const filePath = path.join(playersDir(), 'Alice.json');
    assert.ok(fs.existsSync(filePath), 'file should exist after update');

    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.deepEqual(parsed, { name: 'Alice', level: 5 });
  });

  it('hasData returns true after a file has been written', async() => {
    assert.equal(await source.hasData(CFG), true);
  });

  it('fetch reads the entity back', async() => {
    const data = await source.fetch(CFG, 'Alice');
    assert.deepEqual(data, { name: 'Alice', level: 5 });
  });

  it('fetch rejects with a ReferenceError for a missing entity', async() => {
    await assert.rejects(
      () => source.fetch(CFG, 'NoSuchPlayer'),
      err => err instanceof ReferenceError && /NoSuchPlayer/.test(err.message)
    );
  });

  it('fetchAll returns all entities in the namespace', async() => {
    await source.update(CFG, 'Bob', { name: 'Bob', level: 3 });

    const all = await source.fetchAll(CFG);
    assert.deepEqual(Object.keys(all).sort(), ['Alice', 'Bob']);
    assert.equal(all.Alice.level, 5);
    assert.equal(all.Bob.level, 3);
  });

  it('update overwrites an existing entity', async() => {
    await source.update(CFG, 'Alice', { name: 'Alice', level: 99 });

    const data = await source.fetch(CFG, 'Alice');
    assert.equal(data.level, 99);
  });

  it('fetchAll ignores non-.json files', async() => {
    fs.writeFileSync(path.join(playersDir(), 'README.txt'), 'ignore me');
    fs.writeFileSync(path.join(playersDir(), '.gitkeep'), '');

    const all = await source.fetchAll(CFG);
    assert.ok(!Object.keys(all).includes('README'), 'should ignore .txt file');
    assert.ok(!Object.keys(all).includes('.gitkeep'), 'should ignore .gitkeep');
  });

  it('update writes atomically — no .tmp file left behind', async() => {
    await source.update(CFG, 'Carol', { name: 'Carol' });

    const tmpFile = path.join(playersDir(), 'Carol.json.tmp');
    assert.equal(fs.existsSync(tmpFile), false, 'temp file should be cleaned up');
  });
});
