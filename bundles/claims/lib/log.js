// bundles/ranvier-storage/lib/log.js
'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const { encode, decode } = require('./codec');

/**
 * All filesystem interaction for the claims event log lives here.
 * No other layer touches the log file directly.
 *
 * File layout:
 *   <dataDir>/claims.log      — active log, appended to during runtime
 *   <dataDir>/claims.log.tmp  — written during compaction, then swapped in
 *
 * Format: NDJSON-style — one encoded event per line, newline terminated.
 * Append is synchronous for crash-safety. Reads are streaming.
 */

class Log {
  /**
   * @param {string} dataDir — absolute path to the bundle's data directory
   * @param {number} compactThreshold — line count that triggers mid-session compaction
   */
  constructor(dataDir, compactThreshold = 10000) {
    this.logPath          = path.join(dataDir, 'claims.log');
    this.tmpPath          = path.join(dataDir, 'claims.log.tmp');
    this.compactThreshold = compactThreshold;
    this.lineCount        = 0;

    fs.mkdirSync(dataDir, { recursive: true });

    if (!fs.existsSync(this.logPath)) {
      fs.writeFileSync(this.logPath, '');
    } else {
      this.lineCount = this._countLines();
    }
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  /**
   * Encode and append a single event to the active log.
   * Synchronous — the write completes before the caller continues.
   * This is the crash-safety guarantee: if append returns, the event is on disk.
   *
   * @param {string} opcode
   * @param {object} data
   */
  append(opcode, data) {
    fs.appendFileSync(this.logPath, encode(opcode, data));
    this.lineCount++;
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /**
   * Async generator — yields decoded events one line at a time.
   * Streams the file line by line, never loads it fully into memory.
   *
   * @yields {{ opcode: string, data: object }}
   */
  async *readAll() {
    const fileStream = fs.createReadStream(this.logPath);
    const rl = readline.createInterface({
      input:     fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      const event = decode(line);
      if (event) yield event;
    }
  }

  // ---------------------------------------------------------------------------
  // Compaction support
  // ---------------------------------------------------------------------------

  /**
   * Open a write stream to the tmp file.
   * Used by compaction.js to write snapshot entries without touching the active log.
   * The active log continues receiving appends normally while this stream is open.
   *
   * Caller must call writer.close() then log.swap() to complete compaction.
   *
   * @returns {{ write: Function, close: Function }}
   */
  openTmpWriter() {
    const stream = fs.createWriteStream(this.tmpPath, { flags: 'w' });

    return {
      write(opcode, data) {
        stream.write(encode(opcode, data));
      },
      close() {
        return new Promise((resolve, reject) => {
          stream.end((err) => err ? reject(err) : resolve());
        });
      },
    };
  }

  /**
   * Atomically swap the tmp file into place as the new active log.
   * fs.renameSync is atomic at the OS level — the log is never in a partial state.
   * Resets lineCount to reflect the compacted file.
   */
  swap() {
    fs.renameSync(this.tmpPath, this.logPath);
    this.lineCount = this._countLines();
  }

  // ---------------------------------------------------------------------------
  // Threshold
  // ---------------------------------------------------------------------------

  /**
   * True if the log has grown beyond the compaction threshold.
   * Checked by the store after every append.
   * @returns {boolean}
   */
  needsCompaction() {
    return this.lineCount >= this.compactThreshold;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  _countLines() {
    const content = fs.readFileSync(this.logPath, 'utf8');
    if (!content) return 0;
    return content.split('\n').filter(l => l.trim()).length;
  }
}

module.exports = { Log };