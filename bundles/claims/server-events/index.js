// bundles/claims/server-events/index.js
'use strict';

/** @typedef {import('types').GameState} GameState */

require('../hints');
const { Db } = require('../lib/db');
const codec = require('../lib/codec');
const { replay } = require('../lib/replay');
const { compact } = require('../lib/compaction');
const { Store } = require('../lib/store');
const { COMPACT_THRESHOLD, LOGOUT_GRACE_MS } = require('../constants');
const { Logger } = require('ranvier');
const startupPoll = require('../../lib/lib/StartupPoll');
/**
 * claims storage wiring
 *
 * Provides a Store instance to the rest of the game via GameState.
 * Other bundles access it as:
 *
 *   const { store } = state.StorageManager;
 *
 * The underlying log/db primitives come from state.Storage (the storage
 * bundle's facade) — this bundle owns the claims-specific schema (migrations),
 * event codec, and replay/compaction domain logic, but not file I/O itself.
 *
 * Startup sequence:
 *   1. Get this namespace's log and db from state.Storage
 *   2. Replay claim log → hydrate graph
 *   3. Compact log → reset to current state, discard event history
 *   4. Instantiate Store with live log, graph, and db
 *   5. Start expiry flush timer
 *
 * Shutdown sequence:
 *   1. Clear timers
 *   2. Final compaction — collapses any events appended this session
 *   3. Close SQLite connection
 */

// Bundle state — module-scoped, initialised in startup listener

/** @type {InstanceType<typeof import('../lib/store').Store>|null} */
let store = null;

/** @type {ReturnType<typeof setInterval>|null} */
let expiryTimer = null;

// Ranvier bundle export

module.exports = {
  /**
   * Called by Ranvier's BundleManager when the bundle is loaded.
   * Receives the full GameState so we can register StorageManager.
   */
  listeners: {
    /**
     * 'startup' fires after all bundles are loaded but before the server
     * begins accepting connections — safe to do async I/O here.
     * @param {GameState} state
     */
    startup: state => async() => {
      Logger.log('[claims-storage] initializing...');

      // state.Storage is set by the storage bundle's own startup listener.
      // Bundle startup order is alphabetical by directory name (claims <
      // storage), not ranvier.json's declared order, so we poll rather
      // than assume it's already present.
      await startupPoll(
        () => !!state.Storage,
        async() => {
          // Layer 3 — log
          const log = state.Storage.getLog('claims', { codec, compactThreshold: COMPACT_THRESHOLD, logName: 'claims' });

          // Layer 7 — SQLite, schema applied via migrations
          const db = await Db.create(state);

          // Layer 5 — replay log into a fresh graph
          const graph = await replay(log);

          // Layer 6 — compact immediately, reset log to current state
          await compact(log, graph);

          // Layer 8 — store, the single public API surface
          store = new Store(log, graph, db);

          // Register on GameState so other bundles can reach it
          state.StorageManager = { store };

          // Expiry flush timer — checks for timed-out claims on interval
          expiryTimer = setInterval(async() => {
            if (!store) {
              return;
            }

            const count = await store.flushExpiredClaims();

            if (count > 0) {
              Logger.log(`[claims-storage] flushed ${count} expired claim(s)`);
            }
          }, LOGOUT_GRACE_MS);

          // Prevent the timer from keeping the process alive on shutdown
          if (expiryTimer.unref) expiryTimer.unref();

          Logger.log('[claims-storage] ready');
        }
      );
    },

    /**
     * 'shutdown' fires when the server is gracefully stopping.
     * Final compaction ensures the log is clean for the next boot.
     */
    shutdown: () => async() => {
      Logger.log('[claims-storage] shutting down...');

      if (expiryTimer) {
        clearInterval(expiryTimer);
        expiryTimer = null;
      }

      if (store) {
        // Flush any claims that expired during this session
        await store.flushExpiredClaims();

        // Final compaction — collapses this session's event log
        const { _log: log, _graph: graph } = store;
        await compact(log, graph);

        // Close SQLite cleanly
        store._db.close();
        store = null;
      }

      Logger.log('[claims-storage] shutdown complete');
    }
  },
};
