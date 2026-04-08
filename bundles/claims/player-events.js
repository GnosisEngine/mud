// bundles/ranvier-storage/index.js
'use strict';

module.exports = {
  /**
   * Called by Ranvier's BundleManager when the bundle is loaded.
   * Receives the full GameState so we can register StorageManager.
   */
  listeners: {
    /**
     *
     */
    login: state => function() {
      const store = state.StorageManager.store;
      store.disarmExpiryForPlayer(this.name);

      this.socket.on('close', () => {
        store.armExpiryForPlayer(this.name);
      });
    }
  },
};
