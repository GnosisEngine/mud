// test/integration/dynamic-channels.test.js
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PlayerRoles } = require('ranvier');
const {
  useSuite,
  assertOutput,
} = require('../harness/helpers');

const { setup, teardown, ctx } = useSuite('lobby:commons');

before(setup);
after(teardown);

function admin() {
  const s = ctx.session();
  s.player.role = PlayerRoles.ADMIN;
  return s;
}

describe('dynamic channels', () => {
  it('rejects create/join/invite from a non-admin', async() => {
    const s = ctx.session();

    let result = await s.run('channel create cabal secret123');
    assertOutput(result, /do not have permission/i, 'create should be admin-only');

    result = await s.run('channel join cabal secret123');
    assertOutput(result, /do not have permission/i, 'join should be admin-only');

    result = await s.run('channel invite somebody cabal');
    assertOutput(result, /do not have permission/i, 'invite should be admin-only');

    s.cleanup();
  });

  it('rejects an invalid channel name', async() => {
    const s = admin();

    const result = await s.run('channel create 1abc secret');
    assertOutput(result, /lowercase letters/i, 'should reject a name starting with a digit');

    s.cleanup();
  });

  it('rejects a name that collides with an existing channel', async() => {
    const s = admin();

    const result = await s.run('channel create say secret');
    assertOutput(result, /already in use/i, 'should reject a name colliding with a static channel');

    s.cleanup();
  });

  it('creates a channel, registers it, and auto-joins the creator', async() => {
    const s = admin();

    const result = await s.run('channel create cabal secret123');
    assertOutput(result, /created/i, 'should confirm creation');

    assert.ok(ctx.state.ChannelManager.get('cabal'), 'channel should be registered with the channel manager');
    assert.equal(ctx.state.DynamicChannelRegistry.isMember('cabal', s.player.name), true, 'creator should be a member');

    s.cleanup();
  });

  it('rejects creating a channel with a name already taken', async() => {
    const s = admin();

    await s.run('channel create dupe pass1');
    const result = await s.run('channel create dupe pass2');
    assertOutput(result, /already in use/i, 'should reject a duplicate name');

    s.cleanup();
  });

  it('a non-member cannot send on a dynamic channel', async() => {
    const owner = admin();
    await owner.run('channel create secretclub abc123');

    const outsider = ctx.session();
    const channel = ctx.state.ChannelManager.get('secretclub');

    if (!channel) {
      assert.fail('Channel not ready');
    }

    outsider.transport.drain();
    let threw = false;
    try {
      channel.send(ctx.state, outsider.player, 'hello');
    } catch (_) {
      threw = true;
    }
    const out = outsider.transport.drain();

    assert.ok(threw, 'sending should be blocked for a non-member');
    assert.match(out, /haven't joined/i, 'should explain how to join');

    owner.cleanup();
    outsider.cleanup();
  });

  it('joining requires the correct password', async() => {
    const owner = admin();
    await owner.run('channel create lockedroom pw1');

    const joiner = admin();

    let result = await joiner.run('channel join lockedroom wrongpw');
    assertOutput(result, /incorrect password/i, 'should reject the wrong password');

    result = await joiner.run('channel join lockedroom pw1');
    assertOutput(result, /you join/i, 'should accept the correct password');

    owner.cleanup();
    joiner.cleanup();
  });

  it('members can message each other and non-members receive nothing', async() => {
    const owner = admin();
    await owner.run('channel create chatty pw2');

    const member = admin();
    await member.run('channel join chatty pw2');

    const outsider = ctx.session();

    const channel = ctx.state.ChannelManager.get('chatty');

    if (!channel) {
      assert.fail('Channel not ready');
    }

    owner.transport.drain();
    member.transport.drain();
    outsider.transport.drain();

    channel.send(ctx.state, owner.player, 'hello team');

    const ownerOut = owner.transport.drain();
    const memberOut = member.transport.drain();
    const outsiderOut = outsider.transport.drain();

    assert.match(ownerOut, /You: hello team/, 'sender should see their own message');
    assert.match(memberOut, new RegExp(`${owner.player.name}: hello team`), 'member should receive the message');
    assert.equal(outsiderOut, '', 'non-member should receive nothing');

    owner.cleanup();
    member.cleanup();
    outsider.cleanup();
  });

  it('leaving a channel revokes send access', async() => {
    const owner = admin();
    await owner.run('channel create leaveme pw3');

    const member = admin();
    await member.run('channel join leaveme pw3');
    await member.run('channel leave leaveme');

    const channel = ctx.state.ChannelManager.get('leaveme');

    if (!channel) {
      assert.fail('Channel not ready');
    }

    member.transport.drain();
    let threw = false;
    try {
      channel.send(ctx.state, member.player, 'hi');
    } catch (_) {
      threw = true;
    }

    assert.ok(threw, 'sending should be blocked after leaving');

    owner.cleanup();
    member.cleanup();
  });

  it('list shows channels with member counts and joined status', async() => {
    const owner = admin();
    await owner.run('channel create listed pw4');

    const result = await owner.run('channel list');
    assertOutput(result, /listed - 1 member \(joined\)/i, 'should show the channel with member count and joined marker');

    owner.cleanup();
  });

  describe('invite', () => {
    it('rejects inviting to an unknown channel', async() => {
      const owner = admin();
      const target = ctx.session();

      const result = await owner.run(`channel invite ${target.player.name} nosuchchannel`);
      assertOutput(result, /no such channel/i, 'should reject an unknown channel');

      owner.cleanup();
      target.cleanup();
    });

    it('rejects inviting a player who is not present', async() => {
      const owner = admin();
      await owner.run('channel create invited1 pw5');

      const result = await owner.run('channel invite nobodyhere invited1');
      assertOutput(result, /not here/i, 'should reject a target who is not in the room');

      owner.cleanup();
    });

    it('lets a non-admin send and receive after being invited', async() => {
      const owner = admin();
      await owner.run('channel create invited2 pw6');

      const target = ctx.session();
      assert.equal(target.player.role, PlayerRoles.PLAYER, 'invited player should not be an admin');

      let result = await owner.run(`channel invite ${target.player.name} invited2`);
      assertOutput(result, /has been added to 'invited2'/i, 'owner should be told the invite succeeded');

      assert.equal(ctx.state.DynamicChannelRegistry.isMember('invited2', target.player.name), true, 'target should now be a member');

      const channel = ctx.state.ChannelManager.get('invited2');

      if (!channel) {
        assert.fail('Channel not ready');
      }

      owner.transport.drain();
      target.transport.drain();

      channel.send(ctx.state, target.player, 'thanks for the invite');

      const targetOut = target.transport.drain();
      const ownerOut = owner.transport.drain();

      assert.match(targetOut, /You: thanks for the invite/, 'invited player should be able to send');
      assert.match(ownerOut, new RegExp(`${target.player.name}: thanks for the invite`), 'owner should receive the message from the invited player');

      // the invited player still can't manage channels
      result = await target.run('channel create another secret');
      assertOutput(result, /do not have permission/i, 'invited non-admin still cannot create channels');

      owner.cleanup();
      target.cleanup();
    });

    it('rejects inviting someone who is already a member', async() => {
      const owner = admin();
      await owner.run('channel create invited3 pw7');

      const target = ctx.session();
      await owner.run(`channel invite ${target.player.name} invited3`);

      const result = await owner.run(`channel invite ${target.player.name} invited3`);
      assertOutput(result, /already a member/i, 'should reject inviting an existing member');

      owner.cleanup();
      target.cleanup();
    });
  });
});
