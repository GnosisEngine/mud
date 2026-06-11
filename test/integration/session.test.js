// test/integration/session.test.js
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const linkMonitor = require('../../bundles/session/lib/linkMonitor');
const etherealDef = require('../../bundles/session/effects/ethereal');
const { EVENTS } = require('../../bundles/session/events');
const { isEthereal } = require('../../bundles/session/logic');
const { useSuite, flush } = require('../harness/helpers');

const { setup, teardown, ctx } = useSuite();

before(setup);
after(teardown);

describe('session bundle', () => {
  it('ethereal effect is configured to never persist to the save file', () => {
    assert.equal(etherealDef.config.type, 'ethereal');
    assert.equal(etherealDef.config.persists, false);
  });

  it('flags a player as ethereal when their connection closes', async() => {
    const s = ctx.session();
    linkMonitor.attach(ctx.state, s.transport);

    let entered = false;
    s.player.once(EVENTS.ENTER_ETHEREAL, () => { entered = true; });

    s.transport.emit('close');

    assert.ok(entered, 'should emit ethereal:enter');
    assert.ok(isEthereal(ctx.state, s.player), 'player should be flagged ethereal');

    s.cleanup();
  });

  it('a repeated close on an already-ethereal player is a no-op', async() => {
    const s = ctx.session();
    linkMonitor.attach(ctx.state, s.transport);

    s.transport.emit('close');
    s.transport.emit('close');

    const etherealEffects = s.player.effects.entries().filter(e => e.config.type === 'ethereal');
    assert.equal(etherealEffects.length, 1, 'should have exactly one ethereal effect');

    s.cleanup();
  });

  it('ignores a stale stream after a reconnect takeover reassigns the socket', async() => {
    const { a, b } = ctx.twoSessions();
    linkMonitor.attach(ctx.state, a.transport);

    // simulate choose-character.js's takeover: a's player now owns b's stream
    a.player.socket = b.transport;

    a.transport.emit('close');

    assert.equal(isEthereal(ctx.state, a.player), false, 'stale stream close should not flag the player');

    a.cleanup();
    b.cleanup();
  });

  it('clears ethereal state on reconnect without removing the player', async() => {
    const s = ctx.session();

    const effect = ctx.state.EffectFactory.create('ethereal', { duration: 50000 });
    s.player.addEffect(effect);
    assert.ok(isEthereal(ctx.state, s.player), 'player should be ethereal after disconnect');

    let exited = false;
    s.player.once(EVENTS.EXIT_ETHEREAL, () => { exited = true; });

    s.player.removeEffect(s.player.effects.getByType('ethereal'));

    assert.ok(exited, 'should emit ethereal:exit');
    assert.equal(isEthereal(ctx.state, s.player), false, 'ethereal effect should be cleared');
    assert.equal(ctx.state.PlayerManager.getPlayer(s.player.name), s.player, 'player should remain online');

    s.cleanup();
  });

  it('removes the player from the world when the grace period expires', async() => {
    const s = ctx.session();
    const room = s.player.room;

    for (const listener of ctx.state.PlayerManager.events.get('save')) {
      s.player.on('save', listener.bind(s.player));
    }

    const loader = ctx.state.PlayerManager.loader;
    const origUpdate = loader.update.bind(loader);
    loader.update = async() => {};

    let graceExpired = false;
    s.player.once(EVENTS.GRACE_EXPIRED, () => { graceExpired = true; });

    const effect = ctx.state.EffectFactory.create('ethereal', { duration: 10 });
    s.player.addEffect(effect);

    await new Promise(resolve => setTimeout(resolve, 20));
    s.player.emit('updateTick');
    await flush(3);

    loader.update = origUpdate;

    assert.ok(graceExpired, 'should emit ethereal:grace-expired');
    assert.equal(ctx.state.PlayerManager.getPlayer(s.player.name), undefined, 'player should be removed');
    assert.ok(![...room.players].includes(s.player), 'player should leave the room');
  });
});
