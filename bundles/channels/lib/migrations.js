// bundles/channels/lib/migrations.js
'use strict';

/** @typedef {import('../../storage/lib/SqlMigrator').SqlMigration} SqlMigration */

/** @type {SqlMigration[]} */
const CHANNELS_DB_MIGRATIONS = [
  {
    id: '001_initial_schema',
    up(db) {
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          channel  TEXT NOT NULL,
          sender   TEXT NOT NULL,
          body     TEXT NOT NULL,
          ts       INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages (channel, id);
        CREATE INDEX IF NOT EXISTS idx_messages_channel_ts ON messages (channel, ts);

        CREATE TABLE IF NOT EXISTS read_cursors (
          channel     TEXT NOT NULL,
          player      TEXT NOT NULL,
          lastReadId  INTEGER NOT NULL,
          PRIMARY KEY (channel, player)
        );
      `);
    },
  },
];

module.exports = { CHANNELS_DB_MIGRATIONS };
