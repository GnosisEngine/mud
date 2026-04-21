// bundles/ranvier-storage/index.js
'use strict';

/** @typedef {import('types').GameState} GameState */
/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

module.exports = {
  /**
   * Called by Ranvier's BundleManager when the bundle is loaded.
   * Receives the full GameState so we can register StorageManager.
   */
  listeners: {
    /**
     * @param {GameState} state
     * @returns {function(): void}
     */
    login: state => /** @this {RanvierPlayer} */function() {
      const store = state.StorageManager.store;
      store.disarmExpiryForPlayer(this.name);

      if (!this.socket) {
        throw new TypeError('Socket not ready');
      }

      this.socket.on('close', () => {
        store.armExpiryForPlayer(this.name);
      });
    }
  },
};
