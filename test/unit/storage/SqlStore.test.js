// test/unit/storage/SqlStore.test.js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SqlStore = require('../../../bundles/storage/lib/SqlStore');
const { applyMigrations, appliedMigrations } = require('../../../bundles/storage/lib/SqlMigrator');

function tmpDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlstore-test-'));
  return path.join(dir, 'test.db');
}

const WIDGETS_MIGRATIONS = [
  {
    id: '001_create_widgets',
    up: db => db.run('CREATE TABLE widgets (id TEXT PRIMARY KEY, name TEXT NOT NULL)'),
  },
  {
    id: '002_add_color_column',
    up: db => db.run('ALTER TABLE widgets ADD COLUMN color TEXT'),
  },
];

describe('SqlMigrator', () => {
  it('applies each migration once and records it', async() => {
    const store = await SqlStore.create(tmpDbPath(), WIDGETS_MIGRATIONS);

    assert.deepEqual(appliedMigrations(store.db), ['001_create_widgets', '002_add_color_column']);

    store.db.run("INSERT INTO widgets (id, name, color) VALUES ('w1', 'Sprocket', 'red')");
    const row = store.db.exec('SELECT * FROM widgets')[0];
    assert.deepEqual(row.columns, ['id', 'name', 'color']);
    assert.deepEqual(row.values, [['w1', 'Sprocket', 'red']]);

    store.close();
  });

  it('does not re-run already-applied migrations', async() => {
    const store = await SqlStore.create(tmpDbPath(), WIDGETS_MIGRATIONS);

    // Re-applying should be a no-op even though 002 uses ALTER TABLE, which
    // would error if run twice against the same table.
    applyMigrations(store.db, WIDGETS_MIGRATIONS);
    applyMigrations(store.db, WIDGETS_MIGRATIONS);

    assert.deepEqual(appliedMigrations(store.db), ['001_create_widgets', '002_add_color_column']);

    store.close();
  });
});

describe('SqlStore', () => {
  it('persists data across save and reload', async() => {
    const dbPath = tmpDbPath();

    const store1 = await SqlStore.create(dbPath, WIDGETS_MIGRATIONS);
    store1.db.run("INSERT INTO widgets (id, name, color) VALUES ('w1', 'Sprocket', 'red')");
    store1.save();
    store1.close();

    const store2 = await SqlStore.create(dbPath, WIDGETS_MIGRATIONS);
    const row = store2.db.exec('SELECT * FROM widgets')[0];
    assert.deepEqual(row.values, [['w1', 'Sprocket', 'red']]);

    // Migrations table survived the round trip too, and isn't re-applied.
    assert.deepEqual(appliedMigrations(store2.db), ['001_create_widgets', '002_add_color_column']);

    store2.close();
  });

  it('creates the data directory if it does not exist', async() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlstore-test-'));
    const dbPath = path.join(dir, 'nested', 'deeper', 'test.db');

    const store = await SqlStore.create(dbPath, WIDGETS_MIGRATIONS);
    store.save();

    assert.ok(fs.existsSync(dbPath), 'db file should be written even though parent dirs did not exist');

    store.close();
  });
});
