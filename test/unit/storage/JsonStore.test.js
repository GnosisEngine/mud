// test/unit/storage/JsonStore.test.js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const JsonStore = require('../../../bundles/storage/lib/JsonStore');

function tmpPath(filename = 'data.json') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonstore-test-'));
  return path.join(dir, filename);
}

describe('JsonStore', () => {
  it('returns defaultValue when the file does not exist', () => {
    const store = new JsonStore(tmpPath(), { tick: 0 });
    assert.deepEqual(store.load(), { tick: 0 });
  });

  it('returns null default when no defaultValue is provided and file is absent', () => {
    const store = new JsonStore(tmpPath());
    assert.equal(store.load(), null);
  });

  it('persists and reloads a value', () => {
    const store = new JsonStore(tmpPath(), { tick: 0 });
    store.save({ tick: 42 });
    assert.deepEqual(store.load(), { tick: 42 });
  });

  it('creates parent directories that do not exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonstore-test-'));
    const p = path.join(dir, 'nested', 'deep', 'data.json');
    const store = new JsonStore(p, null);
    store.save({ x: 1 });
    assert.ok(fs.existsSync(p));
  });

  it('writes atomically — no partial file on read after save', () => {
    const p = tmpPath();
    const store = new JsonStore(p, []);
    store.save([1, 2, 3]);
    store.save([4, 5, 6]);
    assert.deepEqual(store.load(), [4, 5, 6]);
    assert.equal(fs.existsSync(`${p}.tmp`), false, 'temp file should be cleaned up');
  });

  it('returns defaultValue on corrupt JSON', () => {
    const p = tmpPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, 'not json at all!!!', 'utf8');
    const store = new JsonStore(p, { tick: 0 });
    assert.deepEqual(store.load(), { tick: 0 });
  });

  it('round-trips complex data structures', () => {
    const store = new JsonStore(tmpPath());
    const data = {
      channels: {
        cabal: { password: 'abc', owner: 'alice', members: ['alice', 'bob'] },
      },
    };
    store.save(data);
    assert.deepEqual(store.load(), data);
  });
});
