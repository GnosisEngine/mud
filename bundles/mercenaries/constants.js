// bundles/vendor-npcs/constants.js
'use strict';

const { resolve } = require('path');
const { Config } = require('ranvier');

const DATA_DIR = resolve(__dirname, '..', '..', Config.get('dataDir'));

const DAYS_PER_MONTH = Config.get('daysPerMonth');
const MERC_MOVE_INTERVAL_MS = Config.get('mercMoveIntervalMs');
const MERC_FLEE_INTERVAL_MS = Config.get('mercFleeIntervalMs');
const MERC_MAX_PENALTY_STACKS = Config.get('mercMaxPenaltyStacks');

// 2 game months in real milliseconds.
// Contract: 1 tick = 1 real second = 1 game minute (time-bundle).
// 2 months × 28 days × 24 hours × 60 minutes × 1000 ms = 80,640,000 ms ≈ 22.4 real hours.
const TWO_GAME_MONTHS_MS = 2 * DAYS_PER_MONTH * 24 * 60 * 1000;

// Each guild penalty stack adds one full upkeep interval to the cooldown.
const PENALTY_COOLDOWN_MS = TWO_GAME_MONTHS_MS;

module.exports = {
  DATA_DIR,
  MERC_MOVE_INTERVAL_MS,
  MERC_FLEE_INTERVAL_MS,
  MERC_MAX_PENALTY_STACKS,
  TWO_GAME_MONTHS_MS,
  PENALTY_COOLDOWN_MS,
};
