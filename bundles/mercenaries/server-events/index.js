// bundles/vendor-npcs/server-events/index.js
'use strict';

/** @typedef {import('../../../types/state').GameState} GameState */
/** @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer */

require('../hints');
const { Logger } = require('ranvier');
const startupPoll = require('../../lib/lib/StartupPoll');
const MercenaryService = require('../lib/MercenaryService');

// Module-scoped handle so shutdown can clear it.
let tickInterval = null;

module.exports = {
  listeners: {
    /**
     * Startup sequence:
     *   1. Build MercenaryService and register it on state synchronously so
     *      that any bundle that loads after vendor-npcs can reference it.
     *   2. Poll until both state.WorldManager (world bundle) and
     *      state.StorageManager (claims bundle) are ready.
     *   3. Call service.boot() to reconstruct active contracts from player files
     *      and spawn mercs at their home rooms.
     *   4. Start the 1-second tick interval that drives billing and movement.
     * @param {GameState} state
     * @returns {function(string, RanvierPlayer): void}
     */
    startup: state => async() => {
      // Step 1 — build and register synchronously.
      const service = MercenaryService.build();
      state.MercenaryService = service;

      Logger.log('[mercenaries] MercenaryService registered. Waiting for dependencies...');

      // Step 2 — poll for WorldManager and StorageManager.
      await startupPoll(
        () => !!state.WorldManager && !!state.StorageManager,
        async() => {
          Logger.log('[mercenaries] Dependencies ready. Running boot scan...');

          // Step 3 — reconstruct active contracts from player save files.
          await service.boot(state);

          Logger.log('[mercenaries] Boot complete. Starting tick interval.');

          // Step 4 — 1-second tick: billing checks and merc movement.
          tickInterval = setInterval(() => {
            try {
              service.tick(state);
            } catch (err) {
              Logger.error(`[mercenaries] tick error: ${err.message}`);
            }
          }, 1000);

          if (tickInterval.unref) tickInterval.unref();
        }
      );
    },

    /**
     * Shutdown: clear the tick interval cleanly so the process can exit.
     */
    shutdown: _state => async() => {
      if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
      }
      Logger.log('[mercenaries] tick interval cleared.');
    },
  },
};
