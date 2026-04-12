// bundles/vendor-npcs/lib/ContractFactory.js
'use strict';

const crypto = require('crypto');
const { TWO_GAME_MONTHS_MS } = require('../constants');

// The entity reference for the generic mercenary NPC stub in areas/mercs/npcs.yml.
// MercenaryService uses this to spawn a fresh NPC instance via state.MobFactory.
const MERC_ENTITY_REF = 'mercs:mercenary';

/**
 * Build the plain-object contract data shape for a newly hired mercenary.
 * Pure construction — no state, no I/O. All timestamps are real unix ms.
 *
 * The returned object is stored as item metadata on the contract item and
 * also held in the MercenaryService registry entry.
 *
 * @param {object} vendorMercConfig — the mercenary block from the vendor NPC's metadata
 * @param {string} playerId         — name/id of the hiring player (becomes holderId)
 * @param {string} mercName         — unique name assigned by MercNameGenerator
 * @returns {object}
 */
function build(vendorMercConfig, playerId, mercName) {
  const issuedAt = Date.now();
  const nextUpkeepAt = issuedAt + TWO_GAME_MONTHS_MS;

  return {
    contractId: 'mc_' + crypto.randomBytes(9).toString('hex').slice(0, 12),
    mercRef: MERC_ENTITY_REF,
    mercName: mercName,
    homeRoomId: vendorMercConfig.homeRoomId,
    issuedAt,
    nextUpkeepAt,
    expiresAt: nextUpkeepAt,
    holderId: playerId,
    tier: vendorMercConfig.tier || 1,
    upkeepCost: vendorMercConfig.upkeepCost,
    upkeepCurrency: vendorMercConfig.upkeepCurrency,
    status: 'EN_ROUTE',
  };
}

module.exports = { build, MERC_ENTITY_REF };
