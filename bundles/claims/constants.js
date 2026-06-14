'use strict';

const { Config } = require('ranvier');

// lines before mid-session compaction
const COMPACT_THRESHOLD = Config.get('compactThreshold');

// ms between expiry flush checks (30s)
const LOGOUT_GRACE_MS = Config.get('compactThreshold');

module.exports = { COMPACT_THRESHOLD, LOGOUT_GRACE_MS };
