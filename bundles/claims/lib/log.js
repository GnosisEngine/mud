'use strict';

const { Logger } = require('ranvier');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { encode, decode } = require('./codec');
const { Config } = require('ranvier');

const SEGMENT_NAME = process.env.NODE_ENV === 'test'
  ? 'segments-test'
  : 'segments';

const CLAIMS_NAME = process.env.NODE_ENV === 'test'
  ? 'claims-test.log'
  : 'claims.log';

class Log {
  constructor(dataDir, compactThreshold = Config.get('compactThreshold')) {
    this.baseDir = dataDir;
    this.segmentDir = path.join(dataDir, SEGMENT_NAME);
    this.statePath = path.join(dataDir, `${CLAIMS_NAME}.state.json`);

    fs.mkdirSync(this.segmentDir, { recursive: true });

    // --------------------------
    // CONFIG
    // --------------------------
    this.compactThreshold = compactThreshold;

    // batching controls (tune these)
    this.buffer = [];
    this.flushSize = 100;        // flush after 100 events
    this.flushIntervalMs = 50;   // or every 50ms

    this.segmentIndex = 1;
    this.lineCount = 0;

    this.currentSegment = this._segmentPath(this.segmentIndex);
    this._ensureSegment(this.currentSegment);

    this._loadState();

    // background flush loop
    this._startFlushLoop();

    // ensure final flush on exit
    process.on('exit', () => this._shutdown());
    process.on('SIGINT', () => this._shutdown());
    process.on('SIGTERM', () => this._shutdown());
  }

  // =========================================================
  // WRITE PATH (BUFFERED, FAST)
  // =========================================================

  append(opcode, data) {
    this.buffer.push(encode(opcode, data));
    this.lineCount++;

    if (this.buffer.length >= this.flushSize) {
      this._flushAsync();
    }

    if (this.lineCount >= this.compactThreshold) {
      this.swap(); // segment rotation, no rename
    }
  }

  _startFlushLoop() {
    this._flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this._flushAsync();
      }
    }, this.flushIntervalMs);
  }

  _flushAsync() {
    const data = this.buffer;
    if (data.length === 0) return;

    this.buffer = [];

    const chunk = data.join('');

    fs.appendFile(this.currentSegment, chunk, (err) => {
      if (err) {
        // fallback: requeue data if write fails
        this.buffer.unshift(chunk);
      }
    });
  }

  _shutdown() {
    Logger.log('[claims] exiting');

    try {
      this._flushBestEffort();
    } finally {
      // force exit no matter what
      setImmediate(() => process.exit(0));
    }
  }

  _flushBestEffort() {
    Logger.log('[claims] best-effort flush triggered');

    clearInterval(this._flushTimer);

    const chunk = this.buffer.join('');
    this.buffer = [];

    if (!chunk) return;

    // DO NOT block shutdown on disk
    fs.appendFile(this.currentSegment, chunk, (err) => {
      if (err) {
      // optional: log to stderr, but DO NOT retry
        console.error('[claims] flush failed during shutdown:', err.message);
      }
    });
  }

  // =========================================================
  // READ PATH (UNCHANGED API)
  // =========================================================

  async *readAll() {
    const files = this._segmentFiles();

    for (const file of files) {
      const stream = fs.createReadStream(file, {
        highWaterMark: 1024 * 1024
      });

      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;
        const event = decode(line);
        if (event) yield event;
      }
    }
  }

  // =========================================================
  // SEGMENT ROTATION (NO RENAMES)
  // =========================================================

  swap() {
    this.segmentIndex++;
    this.currentSegment = this._segmentPath(this.segmentIndex);

    this._ensureSegment(this.currentSegment);

    this.lineCount = 0;
    this._saveState();
  }

  // =========================================================
  // COMPAT TMP WRITER (NOW BUFFERED SEGMENT)
  // =========================================================

  openTmpWriter() {
    const tempSegment = this._segmentPath(this.segmentIndex + 1);
    this._ensureSegment(tempSegment);

    const stream = fs.createWriteStream(tempSegment, { flags: 'a' });

    return {
      write: (opcode, data) => {
        stream.write(encode(opcode, data));
      },
      close: () =>
        new Promise((resolve, reject) => {
          stream.end(err => err ? reject(err) : resolve());
        })
    };
  }

  // =========================================================
  // HELPERS
  // =========================================================

  _segmentPath(i) {
    return path.join(
      this.segmentDir,
      `${CLAIMS_NAME}.${String(i).padStart(6, '0')}`
    );
  }

  _ensureSegment(file) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '');
    }
  }

  _segmentFiles() {
    return fs.readdirSync(this.segmentDir)
      .filter(f => f.startsWith(CLAIMS_NAME))
      .sort()
      .map(f => path.join(this.segmentDir, f));
  }

  _saveState() {
    fs.writeFileSync(this.statePath, JSON.stringify({
      segmentIndex: this.segmentIndex,
      lineCount: this.lineCount,
    }));
  }

  _loadState() {
    if (!fs.existsSync(this.statePath)) return;

    try {
      const s = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      this.segmentIndex = s.segmentIndex || 1;
      this.lineCount = s.lineCount || 0;
      this.currentSegment = this._segmentPath(this.segmentIndex);
    } catch {
      // ignore corruption
    }
  }

  // =========================================================
  // DISABLED FEATURE (INTENTIONALLY)
  // =========================================================

  needsCompaction() {
    return false;
  }
}

module.exports = { Log };
