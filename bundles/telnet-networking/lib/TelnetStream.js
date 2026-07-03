'use strict';

const { Sequences } = require('ranvier-telnet');
const { TransportStream } = require('ranvier');

/**
 * Trailing debounce window (ms) for coalescing a burst of broadcasts into a
 * single input-line interrupt. First broadcast starts the timer; further
 * broadcasts in the window are appended and flushed together, so a burst
 * reprints the input line once instead of once per line.
 */
const BROADCAST_DEBOUNCE_MS = 120;

/**
 * Thin wrapper around a ranvier-telnet `TelnetSocket`.
 *
 * When a LineEditor is attached via attachLineEditor(), raw bytes are fed to
 * it directly from the underlying net.Socket — bypassing TelnetSocket's
 * line-stripping (which always drops the last byte and discards \n separators).
 * This is necessary so that:
 *   - \r (Enter) is preserved and LineEditor can detect line submission
 *   - Escape sequences like \x1b[A (arrow up) arrive intact
 *
 * TelnetSocket continues to handle telnet protocol negotiation (IAC, GMCP,
 * ECHO, EOR) from the same raw bytes independently.
 *
 * Without a LineEditor, the original TelnetSocket data event path is used
 * unchanged — no behavioural difference for websocket or other transports.
 */
class TelnetStream extends TransportStream
{
  attach(socket) {
    super.attach(socket); // sets this.socket = TelnetSocket

    // Keep a reference to the underlying net.Socket so the LineEditor can
    // read raw bytes before TelnetSocket's processing strips them.
    this._rawSocket = socket.socket;

    socket.on('data', message => {
      if (!this._lineEditor) {
        this.emit('data', message);
      }
      // When a LineEditor is attached, TelnetSocket data events are
      // suppressed here — the LineEditor drives data delivery instead.
    });

    socket.on('error', err => {
      this.emit('error', err);
    });

    this.socket.on('DO', opt => {
      this.socket.telnetCommand(Sequences.WONT, opt);
    });
  }

  /**
   * Attaches a LineEditor to this stream.
   *
   * Listens on the underlying raw socket so the LineEditor receives complete,
   * unstripped bytes (including \r and intact escape sequences). Each 'line'
   * event from the LineEditor is re-emitted as a 'data' event on this stream,
   * preserving the contract that all input-event listeners expect.
   *
   * @param {import('./LineEditor')} lineEditor
   */
  attachLineEditor(lineEditor) {
    this._lineEditor = lineEditor;

    this._rawSocket.on('data', rawBytes => {
      lineEditor.feed(rawBytes);
    });

    lineEditor.on('line', line => {
      this.emit('data', Buffer.from(line));
    });
  }

  get writable() {
    return this.socket.writable;
  }

  /**
   * Ranvier core's Broadcast.at breaks off a displayed prompt with its own
   * `\r\n` before writing a broadcast (guarded by this flag). When a LineEditor
   * is attached and the player has typed input, our write() already breaks the
   * line and reprints the buffer, so core's break would be a redundant second
   * one. Reporting false in exactly that case suppresses core's break and lets
   * our interrupt handling own it. With an empty buffer the real flag is
   * reported, preserving core's break off the bare prompt line.
   */
  get _prompted() {
    if (this._lineEditor && this._lineEditor.hasPendingInput()) {
      return false;
    }

    return this._promptedFlag === true;
  }

  set _prompted(value) {
    this._promptedFlag = value;
  }

  /**
   * Writes directly to the socket, bypassing any input-line interrupt handling.
   *
   * This is the path the LineEditor uses for its own echo and redraws: those
   * bytes must never be treated as broadcast output, or a redraw would recurse
   * back through the interrupt logic that triggered it.
   *
   * @param {string} message
   * @param {string} encoding
   */
  writeRaw(message, encoding = 'utf8') {
    if (!this.writable) {
      return;
    }

    this.socket.write(message, encoding);
  }

  /**
   * Public write path for game output (Broadcast, etc.).
   *
   * When a LineEditor is attached and the player has an in-progress command
   * line, the message is queued and flushed after a short debounce window so a
   * burst of broadcasts reprints the input line once rather than once per line.
   * Otherwise the message is written straight through with no delay.
   *
   * @param {string} message
   * @param {string} encoding
   */
  write(message, encoding = 'utf8') {
    if (this._lineEditor && this._lineEditor.hasPendingInput()) {
      this._enqueueBroadcast(message);
      return;
    }

    this.writeRaw(message, encoding);
  }

  /**
   * Appends a broadcast to the pending queue and arms the debounce timer if it
   * is not already running. The timer is trailing and non-resetting: it fires a
   * fixed interval after the first queued message, bounding the delay of any
   * single message regardless of how long the burst continues.
   *
   * @param {string} message
   */
  _enqueueBroadcast(message) {
    if (!this._broadcastQueue) {
      this._broadcastQueue = [];
    }

    this._broadcastQueue.push(message);

    if (!this._broadcastTimer) {
      this._broadcastTimer = setTimeout(() => this._flushBroadcasts(), BROADCAST_DEBOUNCE_MS);
    }
  }

  /**
   * Flushes all queued broadcasts as a single input-line interrupt: break to a
   * fresh line, write the collected messages, then reprint the prompt + buffer
   * once. If the player is no longer typing by flush time (buffer emptied), the
   * messages are written plainly with no reprint.
   */
  _flushBroadcasts() {
    this._broadcastTimer = null;

    const messages = this._broadcastQueue || [];
    this._broadcastQueue = [];

    if (messages.length === 0) {
      return;
    }

    if (this._lineEditor && this._lineEditor.hasPendingInput()) {
      this.writeRaw('\r\n');
      this.writeRaw(messages.join(''));
      this._lineEditor.redraw();
      return;
    }

    this.writeRaw(messages.join(''));
  }

  pause() {
    this.socket.pause();
  }

  resume() {
    this.socket.resume();
  }

  end() {
    if (this._broadcastTimer) {
      clearTimeout(this._broadcastTimer);
      this._broadcastTimer = null;
    }

    this.socket.end();
  }

  executeToggleEcho() {
    // Flip the echoing flag without sending Telnet IAC bytes.
    // SSH clients connect via socat passthrough — IAC sequences arrive as
    // literal garbage bytes instead of being interpreted as Telnet negotiation.
    // Instead, use ANSI SGR concealment to visually suppress PTY echo.
    this.socket.echoing = !this.socket.echoing;

    // \x1b[8m = SGR concealed (characters invisible at terminal, PTY still
    // echoes bytes but they are hidden from view). \x1b[0m = reset (reveal).
    this.writeRaw(this.socket.echoing ? '\x1b[0m' : '\x1b[8m');

    if (this._lineEditor) {
      this._lineEditor.setEchoEnabled(this.socket.echoing);
    }
  }
}

module.exports = TelnetStream;
