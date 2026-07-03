'use strict';

const { Sequences } = require('ranvier-telnet');
const { TransportStream } = require('ranvier');

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
   * @param {LineEditor} lineEditor
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

  write(message, encoding = 'utf8') {
    if (!this.writable) {
      return;
    }

    this.socket.write(message, encoding);
  }

  pause() {
    this.socket.pause();
  }

  resume() {
    this.socket.resume();
  }

  end() {
    this.socket.end();
  }

  executeToggleEcho() {
    // Flip the echoing flag without sending Telnet IAC bytes.
    // SSH clients connect via socat passthrough — IAC sequences arrive as
    // literal garbage bytes instead of being interpreted as Telnet negotiation.
    this.socket.echoing = !this.socket.echoing;

    if (this.socket.echoing) {
      // Restore: show cursor, reset SGR concealment.
      this.write('\x1b[?25h\x1b[0m');
    } else {
      // Password mode: conceal glyphs via SGR 8, hide cursor so PTY echo
      // cursor advance (which we cannot suppress over SSH) is not visible.
      this.write('\x1b[?25l\x1b[8m');
    }

    if (this._lineEditor) {
      this._lineEditor.setEchoEnabled(this.socket.echoing);
    }
  }
}

module.exports = TelnetStream;
