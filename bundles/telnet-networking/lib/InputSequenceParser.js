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
  TAB:        'TAB',
  IGNORE:     'IGNORE',
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Returns true for printable ASCII (0x20-0x7e).
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
 *   - Ctrl+C (0x03), Ctrl+U (0x15), Tab (0x09)
 *   - All other bytes produce IGNORE tokens
 *
 * Incomplete escape sequences that arrive at the end of a buffer (a lone ESC,
 * or ESC [ with no terminator) are returned as `remainder` rather than being
 * dropped, so the caller can prepend them to the next chunk. This makes arrow
 * keys and other sequences survive being split across transport reads (which
 * happens over the SSH/PTY/socat path but not over a direct connection).
 *
 * @param {Buffer|string} input
 * @returns {{ tokens: Array<{ type: string, char?: string }>, remainder: Buffer }}
 */
function parse(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  const tokens = [];
  let remainder = Buffer.alloc(0);
  let i = 0;

  while (i < buf.length) {
    const byte = buf[i];

    // ESC sequences (0x1b)
    if (byte === 0x1b) {
      // Lone ESC at end of buffer -- may be the start of a sequence split
      // across reads. Hold it for the next call.
      if (i + 1 >= buf.length) {
        remainder = buf.slice(i);
        break;
      }

      if (buf[i + 1] === 0x5b) {
        // ESC [ present -- this is a CSI sequence, need one more byte.
        if (i + 2 >= buf.length) {
          // ESC [ with no terminator yet -- hold for the next call.
          remainder = buf.slice(i);
          break;
        }

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
        // Other CSI sequences (arrow left/right, F-keys) -- consume and ignore
        tokens.push({ type: TOKEN.IGNORE });
        i += 3;
        continue;
      }

      // ESC followed by a non-[ byte -- not a sequence we handle.
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

    // Tab (HT)
    if (byte === 0x09) {
      tokens.push({ type: TOKEN.TAB });
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

  return { tokens, remainder };
}

module.exports = { parse, TOKEN };
