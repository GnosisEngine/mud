// bundles/channels/lib/messageStore.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('../../storage/lib/SqlStore')} SqlStore */

const { CHANNELS_DB_MIGRATIONS } = require('./migrations');

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // one week

/**
 * @typedef {object} ChannelMessage
 * @property {number} id
 * @property {string} channel
 * @property {string} sender
 * @property {string} body
 * @property {number} ts
 */

/**
 * Append-only log of messages sent on persistent dynamic channels, plus a
 * per-player read cursor used by 'channel recap'. Backed by the storage
 * bundle's SqlStore so "messages after id X" is an indexed query rather
 * than a log scan.
 *
 * Retention: on every append, rows older than RETENTION_MS for that channel
 * are pruned. A channel that goes quiet for longer than the retention
 * window will simply have no backlog left when someone next posts.
 */
class MessageStore {
  /**
   * Private — use MessageStore.create(state).
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
   * @returns {Promise<MessageStore>}
   */
  static async create(state) {
    const sqlStore = await state.Storage.getDatabase('channels', CHANNELS_DB_MIGRATIONS);
    return new MessageStore(sqlStore);
  }

  _prepare() {
    this._stmts = {
      insert: this.db.prepare(`
        INSERT INTO messages (channel, sender, body, ts)
        VALUES (@channel, @sender, @body, @ts)
      `),
      prune: this.db.prepare('DELETE FROM messages WHERE channel = @channel AND ts < @cutoff'),
      getSince: this.db.prepare(`
        SELECT * FROM messages
        WHERE channel = @channel AND id > @afterId
        ORDER BY id ASC
      `),
      getCursor: this.db.prepare('SELECT lastReadId FROM read_cursors WHERE channel = @channel AND player = @player'),
      setCursor: this.db.prepare(`
        INSERT INTO read_cursors (channel, player, lastReadId)
        VALUES (@channel, @player, @lastReadId)
        ON CONFLICT (channel, player) DO UPDATE SET lastReadId = @lastReadId
      `),
    };
  }

  _persist() {
    for (const stmt of Object.values(this._stmts ?? {})) stmt.free();
    this._sqlStore.save();
    this._prepare();
  }

  /**
   * Appends a message to a channel's log and prunes anything older than
   * the retention window for that channel.
   *
   * @param {string} channel
   * @param {string} sender
   * @param {string} body
   * @param {number} [now]
   */
  append(channel, sender, body, now = Date.now()) {
    this._stmts.insert.run({
      '@channel': channel,
      '@sender':  sender,
      '@body':    body,
      '@ts':      now,
    });

    this._stmts.prune.run({
      '@channel': channel,
      '@cutoff':  now - RETENTION_MS,
    });

    this._persist();
  }

  /**
   * @param {string} channel
   * @param {number} afterId Exclusive lower bound — pass the player's cursor
   * @returns {ChannelMessage[]}
   */
  getSince(channel, afterId) {
    const stmt = this._stmts.getSince;
    stmt.bind({ '@channel': channel, '@afterId': afterId });
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.reset();
    return rows;
  }

  /**
   * @param {string} channel
   * @param {string} player
   * @returns {number} the player's last-read message id for this channel, or 0
   */
  getCursor(channel, player) {
    const row = this._stmts.getCursor.getAsObject({ '@channel': channel, '@player': player });
    if (!row || Object.keys(row).length === 0 || row.lastReadId === undefined || row.lastReadId === null) {
      return 0;
    }
    return row.lastReadId;
  }

  /**
   * @param {string} channel
   * @param {string} player
   * @param {number} lastReadId
   */
  setCursor(channel, player, lastReadId) {
    this._stmts.setCursor.run({ '@channel': channel, '@player': player, '@lastReadId': lastReadId });
    this._persist();
  }

  close() {
    for (const stmt of Object.values(this._stmts ?? {})) stmt.free();
    this._sqlStore.close();
  }
}

module.exports = MessageStore;
