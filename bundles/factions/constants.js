// bundles/factions/constants.js
'use strict';

const SCORE_MIN = -100;
const SCORE_MAX = 100;

const RENOWN_THRESHOLD_DEFAULT = 30;

const BRACKET_THRESHOLDS_DEFAULT = [-50, -20, 20, 50];

const BRACKET_LABELS = {
  affinity: ['enemy', 'hostile', 'neutral', 'friendly', 'devoted'],
  honor:    ['contemptible', 'dishonorable', 'neutral', 'honorable', 'exemplary'],
  trust:    ['deceiver', 'suspicious', 'unknown', 'trusted', 'confidant'],
  debt:     ['indebted', 'owing', 'balanced', 'creditor', 'patron'],
};

const FACTION_EVENTS = {
  npc_killed: {
    affinity: -20,
    honor:    -5,
    trust:    -10,
    debt:     0,
  },
  resource_stolen: {
    affinity: -10,
    honor:    -15,
    trust:    -15,
    debt:     -10,
  },
  resource_gathered: {
    affinity: -5,
    honor:    -5,
    trust:    -5,
    debt:     -5,
  },
  trade_completed: {
    affinity: 5,
    honor:    5,
    trust:    10,
    debt:     15,
  },
  quest_completed: {
    affinity: 10,
    honor:    10,
    trust:    10,
    debt:     5,
  },
  surrender_honored: {
    affinity: 5,
    honor:    15,
    trust:    10,
    debt:     0,
  },
  surrender_broken: {
    affinity: -15,
    honor:    -25,
    trust:    -30,
    debt:     0,
  },
  claim_violated: {
    affinity: -15,
    honor:    -10,
    trust:    -10,
    debt:     -10,
  },
  tribute_paid: {
    affinity: 5,
    honor:    5,
    trust:    5,
    debt:     20,
  },
  mercenary_contract_completed: {
    affinity: 10,
    honor:    10,
    trust:    15,
    debt:     5,
  },
  mercenary_contract_broken: {
    affinity: -20,
    honor:    -20,
    trust:    -30,
    debt:     -15,
  },
  vendor_overcharged: {
    affinity: -5,
    honor:    -10,
    trust:    -10,
    debt:     -5,
  },
  prisoner_released: {
    affinity: 10,
    honor:    20,
    trust:    5,
    debt:     0,
  },
};

const FACTION_EVENT_NAMES = Object.freeze(new Set(Object.keys(FACTION_EVENTS)));

module.exports = {
  SCORE_MIN,
  SCORE_MAX,
  RENOWN_THRESHOLD_DEFAULT,
  BRACKET_THRESHOLDS_DEFAULT,
  BRACKET_LABELS,
  FACTION_EVENTS,
  FACTION_EVENT_NAMES,
};
