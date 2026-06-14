// bundles/storage/lib/CompactableLog.js
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const jsonLinesCodec = require('./jsonLinesCodec');

/**
 * @typedef {object} CompactableLogOptions
 * @property {{encode: (opcode: string, data: object) => string, decode: (line: string) => ({opcode: string, data: object}|null)}} [codec]
 *   Defaults to jsonLinesCodec. Stores with their own event formats (e.g.
 *   claims' single-char opcode codec) pass their own.
 * @property {number} [compactThreshold] Line count after which needsCompaction() returns true.
 * @property {string} [logName] Filename prefix for segments and the state file. Defaults to 'log'.
 * @property {string} [segmentDirName] Subdirectory holding segment files. Defaults to 'segments'.
 * @property {number} [flushSize] Flush the write buffer after this many appends. Defaults to 100.
 * @property {number} [flushIntervalMs] Also flush on this interval. Defaults to 50.
 */

/**
 * A namespaced, segmented, buffered append-only event log.
 *
 * This is the generic form of what was claims' bundles/claims/lib/log.js —
 * segment rotation, buffered async writes, and replay are all here;
 * the event encoding and compaction *policy* (what a "snapshot" looks like,
 * when to compact) stay with the owning store.
 *
 * Unlike the original, this class does not register its own
 * process.on('exit'/'SIGINT'/'SIGTERM') handlers — the storage bundle
 * tracks all open logs and flushes them together on shutdown via
 * flushBestEffort().
 */
class CompactableLog {
  /**
   * @param {string} logDir Directory for this log's segments and state file
   * @param {CompactableLogOptions} [options]
   */
  constructor(logDir, options = {}) {
    this.baseDir = logDir;
    this.codec = options.codec || jsonLinesCodec;
    this.compactThreshold = options.compactThreshold ?? Infinity;
    this.logName = options.logName || 'log';
    this.segmentDir = path.join(logDir, options.segmentDirName || 'segments');
    this.statePath = path.join(logDir, `${this.logName}.state.json`);

    fs.mkdirSync(this.segmentDir, { recursive: true });

    this.buffer = [];
    this.flushSize = options.flushSize ?? 100;
    this.flushIntervalMs = options.flushIntervalMs ?? 50;

    this.segmentIndex = 1;
    this.lineCount = 0;

    this.currentSegment = this._segmentPath(this.segmentIndex);
    this._ensureSegment(this.currentSegment);

    this._loadState();
    this._startFlushLoop();
  }

  // =========================================================
  // WRITE PATH (BUFFERED)
  // =========================================================

  /**
   * @param {string} opcode
   * @param {object} data
   */
  append(opcode, data) {
    this.buffer.push(this.codec.encode(opcode, data));
    this.lineCount++;

    if (this.buffer.length >= this.flushSize) {
      this._flushAsync();
    }

    if (this.lineCount >= this.compactThreshold) {
      this.swap();
    }
  }

  _startFlushLoop() {
    this._flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this._flushAsync();
      }
    }, this.flushIntervalMs);

    if (this._flushTimer.unref) {
      this._flushTimer.unref();
    }
  }

  _flushAsync() {
    const data = this.buffer;
    if (data.length === 0) return;

    this.buffer = [];

    const chunk = data.join('');

    fs.appendFile(this.currentSegment, chunk, err => {
      if (err) {
        // fallback: requeue data if write fails
        this.buffer.unshift(chunk);
      }
    });
  }

  /**
   * Synchronously flush whatever is buffered and stop the flush loop. Used
   * by the storage bundle's shutdown sequence — does not throw on failure.
   */
  flushBestEffort() {
    clearInterval(this._flushTimer);

    const chunk = this.buffer.join('');
    this.buffer = [];

    if (!chunk) return;

    try {
      fs.appendFileSync(this.currentSegment, chunk);
    } catch (err) {
      // best-effort: don't block shutdown on a write failure
    }
  }

  // =========================================================
  // READ PATH
  // =========================================================

  async *readAll() {
    const files = this._segmentFiles();

    for (const file of files) {
      const stream = fs.createReadStream(file, {
        highWaterMark: 1024 * 1024,
      });

      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;
        const event = this.codec.decode(line);
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

  openTmpWriter() {
    const tempSegment = this._segmentPath(this.segmentIndex + 1);
    this._ensureSegment(tempSegment);

    const stream = fs.createWriteStream(tempSegment, { flags: 'a' });

    return {
      write: (opcode, data) => {
        stream.write(this.codec.encode(opcode, data));
      },
      close: () =>
        new Promise((resolve, reject) => {
          stream.end(err => err ? reject(err) : resolve());
        }),
    };
  }

  // =========================================================
  // HELPERS
  // =========================================================

  _segmentPath(i) {
    return path.join(
      this.segmentDir,
      `${this.logName}.${String(i).padStart(6, '0')}`
    );
  }

  _ensureSegment(file) {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '');
    }
  }

  _segmentFiles() {
    return fs.readdirSync(this.segmentDir)
      .filter(f => f.startsWith(`${this.logName}.`))
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
  // DISABLED FEATURE (carried over intentionally — see claims' original log.js)
  // =========================================================

  needsCompaction() {
    return false;
  }
}

module.exports = CompactableLog;
