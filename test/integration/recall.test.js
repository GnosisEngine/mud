// test/integration/recall.test.js
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PlayerRoles } = require('ranvier');
const {
  useSuite,
  session,
  getRoom,
  assertOutput,
} = require('../harness/helpers');

const { setup, teardown, ctx } = useSuite('lobby:commons');

before(setup);
after(teardown);

describe('recall', () => {
  it('says there is nowhere to recall to when no points are granted', async() => {
    const s = ctx.session();

    const result = await s.run('recall');
    assertOutput(result, /nowhere to recall/i, 'should say there is nowhere to recall to');

    s.cleanup();
  });

  it('rejects an unknown label', async() => {
    const s = ctx.session();

    const result = await s.run('recall nowhere');
    assertOutput(result, /no recall point named 'nowhere'/i, 'should reject an unknown label');

    s.cleanup();
  });

  it('rejects bind from a non-admin', async() => {
    const player = ctx.session();
    const target = session(ctx.state, 'lobby:commons');

    const result = await player.run(`bind ${target.player.name} home`);
    assertOutput(result, /do not have permission/i, 'should reject a non-admin attempting to bind');

    player.cleanup();
    target.cleanup();
  });

  it('rejects bind targeting a player who is not present', async() => {
    const admin = ctx.session();
    admin.player.role = PlayerRoles.ADMIN;

    const result = await admin.run('bind nobodyhere home');
    assertOutput(result, /not here/i, 'should reject a target who is not in the room');

    admin.cleanup();
  });

  it('admin grants a recall point using their current room, and the player can recall there', async() => {
    const admin = ctx.session();
    admin.player.role = PlayerRoles.ADMIN;

    const target = session(ctx.state, 'lobby:commons');

    let result = await admin.run(`bind ${target.player.name} home`);
    assertOutput(result, /can now recall to 'home'/i, 'admin should be told the grant succeeded');

    result = await target.run('recall');
    assertOutput(result, /home - The Common Room/i, 'should list the granted recall point with its room title');

    target.player.moveTo(getRoom(ctx.state, 'lobby:arrival'));

    result = await target.run('recall home');
    assertOutput(result, /blurs and reshapes/i, 'recalling should show the recall flavor text');
    assert.equal(target.player.room.entityReference, 'lobby:commons', 'player should be back in the bound room');

    admin.cleanup();
    target.cleanup();
  });

  it('admin grants a recall point via an explicit room reference', async() => {
    const admin = ctx.session();
    admin.player.role = PlayerRoles.ADMIN;

    const target = session(ctx.state, 'lobby:commons');

    let result = await admin.run(`bind ${target.player.name} back lobby:quietroom`);
    assertOutput(result, /can now recall to 'back'/i, 'admin should be told the grant succeeded');

    result = await target.run('recall back');
    assert.equal(target.player.room.entityReference, 'lobby:quietroom', 'player should recall to the explicit room reference');

    admin.cleanup();
    target.cleanup();
  });

  it('rejects an explicit destination that is not a valid room reference', async() => {
    const admin = ctx.session();
    admin.player.role = PlayerRoles.ADMIN;

    const target = session(ctx.state, 'lobby:commons');

    const result = await admin.run(`bind ${target.player.name} bad notaref`);
    assertOutput(result, /not a valid room reference/i, 'should reject a destination without an area:room format');

    admin.cleanup();
    target.cleanup();
  });

  it('recalling to where you already are is a no-op', async() => {
    const admin = ctx.session();
    admin.player.role = PlayerRoles.ADMIN;

    const target = session(ctx.state, 'lobby:commons');

    await admin.run(`bind ${target.player.name} home`);

    const result = await target.run('recall home');
    assertOutput(result, /already there/i, 'should say the player is already there');

    admin.cleanup();
    target.cleanup();
  });
});
