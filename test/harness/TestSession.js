// test/harness/TestSession.js
'use strict';

const { Player } = require('ranvier');
const MockTransport = require('./MockTransport');

const ANSI_STRIP = /\x1b\[[0-9;]*[mGKHF]/g;
const CRLF_NORM = /\r\n/g;

function stripAnsi(str) {
  return str.replace(ANSI_STRIP, '').replace(CRLF_NORM, '\n');
}

let _sessionCounter = 0;

class TestSession {
  constructor(state, player, transport) {
    this.state = state;
    this.player = player;
    this.transport = transport;
  }

  static create(state, roomRef, opts = {}) {
    const transport = new MockTransport();
    const id = ++_sessionCounter;

    const player = new Player({
      name: opts.name || `Tester${id}`,
      socket: transport,
      account: opts.account || { name: `test-account-${id}` },
      prompt: opts.prompt || '> ',
      level: opts.level || 1,
      attributes: opts.attributes,
      inventory: opts.inventory,
      metadata: opts.metadata || {},
    });

    player.socket = transport;
    player.__hydrated = true;

    const room = typeof roomRef === 'string'
      ? state.RoomManager.getRoom(roomRef)
      : roomRef;

    if (!room) {
      throw new Error(`TestSession: room not found: ${roomRef}`);
    }

    player.room = room;
    room.addPlayer(player);

    state.PlayerManager.addPlayer(player);

    transport.drain();

    return new TestSession(state, player, transport);
  }

  async run(cmdLine) {
    this.transport.drain();

    const trimmed = cmdLine.trim();
    if (!trimmed) return this._format('');

    const spaceIdx = trimmed.indexOf(' ');
    const cmdName = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
    const args = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1);

    const command = this.state.CommandManager.find(cmdName);
    if (!command) {
      throw new Error(`TestSession: command not found: "${cmdName}"`);
    }

    command.execute(args, this.player, cmdName);

    await new Promise(resolve => setImmediate(resolve));

    const raw = this.transport.drain();
    return this._format(raw);
  }

  _format(raw) {
    const text = stripAnsi(raw);
    const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l.length > 0);
    return { raw, text, lines };
  }

  cleanup() {
    if (this.player.room) {
      this.player.room.removePlayer(this.player);
    }
    this.state.PlayerManager.removePlayer(this.player);
    this.player.__pruned = true;
  }
}

module.exports = { TestSession, stripAnsi };