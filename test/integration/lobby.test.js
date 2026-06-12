// test/integration/lobby.test.js
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { Config } = require('ranvier');
const {
  useSuite,
  session,
  getRoom,
} = require('../harness/helpers');

const { setup, teardown, ctx } = useSuite('lobby:commons');

before(setup);
after(teardown);

describe('lobby area', () => {
  it('connects arrival, commons, and the wider world', () => {
    const arrival = getRoom(ctx.state, 'lobby:arrival');
    const commons = getRoom(ctx.state, 'lobby:commons');
    const white = getRoom(ctx.state, 'limbo:white');

    assert.equal(arrival.getExits().find(e => e.direction === 'east')?.roomId, 'lobby:commons');
    assert.equal(commons.getExits().find(e => e.direction === 'west')?.roomId, 'lobby:arrival');
    assert.equal(commons.getExits().find(e => e.direction === 'north')?.roomId, 'limbo:white');
    assert.equal(white.getExits().find(e => e.direction === 'south')?.roomId, 'lobby:commons');
  });

  it('is the configured starting room for new characters', () => {
    assert.equal(Config.get('startingRoom'), 'lobby:arrival');
    assert.ok(getRoom(ctx.state, 'lobby:arrival'));
  });

  it('the back room has no exits and is reachable only by teleport', () => {
    const quietRoom = getRoom(ctx.state, 'lobby:quietroom');
    assert.deepEqual(quietRoom.getExits(), []);
  });
});

describe('room communication restriction', () => {
  it('allows say but blocks other channels in the back room', () => {
    const s = session(ctx.state, 'lobby:quietroom');

    const sayChannel = ctx.state.ChannelManager.get('say');
    const chatChannel = ctx.state.ChannelManager.get('chat');

    s.transport.drain();
    sayChannel.send(ctx.state, s.player, 'hello');
    let out = s.transport.drain();
    assert.match(out, /you say/i, 'say should work in the back room');

    let threw = false;
    try {
      chatChannel.send(ctx.state, s.player, 'hello');
    } catch (_) {
      threw = true;
    }
    out = s.transport.drain();

    assert.ok(threw, 'chat should be blocked in the back room');
    assert.match(out, /tapestries swallow your words/i, 'should show the room-specific block message');

    s.cleanup();
  });

  it('does not restrict channels in the common room', () => {
    const s = session(ctx.state, 'lobby:commons');

    const chatChannel = ctx.state.ChannelManager.get('chat');

    s.transport.drain();
    chatChannel.send(ctx.state, s.player, 'hello');
    const out = s.transport.drain();

    assert.match(out, /you chat/i, 'chat should work outside the back room');

    s.cleanup();
  });
});
