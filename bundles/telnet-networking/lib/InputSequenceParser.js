// bundles/telnet-networking/lib/InputSequenceParser.js
'use strict';

// Token types emitted by parse().
const TOKEN = Object.freeze({
  CHAR:       'CHAR',
  ENTER:      'ENTER',
  BACKSPACE:  'BACKSPACE',
  ARROW_UP:   'ARROW_UP',
  ARROW_DOWN: 'ARROW_DOWN',
  CTRL_C:     'CTRL_C',
  CTRL_U:     'CTRL_U',
  IGNORE:     'IGNORE',
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Returns true for printable ASCII (0x20–0x7e).
function _isPrintable(byte) {
  return byte >= 0x20 && byte <= 0x7e;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a raw byte buffer into an array of typed tokens.
 *
 * Handles:
 *   - Printable ASCII characters
 *   - CR (\r) and LF (\n) and CRLF as ENTER
 *   - Backspace: DEL (0x7f) and BS (0x08)
 *   - ANSI arrow sequences: ESC [ A (up), ESC [ B (down)
 *   - Ctrl+C (0x03) and Ctrl+U (0x15)
 *   - All other bytes produce IGNORE tokens
 *
 * Partial escape sequences that arrive at the end of a buffer without a
 * terminating byte are emitted as IGNORE tokens rather than being held for
 * the next call — the parser is stateless.
 *
 * @param {Buffer|string} input
 * @returns {Array<{ type: string, char?: string }>}
 */
function parse(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  const tokens = [];
  let i = 0;

  while (i < buf.length) {
    const byte = buf[i];

    // ESC sequences (0x1b)
    if (byte === 0x1b) {
      if (i + 1 < buf.length && buf[i + 1] === 0x5b) {
        // ESC [ present — this is a CSI sequence, need one more byte for the command
        if (i + 2 < buf.length) {
          const terminator = buf[i + 2];
          if (terminator === 0x41) {
            tokens.push({ type: TOKEN.ARROW_UP });
            i += 3;
            continue;
          }
          if (terminator === 0x42) {
            tokens.push({ type: TOKEN.ARROW_DOWN });
            i += 3;
            continue;
          }
          // Other CSI sequences (e.g. arrow left/right, F-keys) — consume and ignore
          tokens.push({ type: TOKEN.IGNORE });
          i += 3;
          continue;
        }
        // ESC [ with no terminator — incomplete CSI, consume both bytes as IGNORE
        tokens.push({ type: TOKEN.IGNORE });
        tokens.push({ type: TOKEN.IGNORE });
        i += 2;
        continue;
      }
      // Bare ESC or ESC followed by non-[ — ignore this byte only
      tokens.push({ type: TOKEN.IGNORE });
      i += 1;
      continue;
    }

    // CR (\r), LF (\n), or CRLF
    if (byte === 0x0d) {
      // Consume optional following \n
      if (i + 1 < buf.length && buf[i + 1] === 0x0a) {
        i += 1;
      }
      tokens.push({ type: TOKEN.ENTER });
      i += 1;
      continue;
    }

    if (byte === 0x0a) {
      tokens.push({ type: TOKEN.ENTER });
      i += 1;
      continue;
    }

    // Backspace: DEL (0x7f) or BS (0x08)
    if (byte === 0x7f || byte === 0x08) {
      tokens.push({ type: TOKEN.BACKSPACE });
      i += 1;
      continue;
    }

    // Ctrl+C (ETX)
    if (byte === 0x03) {
      tokens.push({ type: TOKEN.CTRL_C });
      i += 1;
      continue;
    }

    // Ctrl+U (NAK)
    if (byte === 0x15) {
      tokens.push({ type: TOKEN.CTRL_U });
      i += 1;
      continue;
    }

    // Printable ASCII
    if (_isPrintable(byte)) {
      tokens.push({ type: TOKEN.CHAR, char: String.fromCharCode(byte) });
      i += 1;
      continue;
    }

    // Everything else
    tokens.push({ type: TOKEN.IGNORE });
    i += 1;
  }

  return tokens;
}

module.exports = { parse, TOKEN };
