// bundles/factions/lib/ReputationStore.js
'use strict';

/**
 * @template T
 * @template {any[]} [A=any[]]\
 * @typedef {import('types').Ctor<T, A>} Ctor
 */

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('../../storage/lib/SqlStore')} SqlStore */

const { SCORE_MIN, SCORE_MAX } = require('../constants');
const { FACTIONS_DB_MIGRATIONS } = require('./migrations');

function _clamp(value) {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, value));
}

class ReputationStore {
  /**
   * Private — use ReputationStore.create(state).
   *
   * @param {SqlStore} sqlStore
   */
  constructor(sqlStore) {
    this._sqlStore = sqlStore;
    this.db = sqlStore.db;
    this._prepare();
  }

  /**
   * @param {GameState} state
   * @returns {Promise<ReputationStore>}
   */
  static async create(state) {
    const sqlStore = await state.Storage.getDatabase('factions', FACTIONS_DB_MIGRATIONS);
    return new ReputationStore(sqlStore);
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
    for (const stmt of Object.values(this._stmts ?? [])) stmt.free();
    this._sqlStore.save();
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
    return this._get(this._stmts?.get, {
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

    this._run(this._stmts?.upsert, {
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
    this._run(this._stmts?.logEvent, {
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
    return this._all(this._stmts?.getHistory, {
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
    return this._all(this._stmts?.getAllForPlayer, {
      '@player_id': playerId,
    });
  }

  close() {
    for (const stmt of Object.values(this._stmts ?? [])) stmt.free();
    this._sqlStore.close();
  }
}

module.exports = { ReputationStore };
