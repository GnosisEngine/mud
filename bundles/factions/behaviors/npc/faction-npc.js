// bundles/factions/behaviors/npc/faction-npc.js
'use strict';

const { Broadcast: B, Logger } = require('ranvier');
const { EVENTS } = require('../../events');

// NPC metadata keys this behavior reads:
//   faction            {number}  — which faction this NPC belongs to (required)
//   factionPolicy      {string}  — situation type to evaluate on playerEnter (default: resource_trespass)
//   factionAttackDelay {number}  — seconds before initiating combat when action is 'attack' (default: 2)
//
// Example npcs.yml entry:
//
//   - id: iron_guard
//     name: Iron Guard
//     behaviors:
//       faction-npc: true
//     metadata:
//       faction: 1
//       factionPolicy: resource_trespass
//       factionAttackDelay: 3

const DEFAULT_POLICY    = 'resource_trespass';
const DEFAULT_DELAY_SEC = 2;

function _getFactionId(npc) {
  const id = npc.getMeta('faction');
  return (id !== undefined && id !== null) ? id : null;
}

function _getConfig(npc) {
  return {
    policyTrigger: npc.getMeta('factionPolicy')      ?? DEFAULT_POLICY,
    attackDelay:   npc.getMeta('factionAttackDelay') ?? DEFAULT_DELAY_SEC,
  };
}

function _cancelAttackTimer(npc) {
  if (npc._factionAttackTimer) {
    clearTimeout(npc._factionAttackTimer);
    npc._factionAttackTimer    = null;
    npc._factionAttackTarget   = null;
  }
}

module.exports = {
  listeners: {

    // -----------------------------------------------------------------------
    // spawn — validate metadata, warn loudly if faction is missing so
    // world authors know the NPC is misconfigured.
    // -----------------------------------------------------------------------
    spawn: () => function() {
      const factionId = _getFactionId(this);
      if (factionId === null) {
        Logger.warn(
          `[faction-npc] NPC ${this.entityReference} has faction-npc behavior ` +
          'but no "faction" key in metadata — behavior will be inert'
        );
      }
    },

    // -----------------------------------------------------------------------
    // playerEnter — evaluate the player's standing and react.
    //
    // Strangers  → execute defaultStrangerPolicy from faction definition
    // Known      → execute the policy mapped to config.policyTrigger
    //
    // Policy result.action values handled here:
    //   'attack'       → delayed initiateCombat after factionAttackDelay seconds
    //   'warn'         → message only, no combat
    //   'reject'       → message only (used by honor_check)
    //   anything else  → message only
    // -----------------------------------------------------------------------
    playerEnter: state => async function(player) {
      if (!state.FactionManager) return;
      if (this.isInCombat()) return;

      const factionId = _getFactionId(this);
      if (factionId === null) return;

      const config = _getConfig(this);

      let stance;
      try {
        stance = await state.FactionManager.getStance(player.name, factionId);
      } catch (err) {
        Logger.warn(
          `[faction-npc] getStance failed for player "${player.name}" ` +
          `faction ${factionId}: ${err.message}`
        );
        return;
      }
      if (!stance) return;

      const factionDef = state.FactionManager.getFaction(factionId);
      if (!factionDef) return;

      const policyName = stance.isStranger
        ? factionDef.defaultStrangerPolicy
        : (factionDef.policies[config.policyTrigger] ?? factionDef.defaultStrangerPolicy);

      const ctx = {
        profile: {
          brackets:   stance.brackets,
          renown:     stance.renown,
          isStranger: stance.isStranger,
        },
        faction: factionDef,
        player,
        npc: this,
        room: this.room,
        state,
      };

      const result = state.FactionManager.executePolicy(policyName, ctx);
      if (!result) return;

      if (result.message) {
        B.sayAt(player, result.message);
      }

      if (result.action === 'attack') {
        const delayMs = config.attackDelay * 1000;
        this._factionAttackTarget = player;
        this._factionAttackTimer  = setTimeout(() => {
          if (
            this._factionAttackTarget &&
            this.room &&
            player.room === this.room &&
            !this.isInCombat()
          ) {
            this.initiateCombat(this._factionAttackTarget);
          }
          _cancelAttackTimer(this);
        }, delayMs);
      }
    },

    // -----------------------------------------------------------------------
    // playerLeave — cancel any pending attack timer for the departing player.
    // -----------------------------------------------------------------------
    playerLeave: () => function(player) {
      if (this._factionAttackTarget === player) {
        _cancelAttackTimer(this);
      }
    },

    // -----------------------------------------------------------------------
    // killed — emit a factionEvent on the killer so their reputation is updated.
    // Ignored when killed by another NPC (isNpc guard).
    // -----------------------------------------------------------------------
    killed: state => function(killer) {
      if (!killer || killer.isNpc) return;
      if (!state.FactionManager) return;

      const factionId = _getFactionId(this);
      if (factionId === null) return;

      killer.emit(EVENTS.FACTION_EVENT, {
        playerId: killer.name,
        factionId,
        eventType: 'npc_killed',
        player: killer,
      });
    },

  },
};
