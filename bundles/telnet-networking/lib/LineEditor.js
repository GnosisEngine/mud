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
   * @param {{ write: Function }} stream  — any object with a write(str) method
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
    this._echoChars = false;

    // Whether the server should send ANSI redraws (history navigation, Ctrl+U,
    // etc.). Default ON. Disabled during password entry so the line is not
    // redrawn and previous command text is not revealed.
    this._redrawEnabled = true;

    this._browsing = false;
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
    const tokens = parse(buf);
    for (const token of tokens) {
      switch (token.type) {
        case TOKEN.CHAR:       this._handleChar(token.char); break;
        case TOKEN.ENTER:      this._handleEnter(); break;
        case TOKEN.BACKSPACE:  this._handleBackspace(); break;
        case TOKEN.ARROW_UP:   this._handleArrowUp(); break;
        case TOKEN.ARROW_DOWN: this._handleArrowDown(); break;
        case TOKEN.CTRL_C:     this._handleCtrlC(); break;
        case TOKEN.CTRL_U:     this._handleCtrlU(); break;
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
   * Pushes a command directly into history without going through the
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
  }

  _handleBackspace() {
    if (this._buffer.length === 0) return;
    this._buffer.backspace();
    if (this._echoChars) {
      this._write('\x08 \x08');
    }
  }

  _handleEnter() {
    const line = this._buffer.get();
    // Always write \r\n so the cursor advances past the current input line,
    // regardless of echo state — needed for correct cursor position in
    // SSH+PTY raw mode where the PTY does not process Enter locally.
    this._write('\r\n');
    this._buffer.clear();
    this._history.push(line);
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  _redraw() {
    if (!this._redrawEnabled) return;
    this._write(ERASE_LINE + this._prompt + this._buffer.get());
  }

  _write(str) {
    this._stream.write(str);
  }
}

module.exports = LineEditor;
