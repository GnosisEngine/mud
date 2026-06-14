// bundles/storage/lib/SqlMigrator.js
'use strict';

/**
 * @typedef {object} SqlMigration
 * @property {string} id Unique, stable identifier (e.g. '001_initial_schema')
 * @property {(db: import('sql.js').Database) => void} up
 */

/**
 * Apply an ordered list of migrations to a sql.js database, tracking which
 * have already run in a `schema_migrations` table. Safe to call on every
 * boot — migrations whose id is already recorded are skipped.
 *
 * @param {import('sql.js').Database} db
 * @param {SqlMigration[]} migrations
 */
function applyMigrations(db, migrations) {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const checkStmt = db.prepare('SELECT 1 FROM schema_migrations WHERE id = @id');

  try {
    for (const migration of migrations) {
      checkStmt.bind({ '@id': migration.id });
      const alreadyApplied = checkStmt.step();
      checkStmt.reset();

      if (alreadyApplied) {
        continue;
      }

      migration.up(db);

      db.run('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)', [migration.id, Date.now()]);
    }
  } finally {
    checkStmt.free();
  }
}

/**
 * @param {import('sql.js').Database} db
 * @returns {string[]} ids of migrations already applied, in application order
 */
function appliedMigrations(db) {
  const tableCheck = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'");
  let exists;
  try {
    exists = tableCheck.step();
  } finally {
    tableCheck.free();
  }

  if (!exists) {
    return [];
  }

  const stmt = db.prepare('SELECT id FROM schema_migrations ORDER BY applied_at ASC, id ASC');
  const ids = [];

  try {
    while (stmt.step()) {
      ids.push(stmt.getAsObject().id);
    }
  } finally {
    stmt.free();
  }

  return ids;
}

module.exports = { applyMigrations, appliedMigrations };
