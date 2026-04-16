// bundles/factions/lib/FactionService.js
'use strict';

const { nanoid } = require('nanoid');
const { mergeDeltas, resolveProfile } = require('./PolicyResolver');
const { roomHasFaction } = require('../logic');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _zeroed() {
  return { affinity: 0, honor: 0, trust: 0, debt: 0 };
}

function _rowToScores(row) {
  if (!row) return _zeroed();
  return {
    affinity: row.affinity,
    honor:    row.honor,
    trust:    row.trust,
    debt:     row.debt,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Builds the FactionManager service from the outputs of Layers 1–3.
 *
 * At build time, validates that every policy name referenced in factionDefs
 * exists in policyMap. Missing policies emit a warning but do not throw —
 * the missing situation is handled gracefully at call time.
 *
 * @param {Map<number, object>}   factionMap  — from FactionLoader
 * @param {ReputationStore}       store       — from ReputationStore.create()
 * @param {Map<string, Function>} policyMap   — from loadPolicies()
 * @returns {object} FactionManager
 */
function build(factionMap, store, policyMap) {
  for (const [factionId, factionDef] of factionMap) {
    for (const [situation, policyName] of Object.entries(factionDef.policies)) {
      if (!policyMap.has(policyName)) {
        console.warn(
          `[factions] faction ${factionId} references unknown policy ` +
          `"${policyName}" for situation "${situation}"`
        );
      }
    }
  }

  return {

    /**
     * Returns the faction definition for a given id, or null.
     *
     * @param {number} factionId
     * @returns {object|null}
     */
    getFaction(factionId) {
      return factionMap.get(factionId) ?? null;
    },

    /**
     * Returns all registered faction ids.
     *
     * @returns {number[]}
     */
    getFactionIds() {
      return [...factionMap.keys()];
    },

    /**
     * Returns the full reputation profile for a player/faction pair.
     * If no row exists in the store the player is treated as all-zero (stranger).
     *
     * @param {string} playerId
     * @param {number} factionId
     * @returns {Promise<object>} { axes, brackets, renown, isStranger }
     */
    async getProfile(playerId, factionId) {
      const factionDef = factionMap.get(factionId);
      if (!factionDef) return null;
      const row = store.get(playerId, factionId);
      return resolveProfile(_rowToScores(row), factionDef);
    },

    /**
     * Applies a faction event for a player, updating their reputation and
     * appending to the audit log.
     *
     * Returns the updated profile and the name of the policy that applies
     * for this event type on this faction (or null if no policy is mapped).
     *
     * @param {string} playerId
     * @param {number} factionId
     * @param {string} eventType
     * @returns {Promise<{ profile: object, action: string|null }>}
     */
    async applyEvent(playerId, factionId, eventType) {
      const factionDef = factionMap.get(factionId);
      if (!factionDef) {
        throw new Error(`FactionService: unknown faction id ${factionId}`);
      }

      const deltas = mergeDeltas(eventType, factionDef);
      const now = Date.now();
      const eventId = `fe_${nanoid(10)}`;

      store.upsertDelta(playerId, factionId, deltas, now);
      store.logEvent(eventId, playerId, factionId, eventType, deltas, now);

      const row = store.get(playerId, factionId);
      const profile = resolveProfile(_rowToScores(row), factionDef);
      const action = factionDef.policies[eventType] ?? null;

      return { profile, action };
    },

    /**
     * Returns a lightweight stance snapshot for use by NPC behaviors and
     * other systems that only need bracket names.
     *
     * @param {string} playerId
     * @param {number} factionId
     * @returns {Promise<{ brackets: object, renown: number, isStranger: boolean }|null>}
     */
    async getStance(playerId, factionId) {
      const profile = await this.getProfile(playerId, factionId);
      if (!profile) return null;
      return {
        brackets:   profile.brackets,
        renown:     profile.renown,
        isStranger: profile.isStranger,
      };
    },

    /**
     * Returns the configured relation string between two factions
     * (e.g. 'cold', 'war', 'neutral', 'allied'), or null if not configured.
     *
     * @param {number} factionIdA
     * @param {number} factionIdB
     * @returns {string|null}
     */
    getFactionRelation(factionIdA, factionIdB) {
      const a = factionMap.get(factionIdA);
      if (!a) return null;
      return a.factionRelations[factionIdB] ?? null;
    },

    /**
     * Returns the faction ids present in a room.
     * Reads room.faction; returns an empty array if the room has no faction.
     *
     * @param {object} room
     * @returns {number[]}
     */
    getFactionsForRoom(room) {
      if (!roomHasFaction(null, null, { room })) return [];
      return [room.faction];
    },

    /**
     * Executes the named policy function with the supplied context.
     * Returns null if the policy is not found in policyMap.
     *
     * @param {string} policyName
     * @param {object} ctx   — { player, faction, profile, room, state }
     * @returns {object|null}
     */
    executePolicy(policyName, ctx) {
      const fn = policyMap.get(policyName);
      if (!fn) return null;
      return fn(ctx);
    },

  };
}

module.exports = { build };
