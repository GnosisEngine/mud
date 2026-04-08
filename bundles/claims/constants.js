'use strict';

const { resolve } = require('path');
const { Config } = require('ranvier');

const DATA_DIR = resolve(__dirname, Config.get('dataDir'));

// lines before mid-session compaction
const COMPACT_THRESHOLD = Config.get('compactThreshold');

// ms between expiry flush checks (30s)
const LOGOUT_GRACE_MS = Config.get('compactThreshold');

module.exports = { COMPACT_THRESHOLD, DATA_DIR, LOGOUT_GRACE_MS };
