// bundles/vendor-npcs/player-events.js
'use strict';

/** @typedef {import('../../types/state').GameState} GameState */
/** @typedef {import('../../types/ranvier').RanvierPlayer} RanvierPlayer */

const { Broadcast: B } = require('ranvier');

module.exports = {
  listeners: {
    /**
     * Fires when a player logs in. Scans their inventory for mercenary contract
     * items and reconciles them with the live MercenaryService registry.
     *
     * Three cases per contract item found:
     *
     *   1. Expired  — remove the item from inventory, do nothing else.
     *   2. Active, already in registry (boot found it) — store the live Item
     *      reference so billing and despawn can remove it cleanly.
     *   3. Active, not in registry (player logged in before boot completed, or
     *      the contract was acquired after the last boot scan) — no-op: the
     *      service's boot() will have already processed all files, so this
     *      case covers contracts issued during this session. If MercenaryService
     *      is not yet ready (startupPoll still running), we skip gracefully.
     *
     * `this` is the Player instance.
     * @param {GameState} state
     * @returns {function(string, RanvierPlayer): void}
     */
    login: state => function() {
      if (!state.MercenaryService) return;
      if (!this.inventory || !this.inventory.size) return;

      const now = Date.now();
      const toRemove = [];

      for (const [, item] of this.inventory) {
        const contract = item.getMeta ? item.getMeta('contract') : null;
        if (!contract || !contract.contractId) continue;

        // Case 1 — expired contract item: remove silently.
        if (contract.expiresAt && contract.expiresAt <= now) {
          toRemove.push(item);
          continue;
        }

        // Cases 2 & 3 — active contract: reconcile with registry.
        const entries = state.MercenaryService.getContractsByPlayer(this.name);
        const entry = entries.find(e => e.contractId === contract.contractId);

        if (entry && !entry.contractItem) {
          // Case 2: boot registered this contract but couldn't store the Item
          // reference because the player was offline. Wire it in now.
          entry.contractItem = item;
          entry.holderId = this.name;
        }
        // Case 3: contract not in registry at all — boot already handled
        // all player files, so this item is from the current session and
        // MercenaryService.hire() already registered it. No action needed.
      }

      for (const item of toRemove) {
        this.removeItem(item);
        state.ItemManager.remove(item);
        B.sayAt(this, `<yellow>[Mercenaries' Guild] An expired contract for ${item.getMeta('contract')?.mercName ?? 'a mercenary'} has dissolved.</yellow>`);
      }
    },
  },
};
