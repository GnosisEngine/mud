// bundles/storage/server-events/index.js
'use strict';

/** @typedef {import('types').GameState} GameState */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { Config, Logger } = require('ranvier');
const storage = require('../lib/Storage');

module.exports = {
  listeners: {
    /**
     * Configures the Storage facade and exposes it as state.Storage.
     * Must complete synchronously (before any await) so that other
     * bundles' startup listeners — fired via the same emit() loop — see
     * state.Storage already configured, as long as this bundle is listed
     * before them in ranvier.json.
     *
     * @param {GameState} state
     * @returns {function(): Promise<void>}
     */
    startup: state => async() => {
      if (process.env.NODE_ENV === 'test') {
        const override = process.env.FIEF_TEST_DATA_DIR;

        if (override) {
          storage.configure({ dataRoot: override, isTestRoot: false });
        } else {
          const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fief-test-'));
          storage.configure({ dataRoot, isTestRoot: true });
        }
      } else {
        const dataRoot = path.resolve(__dirname, '..', '..', '..', Config.get('dataDir') || 'data');
        storage.configure({ dataRoot, isTestRoot: false });
      }

      state.Storage = storage;

      Logger.log(`[storage] data root: ${storage.getDataRoot()}`);
    },

    /**
     * Flush and close every open log/database. Test cleanup (removing a
     * test data root) happens via state.Storage.cleanup(), called by the
     * test harness — not here, so a real shutdown never deletes data.
     */
    shutdown: () => async() => {
      storage.shutdownAll();
    },
  },
};
