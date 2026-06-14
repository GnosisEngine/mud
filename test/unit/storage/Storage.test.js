// test/unit/storage/Storage.test.js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { Storage } = require('../../../bundles/storage/lib/Storage');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'));
}

const WIDGETS_MIGRATIONS = [
  {
    id: '001_create_widgets',
    up: db => db.run('CREATE TABLE widgets (id TEXT PRIMARY KEY, name TEXT NOT NULL)'),
  },
];

describe('Storage', () => {
  it('throws if used before configure()', () => {
    const storage = new Storage();
    assert.throws(() => storage.getDataRoot(), /configure/);
  });

  it('namespaces databases under <dataRoot>/<namespace>/<namespace>.db', async() => {
    const root = tmpRoot();
    const storage = new Storage();
    storage.configure({ dataRoot: root });

    const db = await storage.getDatabase('claims', WIDGETS_MIGRATIONS);
    db.db.run("INSERT INTO widgets (id, name) VALUES ('w1', 'Sprocket')");
    db.save();

    assert.ok(fs.existsSync(path.join(root, 'claims', 'claims.db')));
  });

  it('returns the same database instance for repeated calls', async() => {
    const storage = new Storage();
    storage.configure({ dataRoot: tmpRoot() });

    const a = await storage.getDatabase('claims', WIDGETS_MIGRATIONS);
    const b = await storage.getDatabase('claims', WIDGETS_MIGRATIONS);

    assert.equal(a, b);
  });

  it('namespaces logs under <dataRoot>/<namespace>/', () => {
    const root = tmpRoot();
    const storage = new Storage();
    storage.configure({ dataRoot: root });

    const log = storage.getLog('channels', { logName: 'channels' });
    log.append('CREATE', { id: 'c1' });
    log.flushBestEffort();

    assert.ok(fs.existsSync(path.join(root, 'channels', 'segments', 'channels.000001')));
  });

  it('returns the same log instance for repeated calls', () => {
    const storage = new Storage();
    storage.configure({ dataRoot: tmpRoot() });

    const a = storage.getLog('claims');
    const b = storage.getLog('claims');

    assert.equal(a, b);
  });

  it('shutdownAll saves databases and flushes logs', async() => {
    const root = tmpRoot();
    const storage = new Storage();
    storage.configure({ dataRoot: root });

    const db = await storage.getDatabase('factions', WIDGETS_MIGRATIONS);
    db.db.run("INSERT INTO widgets (id, name) VALUES ('w1', 'Sprocket')");

    const log = storage.getLog('claims', { logName: 'claims' });
    log.append('CREATE', { id: 'a1' });

    storage.shutdownAll();

    assert.ok(fs.existsSync(path.join(root, 'factions', 'factions.db')));

    const reopened = await storage.getDatabase('factions-readback', []);
    const buf = fs.readFileSync(path.join(root, 'factions', 'factions.db'));
    assert.ok(buf.length > 0);

    const segment = fs.readFileSync(path.join(root, 'claims', 'segments', 'claims.000001'), 'utf8');
    assert.match(segment, /"a1"/);

    // avoid unused var lint complaints / leaked db handle in this throwaway test
    reopened.close();
  });

  it('cleanup removes a test data root but not a non-test one', async() => {
    const testRoot = tmpRoot();
    const testStorage = new Storage();
    testStorage.configure({ dataRoot: testRoot, isTestRoot: true });
    await testStorage.getDatabase('claims', WIDGETS_MIGRATIONS);
    testStorage.cleanup();
    assert.equal(fs.existsSync(testRoot), false, 'test root should be removed');

    const realRoot = tmpRoot();
    const realStorage = new Storage();
    realStorage.configure({ dataRoot: realRoot, isTestRoot: false });
    await realStorage.getDatabase('claims', WIDGETS_MIGRATIONS);
    realStorage.cleanup();
    assert.equal(fs.existsSync(realRoot), true, 'non-test root should survive cleanup');
  });
});
