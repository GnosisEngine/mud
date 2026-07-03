// bundles/telnet-networking/lib/LineEditor.js
'use strict';

const EventEmitter = require('events');
const { parse, TOKEN } = require('./InputSequenceParser');
const LineBuffer = require('./LineBuffer');
const CommandHistory = require('./CommandHistory');

// ANSI sequence: carriage return + erase from cursor to end of line.
// Used to clear the current terminal line before redrawing.
const ERASE_LINE = '\r\x1b[K';

/**
 * Sits between the raw socket and the input-event system.
 * Accumulates individual keystrokes into complete lines, handles history
 * navigation, and writes ANSI echo/erase sequences back to the terminal.
 *
 * Usage:
 *   const editor = new LineEditor(stream);
 *   editor.on('line', line => stream.emit('data', Buffer.from(line)));
 *   // Route raw bytes from the socket through the editor instead of
 *   // directly to stream.emit('data').
 *
 * Echo ownership:
 *   The LineEditor echoes all printable characters and sends erase sequences
 *   for backspace. Callers should ensure the telnet client is not also
 *   echoing (negotiate WILL ECHO at connection time) to avoid double-echo.
 *
 * Echo is enabled by default. Call setEchoEnabled(false) when entering
 * password mode so characters are buffered silently.
 */
class LineEditor extends EventEmitter {
  /**
   * @param {{ write: Function, writeRaw?: Function, socket: { echoing: boolean } }} stream
   *   A transport stream: requires write(str), an optional writeRaw(str) fast
   *   path, and a socket exposing the current echo state.
   */
  constructor(stream) {
    super();
    this._stream  = stream;
    this._buffer  = new LineBuffer();
    this._history = new CommandHistory();
    this._prompt  = '';

    // Whether the server should echo typed characters and send backspace erase
    // sequences. Default OFF — in the normal SSH+PTY path the terminal owns
    // character echo. Only set to true for raw telnet clients with no PTY.
    this._echoChars = true;

    // Whether the server should send ANSI redraws (history navigation, Ctrl+U,
    // etc.). Default ON. Disabled during password entry so the line is not
    // redrawn and previous command text is not revealed.
    this._redrawEnabled = true;

    this._browsing = false;
    this._completer = null;
    this._pendingBytes = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Feeds a raw byte buffer through the parser and handles each token.
   *
   * @param {Buffer|string} buf
   */
  feed(buf) {
    if (this._pendingBytes && this._pendingBytes.length) {
      buf = Buffer.concat([this._pendingBytes, Buffer.isBuffer(buf) ? buf : Buffer.from(buf)]);
      this._pendingBytes = null;
    }

    const { tokens, remainder } = parse(buf);
    this._pendingBytes = remainder.length ? remainder : null;

    for (const token of tokens) {
      switch (token.type) {
        case TOKEN.CHAR:       this._handleChar(token.char); break;
        case TOKEN.ENTER:      this._handleEnter(); break;
        case TOKEN.BACKSPACE:  this._handleBackspace(); break;
        case TOKEN.ARROW_UP:   this._handleArrowUp(); break;
        case TOKEN.ARROW_DOWN: this._handleArrowDown(); break;
        case TOKEN.CTRL_C:     this._handleCtrlC(); break;
        case TOKEN.CTRL_U:     this._handleCtrlU(); break;
        case TOKEN.TAB:        this._handleTab(); break;
        // TOKEN.IGNORE: intentional no-op
      }
    }
  }

  /**
   * Stores the current prompt string for use during line redraws.
   * Should be called each time the prompt is written to the terminal so
   * history navigation always redraws the correct prefix.
   *
   * @param {string} prompt
   */
  setPrompt(prompt) {
    this._prompt = prompt ?? '';
  }

  /**
   * Whether the player has an in-progress command line worth preserving when
   * unsolicited output arrives. True only when echo is on (so the buffer is
   * actually visible on screen) and the buffer is non-empty.
   *
   * @returns {boolean}
   */
  hasPendingInput() {
    return this._echoChars && this._buffer.length > 0;
  }

  /**
   * Reprints the current prompt and buffer on a freshly cleared line.
   *
   * Public wrapper over the internal redraw so the transport can restore a
   * player's input line after writing broadcast output above it.
   */
  redraw() {
    this._redraw();
  }

  /**
   * Enables or disables server-side character echo and redraws.
   *
   * Pass false to enter password mode: characters are buffered silently and
   * no ANSI redraws are sent (so previous command text is not revealed).
   *
   * Pass true to enter full-echo mode: the server echoes every character and
   * sends all redraws. Use this for raw telnet clients that have no PTY.
   *
   * In the default SSH+PTY path neither setEchoEnabled call is needed:
   * the terminal owns character echo and the server owns redraws.
   *
   * @param {boolean} enabled
   */
  setEchoEnabled(enabled) {
    this._echoChars     = enabled;
    this._redrawEnabled = enabled;
  }

  /**
   * Registers the tab-completion function.
   *
   * The function receives the current buffer contents and returns a sorted
   * array of completion candidates. An empty array signals no match.
   * The function is called synchronously on every Tab keystroke.
   *
   * Passing null removes the completer and makes Tab a no-op.
   *
   * @param {Function|null} fn  — (input: string) => string[]
   */
  setCompleter(fn) {
    this._completer = fn;
  }

  /**
   * normal feed/enter path. Used by commands.js to record commands that
   * were submitted before the line editor was attached (e.g. auto-exec).
   *
   * @param {string} cmd
   */
  pushHistory(cmd) {
    this._history.push(cmd);
  }

  // ---------------------------------------------------------------------------
  // Private token handlers
  // ---------------------------------------------------------------------------

  _handleChar(char) {
    // Any printable character resets browsing — user is editing live input.
    if (this._browsing) {
      this._browsing = false;
    }
    this._buffer.append(char);
    if (this._echoChars) {
      this._write(char);
    }
    // Password mode (echo off): the server authors all on-screen output and the
    // PTY does not echo, so the character is buffered silently without writing
    // anything, leaving the cursor parked after the prompt.
  }

  _handleBackspace() {
    if (this._buffer.length === 0) return;
    this._buffer.backspace();
    if (this._echoChars) {
      this._write('\x08 \x08');
    }
    // Password mode: PTY echo already moved cursor left on backspace; nothing to do.
  }

  _handleEnter() {
    const line = this._buffer.get();
    // Always write \r\n so the cursor advances past the current input line,
    // regardless of echo state — needed for correct cursor position in
    // SSH+PTY raw mode where the PTY does not process Enter locally.
    this._write('\r\n');
    this._buffer.clear();

    if (this._stream.socket.echoing) {
      this._history.push(line);
    }

    this._browsing = false;
    this.emit('line', line);
  }

  _handleArrowUp() {
    const entry = this._history.prev();
    if (entry === null) return;
    this._browsing = true;
    this._buffer.set(entry);
    this._redraw();
  }

  _handleArrowDown() {
    if (!this._browsing) return;
    const entry = this._history.next();
    if (entry === null) {
      this._browsing = false;
      this._buffer.clear();
    } else {
      this._buffer.set(entry);
    }
    this._redraw();
  }

  _handleCtrlC() {
    if (this._echoChars) {
      this._write('^C\r\n');
    }
    this._buffer.clear();
    this._browsing = false;
    this._history.reset();
    this._redraw();
  }

  _handleCtrlU() {
    this._buffer.clear();
    this._browsing = false;
    this._redraw();
  }

  async _handleTab() {
    if (!this._completer || !this._redrawEnabled) return;

    const input = this._buffer.get();

    const matches = this._completer(input);

    this._browsing = false;

    if (matches.length === 0) {
      this._write('\x07'); // bell — no match
      return;
    }

    if (matches.length === 1) {
      this._buffer.set(matches[0]);
      this._redraw();
      return;
    }

    // Multiple matches — print them on a new line then redraw current input
    this._write('\r\n' + matches.join('  ') + '\r\n');
    this._redraw();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  _redraw() {
    if (!this._redrawEnabled) return;
    this._write(ERASE_LINE + this._prompt + this._buffer.get());
  }

  _write(str) {
    if (typeof this._stream.writeRaw === 'function') {
      this._stream.writeRaw(str);
    } else {
      this._stream.write(str);
    }
  }
}

module.exports = LineEditor;
