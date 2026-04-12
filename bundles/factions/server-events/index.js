// bundles/factions/server-events/index.js
'use strict';

const path = require('path');

const { Logger } = require('ranvier');

const { load }               = require('../lib/FactionLoader');
const { loadPolicies }       = require('../lib/PolicyResolver');
const { ReputationStore }    = require('../lib/ReputationStore');
const { build }              = require('../lib/FactionService');

const FACTIONS_YML_PATH = path.resolve(__dirname, '../data/factions.yml');
const POLICIES_DIR      = path.resolve(__dirname, '../policies');
const DATA_DIR          = path.resolve(__dirname, '../data');

// Null manager — used when factions.yml is missing or unparseable.
// Every method returns a safe empty value so callers do not need to
// null-check state.FactionManager before calling it.
const NULL_FACTION_MANAGER = {
  getFaction:         () => null,
  getFactionIds:      () => [],
  getProfile:         async() => null,
  applyEvent:         async() => ({ profile: null, action: null }),
  getStance:          async() => null,
  getFactionRelation: () => null,
  getFactionsForRoom: () => [],
  executePolicy:      () => null,
};

// Validates all policy names referenced by a faction definition and warns
// about any that are missing from policyMap. Called once at startup.
function _validatePolicies(factionMap, policyMap) {
  for (const [factionId, factionDef] of factionMap) {
    if (factionDef.defaultStrangerPolicy && !policyMap.has(factionDef.defaultStrangerPolicy)) {
      Logger.warn(
        `[factions] faction ${factionId} defaultStrangerPolicy ` +
        `"${factionDef.defaultStrangerPolicy}" not found in policies/`
      );
    }
    for (const [situation, policyName] of Object.entries(factionDef.policies)) {
      if (!policyMap.has(policyName)) {
        Logger.warn(
          `[factions] faction ${factionId} policy "${situation}" → ` +
          `"${policyName}" not found in policies/`
        );
      }
    }
  }
}

module.exports = {
  NULL_FACTION_MANAGER,
  listeners: {

    // -----------------------------------------------------------------------
    // startup
    //
    // 1. Load factions.yml → factionMap
    // 2. Load policies/ → policyMap
    // 3. Validate all policy references
    // 4. Create ReputationStore (SQLite)
    // 5. Build FactionService
    // 6. Register state.FactionManager
    // -----------------------------------------------------------------------
    startup: state => async() => {
      Logger.log('[factions] initializing...');

      let factionMap;
      try {
        factionMap = load(FACTIONS_YML_PATH);
      } catch (err) {
        Logger.warn(
          '[factions] factions.yml not found or invalid — ' +
          `running with null faction manager. (${err.message})`
        );
        state.FactionManager = NULL_FACTION_MANAGER;
        return;
      }

      let policyMap;
      try {
        policyMap = loadPolicies(POLICIES_DIR);
      } catch (err) {
        Logger.warn(
          '[factions] failed to load policies — ' +
          `running with null faction manager. (${err.message})`
        );
        state.FactionManager = NULL_FACTION_MANAGER;
        return;
      }

      _validatePolicies(factionMap, policyMap);

      let store;
      try {
        store = await ReputationStore.create(DATA_DIR);
      } catch (err) {
        Logger.warn(
          '[factions] failed to create reputation store — ' +
          `running with null faction manager. (${err.message})`
        );
        state.FactionManager = NULL_FACTION_MANAGER;
        return;
      }

      state.FactionManager  = build(factionMap, store, policyMap);
      state._factionStore   = store;

      Logger.log(
        '[factions] ready — ' +
        `${factionMap.size} faction(s), ${policyMap.size} polic(ies)`
      );
    },

    // -----------------------------------------------------------------------
    // shutdown — close the SQLite connection cleanly.
    // -----------------------------------------------------------------------
    shutdown: state => () => {
      if (state._factionStore) {
        try {
          state._factionStore.close();
        } catch (err) {
          Logger.warn(`[factions] error closing store on shutdown: ${err.message}`);
        }
        state._factionStore = null;
      }
    },

  },
};
