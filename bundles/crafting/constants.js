'use strict';
const { Config } = require('ranvier');

const CARRY_MULTIPLIER = Config.get('carryCapacityMultiplier');
const SPAWN_TICK_MS = Config.get('resourceSpawnTickMs');
const ROT_POLL_TICK_MS = Config.get('rotPollTickMS');
const TRADE_TIMEOUT_MS = Config.get('tradeTimeoutMs');

module.exports = { CARRY_MULTIPLIER, SPAWN_TICK_MS, ROT_POLL_TICK_MS, TRADE_TIMEOUT_MS };
