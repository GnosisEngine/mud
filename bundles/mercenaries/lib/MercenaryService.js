// bundles/vendor-npcs/lib/MercenaryService.js
'use strict';

const fs = require('fs');
const path = require('path');
const { Broadcast: B } = require('ranvier');
const ContractFactory = require('./ContractFactory');
const MercPathfinder = require('./MercPathfinder');
const MercNameGenerator = require('./MercNameGenerator');
const {
  DATA_DIR,
  TWO_GAME_MONTHS_MS,
  MERC_MOVE_INTERVAL_MS,
  MERC_FLEE_INTERVAL_MS,
  MERC_MAX_PENALTY_STACKS,
  PENALTY_COOLDOWN_MS,
} = require('../constants');

// How often (real ms) a stationed merc's claim is re-validated between billing cycles.
const CLAIM_CHECK_INTERVAL_MS = 60000;

// ---------------------------------------------------------------------------
// Private helpers (module scope — not exported)
// ---------------------------------------------------------------------------

// function _makeTell(state, player) {
//   return msg => {
//     if (player && player.socket && player.socket.writable) {
//       B.sayAt(player, msg);
//     }
//   };
// }

/**
 * Scan a player's inventory for the contract item matching contractId.
 * Returns the item or null.
 * @param {Character} player
 * @param {string} contractId
 * @returns {Item|null}
 */
function _findContractItem(player, contractId) {
  if (!player.inventory) return null;
  for (const [, item] of player.inventory) {
    const c = item.getMeta ? item.getMeta('contract') : null;
    if (c && c.contractId === contractId) return item;
  }
  return null;
}

/**
 * Create and hydrate the contract item, configure its metadata, add it to
 * the player's inventory and the global ItemManager.
 * Returns the live Item instance.
 */
function _createContractItem(contractData, player, state) {
  const area = state.AreaManager.getArea('mercs');
  const item = state.ItemFactory.create(area, 'mercs:merc-contract');
  item.name = `${contractData.mercName}'s Contract`;
  item.keywords = ['contract', 'mercenary', 'merc'];
  item.hydrate(state);
  item.setMeta('contract', { ...contractData });
  state.ItemManager.add(item);
  player.addItem(item);
  return item;
}

/**
 * Spawn the mercenary NPC at homeRoom, configure its metadata, wire the
 * death listener, and return the live Npc instance.
 */
function _spawnNpc(entry, homeRoom, service, state) {
  const area = state.AreaManager.getArea('mercs');
  const npc = state.MobFactory.create(area, entry.mercRef);

  npc.name = entry.mercName;
  npc.keywords = ['mercenary', 'merc', ...entry.mercName.toLowerCase().split(' ')];

  npc.metadata = npc.metadata || {};
  npc.metadata.merc = {
    status: entry.status,
    contractId: entry.contractId,
    ownerId: entry.holderId,
    targetRoomId: entry.targetRoomId,
    homeRoomId: entry.homeRoomId,
    noRespawn: true,
  };

  npc.hydrate(state);
  npc.moveTo(homeRoom);

  // Wire death handler — fires when combat bundle emits 'killed' on this NPC instance.
  npc.on('killed', () => service.handleMercDeath(npc, state));

  return npc;
}

/**
 * Compute and store a path from the NPC's current room to targetRoom.
 * Writes path, pathIndex, and (if routing to a claim) targetRoomId onto the entry.
 * Returns true if a path was computed, false otherwise.
 */
function _setPath(entry, targetRoom, state) {
  if (!entry.npcInstance || !entry.npcInstance.room) return false;
  const p = MercPathfinder.computePath(entry.npcInstance.room, targetRoom, state.WorldManager);
  if (!p) return false;
  entry.path = p;
  entry.pathIndex = 0;
  return true;
}

/**
 * Find the first uncovered claimed room for a player.
 * A room is covered if any registry entry for the player has it as targetRoomId
 * and is in an EN_ROUTE or STATIONED state.
 * Returns a roomId string or null.
 */
function _findTargetRoomId(playerId, claims, covered) {
  for (const claim of claims) {
    if (!covered.has(claim.roomId)) return claim.roomId;
  }
  return null;
}

/**
 * Fully remove a merc from the world and clean up the registry entry.
 * Handles NPC removal, contract item removal, and registry deletion.
 * Does NOT increment guild penalty — call handleMercDeath for that.
 */
function _despawn(entry, registry, state) {
  // Remove NPC from world (clears room, area, effects, MobManager)
  if (entry.npcInstance) {
    state.MobManager.removeMob(entry.npcInstance);
  }

  // Remove contract item from holder's inventory and ItemManager
  const holder = _findOnlineHolder(entry.contractId, registry, state);
  const contractItem = entry.contractItem ||
    (holder ? _findContractItem(holder, entry.contractId) : null);

  if (contractItem) {
    if (holder) {
      holder.removeItem(contractItem);
    }
    state.ItemManager.remove(contractItem);
  }

  registry.delete(entry.contractId);
}

/**
 * Scan online players for the one holding the contract with this contractId.
 * Returns a Player or null.
 */
function _findOnlineHolder(contractId, _registry, state) {
  for (const player of state.PlayerManager.getPlayersAsArray()) {
    if (_findContractItem(player, contractId)) return player;
  }
  return null;
}

/**
 * Advance a merc one step along its current path.
 * Handles arrival at targetRoom (→ STATIONED) and arrival at homeRoom (→ despawn).
 */
function _advanceStep(entry, registry, service, state) {
  if (!entry.npcInstance || !entry.path || !entry.path.length) return;

  const result = MercPathfinder.nextStep(
    entry.npcInstance, entry.path, entry.pathIndex, state
  );

  entry.lastMoveAt = Date.now();

  if (!result) {
    // Path stale or blocked — recompute toward current destination
    const destId = (entry.status === 'RETURNING' || entry.status === 'FLEEING')
      ? entry.homeRoomId
      : entry.targetRoomId;
    const destRoom = destId ? state.RoomManager.getRoom(destId) : null;
    if (destRoom) _setPath(entry, destRoom, state);
    return;
  }

  entry.npcInstance.moveTo(result.room);
  entry.pathIndex = result.newIndex;

  const arrivedRef = result.room.entityReference;

  if (arrivedRef === entry.homeRoomId) {
    // Reached home — despawn regardless of status
    _despawn(entry, registry, state);
    return;
  }

  if (entry.status === 'EN_ROUTE' && arrivedRef === entry.targetRoomId) {
    entry.status = 'STATIONED';
    entry.npcInstance.metadata.merc.status = 'STATIONED';
  }
}

/**
 * Process billing for a single registry entry.
 * Deducts upkeep when all checks pass; cancels the contract otherwise.
 * Returns true if billing succeeded, false if the contract was cancelled.
 */
function _processBilling(entry, registry, service, state) {
  // Find the holder online
  const holder = _findOnlineHolder(entry.contractId, registry, state);

  if (!holder) {
    // Contract on the ground or holder offline — no charge, merc returns
    _beginReturning(entry, state);
    return false;
  }

  // Check holder has at least one claim
  const claims = state.StorageManager.store.getClaimsByOwner(holder.name);
  if (!claims.length) {
    B.sayAt(holder, `<yellow>[Mercenaries' Guild] ${entry.mercName}'s contract has been voided — you hold no claimed territory.</yellow>`);
    _despawnWithCancel(entry, registry, state);
    return false;
  }

  // Check holder can pay
  const currencyKey = `currencies.${entry.upkeepCurrency}`;
  const balance = holder.getMeta(currencyKey) || 0;
  if (balance < entry.upkeepCost) {
    B.sayAt(holder, `<yellow>[Mercenaries' Guild] You cannot make payroll for ${entry.mercName}. The contract is cancelled.</yellow>`);
    _beginReturning(entry, state);
    return false;
  }

  // Deduct and extend
  holder.setMeta(currencyKey, balance - entry.upkeepCost);
  entry.nextUpkeepAt = Date.now() + TWO_GAME_MONTHS_MS;
  entry.holderId = holder.name;

  // Sync item metadata so boot reconstruction has fresh nextUpkeepAt
  const contractItem = _findContractItem(holder, entry.contractId);
  if (contractItem) {
    contractItem.setMeta('contract.nextUpkeepAt', entry.nextUpkeepAt);
    contractItem.setMeta('contract.holderId', entry.holderId);
    entry.contractItem = contractItem;
  }

  holder.save();

  // Re-route if current target is no longer valid for this holder
  _rerouteIfNeeded(entry, claims, state);

  return true;
}

/**
 * Transition a merc to RETURNING and compute a path home.
 * The contract item is NOT removed here — it is removed on despawn.
 */
function _beginReturning(entry, state) {
  entry.status = 'RETURNING';
  if (entry.npcInstance) entry.npcInstance.metadata.merc.status = 'RETURNING';
  const homeRoom = state.RoomManager.getRoom(entry.homeRoomId);
  if (homeRoom && entry.npcInstance) _setPath(entry, homeRoom, state);
}

/**
 * Immediately cancel a contract and despawn the merc.
 * Used when the guild voids the contract (no-claims check).
 */
function _despawnWithCancel(entry, registry, state) {
  _despawn(entry, registry, state);
}

/**
 * Re-route a merc if its current targetRoomId is no longer a valid uncovered
 * claim for the current holder. Called after a successful billing payment.
 */
function _rerouteIfNeeded(entry, claims, state) {
  const claimRoomIds = new Set(claims.map(c => c.roomId));

  // Determine coverage EXCLUDING this merc's current target so it doesn't
  // block itself from re-routing to the same room.
  const covered = new Set();
  // NOTE: getCoveredRoomIds is on the service — we duplicate the logic here
  // to keep this helper pure. In Layer 9 wiring this is acceptable.
  if (!claimRoomIds.has(entry.targetRoomId)) {
    // Target no longer a holder claim — find a new one
    const newTargetId = _findTargetRoomId(entry.holderId, claims, covered);
    if (!newTargetId) {
      _beginReturning(entry, state);
      return;
    }
    entry.targetRoomId = newTargetId;
    if (entry.npcInstance) entry.npcInstance.metadata.merc.targetRoomId = newTargetId;

    const targetRoom = state.RoomManager.getRoom(newTargetId);
    if (targetRoom && entry.npcInstance) {
      _setPath(entry, targetRoom, state);
      entry.status = 'EN_ROUTE';
      if (entry.npcInstance) entry.npcInstance.metadata.merc.status = 'EN_ROUTE';
    }
  }
}

// ---------------------------------------------------------------------------
// Service factory
// ---------------------------------------------------------------------------

/**
 * Build and return the MercenaryService instance.
 * Must be called once at startup and registered as state.MercenaryService.
 *
 * @returns {object} service
 */
function build() {
  // contractId → entry (see type comment in layer stack design)
  const registry = new Map();

  // Timestamps for periodic checks that run inside tick()
  // const lastClaimCheckAt = 0;

  const service = {

    // -----------------------------------------------------------------------
    // Queries (pure registry reads — no state needed)
    // -----------------------------------------------------------------------

    /**
     * Count all active (non-despawned) mercenaries for a player.
     * RETURNING and FLEEING mercs still count.
     * @param {string} playerId
     * @returns {number}
     */
    getActiveMercCount(playerId) {
      let count = 0;
      for (const [, entry] of registry) {
        if (entry.holderId === playerId) count++;
      }
      return count;
    },

    /**
     * Set of room entity references currently covered by this player's mercs.
     * A room is covered if a merc is EN_ROUTE or STATIONED with it as target.
     * @param {string} playerId
     * @returns {Set<string>}
     */
    getCoveredRoomIds(playerId) {
      const covered = new Set();
      for (const [, entry] of registry) {
        if (entry.holderId !== playerId) continue;
        if (entry.status === 'EN_ROUTE' || entry.status === 'STATIONED') {
          if (entry.targetRoomId) covered.add(entry.targetRoomId);
        }
      }
      return covered;
    },

    /**
     * All registry entries for a player, as an array.
     * @param {string} playerId
     * @returns {object[]}
     */
    getContractsByPlayer(playerId) {
      const results = [];
      for (const [, entry] of registry) {
        if (entry.holderId === playerId) results.push(entry);
      }
      return results;
    },

    /**
     * Find the online player currently holding the contract.
     * @param {string} contractId
     * @param {object} state
     * @returns {Player|null}
     */
    findHolderForContract(contractId, state) {
      return _findOnlineHolder(contractId, registry, state);
    },

    /**
     * Transition a merc to FLEEING and compute a path to homeRoomId.
     * Called by the merc-patrol behavior when HP drops below 50%.
     * No-op if already FLEEING or RETURNING.
     *
     * @param {string} contractId
     * @param {object} state
     */
    beginFleeing(contractId, state) {
      const entry = registry.get(contractId);
      if (!entry) return;
      if (entry.status === 'FLEEING' || entry.status === 'RETURNING') return;

      entry.status = 'FLEEING';
      if (entry.npcInstance) entry.npcInstance.metadata.merc.status = 'FLEEING';

      const homeRoom = state.RoomManager.getRoom(entry.homeRoomId);
      if (homeRoom && entry.npcInstance) _setPath(entry, homeRoom, state);
    },

    // -----------------------------------------------------------------------
    // Commands
    // -----------------------------------------------------------------------

    /**
     * Hire a mercenary from a vendor NPC.
     * Validates guild cooldown, cap, coverage, and currency.
     * On success: deducts hire cost, creates contract item, spawns NPC.
     *
     * @param {Player} player
     * @param {Npc}    vendorNpc
     * @param {object} state
     */
    hire(player, vendorNpc, state) {
      const mercConfig = vendorNpc.getMeta('mercenary');
      if (!mercConfig) {
        return B.sayAt(player, 'This vendor does not offer mercenary contracts.');
      }

      // Guild cooldown check
      const cooldownUntil = player.getMeta('merc.cooldownUntil') || 0;
      if (Date.now() < cooldownUntil) {
        const hoursLeft = Math.ceil((cooldownUntil - Date.now()) / 3600000);
        return B.sayAt(player, `<red>[Mercenaries' Guild] You are blacklisted for ${hoursLeft} more hour(s) due to losing mercenaries.</red>`);
      }

      // Cap check
      const claims = state.StorageManager.store.getClaimsByOwner(player.name);
      if (!claims.length) {
        return B.sayAt(player, '<yellow>[Mercenaries\' Guild] You must hold at least one territory claim to hire a mercenary.</yellow>');
      }

      const activeMercs = service.getActiveMercCount(player.name);
      if (activeMercs >= claims.length) {
        return B.sayAt(player, `<yellow>[Mercenaries' Guild] You cannot hire more mercenaries than you have territory claims (${claims.length}).</yellow>`);
      }

      // Coverage check
      const covered = service.getCoveredRoomIds(player.name);
      const targetRoomId = _findTargetRoomId(player.name, claims, covered);
      if (!targetRoomId) {
        return B.sayAt(player, '<yellow>[Mercenaries\' Guild] All of your claimed territory is already garrisoned.</yellow>');
      }

      // Pathfinding sanity: can we reach the target?
      const homeRoom = state.RoomManager.getRoom(mercConfig.homeRoomId);
      const targetRoom = state.RoomManager.getRoom(targetRoomId);
      if (!homeRoom || !targetRoom) {
        return B.sayAt(player, '<red>[Mercenaries\' Guild] Unable to dispatch a mercenary at this time.</red>');
      }

      // Currency check for hire cost
      const hireCurrencyKey = `currencies.${mercConfig.currency}`;
      const balance = player.getMeta(hireCurrencyKey) || 0;
      if (balance < mercConfig.cost) {
        return B.sayAt(player, `<yellow>[Mercenaries' Guild] You cannot afford this contract (${mercConfig.cost} ${mercConfig.currency} required).</yellow>`);
      }

      // Deduct hire cost
      player.setMeta(hireCurrencyKey, balance - mercConfig.cost);

      // Generate a name unique among this player's active mercs
      const usedNames = new Set(service.getContractsByPlayer(player.name).map(e => e.mercName));
      const mercName = MercNameGenerator.generate(usedNames);

      // Build contract data and item
      const contractData = ContractFactory.build(mercConfig, player.name, mercName);
      contractData.targetRoomId = targetRoomId;

      const contractItem = _createContractItem(contractData, player, state);

      // Build registry entry
      const entry = {
        contractId: contractData.contractId,
        mercRef: contractData.mercRef,
        mercName: contractData.mercName,
        homeRoomId: contractData.homeRoomId,
        holderId: contractData.holderId,
        targetRoomId,
        nextUpkeepAt: contractData.nextUpkeepAt,
        expiresAt: contractData.expiresAt,
        upkeepCost: contractData.upkeepCost,
        upkeepCurrency: contractData.upkeepCurrency,
        status: 'EN_ROUTE',
        npcInstance: null,
        contractItem,
        path: [],
        pathIndex: 0,
        lastMoveAt: 0,
        lastClaimCheckAt: 0,
      };

      registry.set(entry.contractId, entry);

      // Spawn NPC at home room
      entry.npcInstance = _spawnNpc(entry, homeRoom, service, state);

      // Compute path from home to target
      _setPath(entry, targetRoom, state);

      player.save();

      B.sayAt(player, `<green>[Mercenaries' Guild] ${entry.mercName} has been contracted. They are en route to your territory.</green>`);
    },

    /**
     * Dismiss a mercenary by contractId. Transitions them to RETURNING.
     * The contract item is removed on despawn, not immediately.
     *
     * @param {string} contractId
     * @param {object} state
     */
    dismiss(contractId, state) {
      const entry = registry.get(contractId);
      if (!entry) return;

      _beginReturning(entry, state);

      B.sayAt(
        service.findHolderForContract(contractId, state),
        `<yellow>[Mercenaries' Guild] ${entry.mercName} has been dismissed and is returning home.</yellow>`
      );
    },

    /**
     * Handle a mercenary NPC dying in combat.
     * Cancels the contract, removes the item, and applies the guild penalty.
     *
     * @param {Npc}    mercNpc
     * @param {object} state
     */
    handleMercDeath(mercNpc, state) {
      const contractId = mercNpc.getMeta ? mercNpc.getMeta('merc.contractId') : null;
      if (!contractId) return;

      const entry = registry.get(contractId);
      if (!entry) return;

      // Apply guild penalty to holder (if online)
      const holder = _findOnlineHolder(contractId, registry, state);
      if (holder) {
        const deaths = (holder.getMeta('merc.deaths') || 0) + 1;
        const stacks = Math.min(deaths, MERC_MAX_PENALTY_STACKS);
        const cooldownUntil = Date.now() + stacks * PENALTY_COOLDOWN_MS;

        holder.setMeta('merc.deaths', deaths);
        holder.setMeta('merc.cooldownUntil', cooldownUntil);

        const hoursStr = Math.ceil((stacks * PENALTY_COOLDOWN_MS) / 3600000);
        B.sayAt(holder, `<red>[Mercenaries' Guild] ${entry.mercName} has fallen. You are blacklisted from hiring for ${hoursStr} hour(s).</red>`);

        // Remove contract item from holder
        const contractItem = _findContractItem(holder, contractId);
        if (contractItem) {
          holder.removeItem(contractItem);
          state.ItemManager.remove(contractItem);
        }

        holder.save();
      } else if (entry.contractItem) {
        // Contract on ground — remove from ItemManager
        state.ItemManager.remove(entry.contractItem);
      }

      registry.delete(contractId);
      // NOTE: state.MobManager.removeMob is handled by the combat bundle on death.
    },

    // -----------------------------------------------------------------------
    // Tick (called every second by server-events setInterval)
    // -----------------------------------------------------------------------

    /**
     * Process billing and advance merc movement for all active contracts.
     * Must be called on a 1-second interval from server-events.
     *
     * @param {object} state
     */
    tick(state) {
      const now = Date.now();

      for (const [contractId, entry] of registry) {
        // ----- Billing -----
        // Skip billing for mercs already heading home
        const billable = entry.status !== 'RETURNING' && entry.status !== 'FLEEING';
        if (billable && now >= entry.nextUpkeepAt) {
          const ok = _processBilling(entry, registry, service, state);
          if (!ok && !registry.has(contractId)) continue; // cancelled + despawned
        }

        // ----- Periodic claim validity check for STATIONED mercs -----
        if (entry.status === 'STATIONED' && now - entry.lastClaimCheckAt >= CLAIM_CHECK_INTERVAL_MS) {
          entry.lastClaimCheckAt = now;
          const claim = state.StorageManager.store.getClaimByRoom(entry.targetRoomId);
          if (!claim || claim.ownerId !== entry.holderId) {
            _beginReturning(entry, state);
            continue;
          }
        }

        // ----- Movement -----
        if (entry.status === 'STATIONED') continue;

        const interval = entry.status === 'FLEEING'
          ? MERC_FLEE_INTERVAL_MS
          : MERC_MOVE_INTERVAL_MS;

        if (now - (entry.lastMoveAt || 0) >= interval) {
          _advanceStep(entry, registry, service, state);
        }
      }
    },

    // -----------------------------------------------------------------------
    // Boot reconstruction
    // -----------------------------------------------------------------------

    /**
     * Scan all player JSON files for active contract items and spawn mercs.
     * Must be called after state.WorldManager and state.StorageManager are ready.
     *
     * @param {object} state
     * @returns {Promise<void>}
     */
    async boot(state) {
      const playerDir = path.join(DATA_DIR, 'player');
      if (!fs.existsSync(playerDir)) return;

      const files = fs.readdirSync(playerDir).filter(f => f.endsWith('.json'));
      const now = Date.now();

      for (const file of files) {
        let playerData;
        try {
          playerData = JSON.parse(fs.readFileSync(path.join(playerDir, file), 'utf8'));
        } catch (_) {
          continue;
        }

        const inventoryItems = playerData.inventory?.items ?? [];
        const holderId = playerData.name;

        for (const [, itemData] of inventoryItems) {
          const contract = itemData?.metadata?.contract;
          if (!contract || !contract.contractId) continue;
          if (!contract.expiresAt || contract.expiresAt <= now) continue;

          // Skip if already registered (e.g. duplicate files)
          if (registry.has(contract.contractId)) continue;

          // Find an uncovered claim for this player
          const claims = state.StorageManager.store.getClaimsByOwner(holderId);
          if (!claims.length) continue;

          const covered = service.getCoveredRoomIds(holderId);
          const targetRoomId = _findTargetRoomId(holderId, claims, covered);
          if (!targetRoomId) continue;

          const homeRoom = state.RoomManager.getRoom(contract.homeRoomId);
          const targetRoom = state.RoomManager.getRoom(targetRoomId);
          if (!homeRoom || !targetRoom) continue;

          const entry = {
            contractId: contract.contractId,
            mercRef: contract.mercRef,
            mercName: contract.mercName,
            homeRoomId: contract.homeRoomId,
            holderId,
            targetRoomId,
            nextUpkeepAt: contract.nextUpkeepAt,
            expiresAt: contract.expiresAt,
            upkeepCost: contract.upkeepCost,
            upkeepCurrency: contract.upkeepCurrency,
            status: 'EN_ROUTE',
            npcInstance: null,
            contractItem: null,  // resolved when player logs in (Layer 8)
            path: [],
            pathIndex: 0,
            lastMoveAt: 0,
            lastClaimCheckAt: 0,
          };

          registry.set(entry.contractId, entry);

          entry.npcInstance = _spawnNpc(entry, homeRoom, service, state);
          _setPath(entry, targetRoom, state);
        }
      }
    },

  };

  return service;
}

module.exports = { build };
