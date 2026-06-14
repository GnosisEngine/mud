// bundles/factions/lib/migrations.js
'use strict';

/** @typedef {import('../../storage/lib/SqlMigrator').SqlMigration} SqlMigration */

/** @type {SqlMigration[]} */
const FACTIONS_DB_MIGRATIONS = [
  {
    id: '001_initial_schema',
    up(db) {
      db.run(`
        CREATE TABLE IF NOT EXISTS reputation (
          player_id   TEXT    NOT NULL,
          faction_id  INTEGER NOT NULL,
          affinity    INTEGER NOT NULL DEFAULT 0,
          honor       INTEGER NOT NULL DEFAULT 0,
          trust       INTEGER NOT NULL DEFAULT 0,
          debt        INTEGER NOT NULL DEFAULT 0,
          updated_at  INTEGER NOT NULL,
          PRIMARY KEY (player_id, faction_id)
        );

        CREATE TABLE IF NOT EXISTS reputation_events (
          id              TEXT    PRIMARY KEY,
          player_id       TEXT    NOT NULL,
          faction_id      INTEGER NOT NULL,
          event_type      TEXT    NOT NULL,
          affinity_delta  INTEGER NOT NULL DEFAULT 0,
          honor_delta     INTEGER NOT NULL DEFAULT 0,
          trust_delta     INTEGER NOT NULL DEFAULT 0,
          debt_delta      INTEGER NOT NULL DEFAULT 0,
          ts              INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_rep_player_faction
          ON reputation (player_id, faction_id);

        CREATE INDEX IF NOT EXISTS idx_rep_events_player
          ON reputation_events (player_id, faction_id);
      `);
    },
  },
];

module.exports = { FACTIONS_DB_MIGRATIONS };
