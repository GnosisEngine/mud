// bundles/ranvier-storage/index.js
'use strict';

const path = require('path');
const { Log } = require('../lib/log');
const { Graph } = require('../lib/graph');
const { Db } = require('../lib/db');
const { replay } = require('../lib/replay');
const { compact } = require('../lib/compaction');
const { Store } = require('../lib/store');
const { DATA_DIR, COMPACT_THRESHOLD, LOGOUT_GRACE_MS } = require('../constants');

/**
 * ranvier-storage bundle
 *
 * Provides a Store instance to the rest of the game via GameState.
 * Other bundles access it as:
 *
 *   const { store } = state.StorageManager;
 *
 * Startup sequence:
 *   1. Instantiate Log and Db
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

// ---------------------------------------------------------------------------
// Bundle state — module-scoped, initialised in startup listener
// ---------------------------------------------------------------------------

let store = null;
let expiryTimer = null;

// ---------------------------------------------------------------------------
// Ranvier bundle export
// ---------------------------------------------------------------------------

module.exports = {
  /**
   * Called by Ranvier's BundleManager when the bundle is loaded.
   * Receives the full GameState so we can register StorageManager.
   */
  listeners: {
    /**
     * 'startup' fires after all bundles are loaded but before the server
     * begins accepting connections — safe to do async I/O here.
     */
    startup: state => async () => {
      console.log('[claims-storage] initializing...');

      // Layer 3 — log
      const log = new Log(DATA_DIR, COMPACT_THRESHOLD);

      // Layer 7 — SQLite packages
      const db = new Db(DATA_DIR);

      // Layer 5 — replay log into a fresh graph
      const graph = await replay(log);

      // Layer 6 — compact immediately, reset log to current state
      await compact(log, graph);

      // Layer 8 — store, the single public API surface
      store = new Store(log, graph, db);

      // Register on GameState so other bundles can reach it
      state.StorageManager = { store };

      // Expiry flush timer — checks for timed-out claims on interval
      expiryTimer = setInterval(async () => {
        const count = await store.flushExpiredClaims();

        if (count > 0) {
          console.log(`[claims-storage] flushed ${count} expired claim(s)`);
        }
      }, LOGOUT_GRACE_MS);

      // Prevent the timer from keeping the process alive on shutdown
      if (expiryTimer.unref) expiryTimer.unref();

      console.log('[claims-storage] ready');
    },

    /**
     * 'shutdown' fires when the server is gracefully stopping.
     * Final compaction ensures the log is clean for the next boot.
     */
    shutdown: state => async () => {
      console.log('[claims-storage] shutting down...');

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

      console.log('[claims-storage] shutdown complete');
    }
  },
};