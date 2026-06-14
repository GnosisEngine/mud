// bundles/claims/lib/migrations.js
'use strict';

/** @typedef {import('../../storage/lib/SqlMigrator').SqlMigration} SqlMigration */

/** @type {SqlMigration[]} */
const CLAIMS_DB_MIGRATIONS = [
  {
    id: '001_initial_schema',
    up(db) {
      db.run(`
        CREATE TABLE IF NOT EXISTS packages (
          id                TEXT PRIMARY KEY,
          name              TEXT NOT NULL,
          claimantId        TEXT NOT NULL,
          attachedRoomIds   TEXT NOT NULL,
          requestedAmount   INTEGER NOT NULL,
          durationDays      INTEGER NOT NULL,
          yieldFloor        INTEGER NOT NULL,
          status            TEXT NOT NULL DEFAULT 'O',
          lenderId          TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_packages_claimantId ON packages (claimantId);
        CREATE INDEX IF NOT EXISTS idx_packages_lenderId   ON packages (lenderId);
        CREATE INDEX IF NOT EXISTS idx_packages_status     ON packages (status);
      `);
    },
  },
];

module.exports = { CLAIMS_DB_MIGRATIONS };
