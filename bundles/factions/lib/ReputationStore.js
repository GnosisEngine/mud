// bundles/factions/lib/ReputationStore.js
'use strict';

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const { SCORE_MIN, SCORE_MAX } = require('../constants');

let _SQL = null;

async function _getSQL() {
  if (!_SQL) _SQL = await initSqlJs();
  return _SQL;
}

function _clamp(value) {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, value));
}

class ReputationStore {
  constructor(dbPath, sqlInstance, buf) {
    this._dbPath = dbPath;
    this._SQL = sqlInstance;
    this.db = buf ? new sqlInstance.Database(buf) : new sqlInstance.Database();
    this._migrate();
    this._prepare();
  }

  static async create(dataDir) {
    const SQL = await _getSQL();
    const dbPath = process.env.NODE_ENV === 'test'
      ? path.join(dataDir, 'factions-test.db')
      : path.join(dataDir, 'factions.db');
    const buf = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
    return new ReputationStore(dbPath, SQL, buf);
  }

  _migrate() {
    this.db.run(`
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
  }

  _prepare() {
    this._stmts = {
      get: this.db.prepare(
        'SELECT * FROM reputation WHERE player_id = @player_id AND faction_id = @faction_id'
      ),
      upsert: this.db.prepare(`
        INSERT INTO reputation (player_id, faction_id, affinity, honor, trust, debt, updated_at)
        VALUES (@player_id, @faction_id, @affinity, @honor, @trust, @debt, @updated_at)
        ON CONFLICT (player_id, faction_id) DO UPDATE SET
          affinity   = @affinity,
          honor      = @honor,
          trust      = @trust,
          debt       = @debt,
          updated_at = @updated_at
      `),
      logEvent: this.db.prepare(`
        INSERT INTO reputation_events
          (id, player_id, faction_id, event_type,
          affinity_delta, honor_delta, trust_delta, debt_delta, ts)
        VALUES
          (@id, @player_id, @faction_id, @event_type,
          @affinity_delta, @honor_delta, @trust_delta, @debt_delta, @ts)
      `),
      getHistory: this.db.prepare(
        'SELECT * FROM reputation_events WHERE player_id = @player_id AND faction_id = @faction_id ORDER BY ts DESC'
      ),
      getAllForPlayer: this.db.prepare(
        'SELECT * FROM reputation WHERE player_id = @player_id'
      ),
    };
  }

  _run(stmt, params) {
    stmt.run(params);
    this._persist();
  }

  _get(stmt, params) {
    const row = stmt.getAsObject(params);
    if (!row || Object.keys(row).length === 0) return null;
    if (row.player_id === undefined || row.player_id === null) return null;
    return row;
  }

  _all(stmt, params) {
    if (params) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.reset();
    return rows;
  }

  _persist() {
    for (const stmt of Object.values(this._stmts)) stmt.free();
    const data = this.db.export();
    fs.writeFileSync(this._dbPath, Buffer.from(data));
    this._prepare();
  }

  /**
   * Returns the reputation row for a player/faction pair, or null if none exists.
   *
   * @param {string}  playerId
   * @param {number}  factionId
   * @returns {object|null}
   */
  get(playerId, factionId) {
    return this._get(this._stmts.get, {
      '@player_id':  playerId,
      '@faction_id': factionId,
    });
  }

  /**
   * Applies axis deltas to a player/faction reputation row.
   * Inserts the row if it does not exist. Clamps each axis to [SCORE_MIN, SCORE_MAX].
   *
   * @param {string}  playerId
   * @param {number}  factionId
   * @param {{ affinity?, honor?, trust?, debt? }} deltas
   * @param {number}  now   - Unix timestamp (ms)
   */
  upsertDelta(playerId, factionId, deltas, now) {
    const existing = this.get(playerId, factionId);
    const base = existing
      ? { affinity: existing.affinity, honor: existing.honor, trust: existing.trust, debt: existing.debt }
      : { affinity: 0, honor: 0, trust: 0, debt: 0 };

    this._run(this._stmts.upsert, {
      '@player_id':  playerId,
      '@faction_id': factionId,
      '@affinity':   _clamp(base.affinity + (deltas.affinity ?? 0)),
      '@honor':      _clamp(base.honor    + (deltas.honor    ?? 0)),
      '@trust':      _clamp(base.trust    + (deltas.trust    ?? 0)),
      '@debt':       _clamp(base.debt     + (deltas.debt     ?? 0)),
      '@updated_at': now,
    });
  }

  /**
   * Appends one row to the reputation_events audit log.
   *
   * @param {string}  id         - nanoid event id
   * @param {string}  playerId
   * @param {number}  factionId
   * @param {string}  eventType
   * @param {{ affinity, honor, trust, debt }} deltas
   * @param {number}  now
   */
  logEvent(id, playerId, factionId, eventType, deltas, now) {
    this._run(this._stmts.logEvent, {
      '@id':             id,
      '@player_id':      playerId,
      '@faction_id':     factionId,
      '@event_type':     eventType,
      '@affinity_delta': deltas.affinity ?? 0,
      '@honor_delta':    deltas.honor    ?? 0,
      '@trust_delta':    deltas.trust    ?? 0,
      '@debt_delta':     deltas.debt     ?? 0,
      '@ts':             now,
    });
  }

  /**
   * Returns all reputation_events for a player/faction pair, newest first.
   *
   * @param {string}  playerId
   * @param {number}  factionId
   * @returns {object[]}
   */
  getHistory(playerId, factionId) {
    return this._all(this._stmts.getHistory, {
      '@player_id':  playerId,
      '@faction_id': factionId,
    });
  }

  /**
   * Returns all reputation rows for a player across all factions.
   *
   * @param {string} playerId
   * @returns {object[]}
   */
  getAllForPlayer(playerId) {
    return this._all(this._stmts.getAllForPlayer, {
      '@player_id': playerId,
    });
  }

  close() {
    for (const stmt of Object.values(this._stmts)) stmt.free();
    this.db.close();
  }
}

module.exports = { ReputationStore };
