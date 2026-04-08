// test/integration/COMMAND_NAME.test.js
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  useSuite,
  assertOutput,
  assertNoOutput,
  findTakeableItem,
  giveItem,
  spawnNpc,
  removeNpc,
  flush,
} = require('../harness/helpers');

// Pass a room ref to pin the suite to a specific room, or omit for any room.
// Pass a function e.g. (state) => state.RoomManager.getRoom('fief:someroom')
// for dynamic lookup.
const { setup, teardown, ctx } = useSuite(/* 'area:roomid' */);

before(setup);
after(teardown);

// ---------------------------------------------------------------------------

describe('COMMAND_NAME command', () => {
  it('does something', async () => {
    const s = ctx.session();

    const { text, lines } = await s.run('COMMAND_NAME arg1 arg2');

    assert.ok(lines.length > 0, 'should produce output');
    assertOutput({ text }, /expected pattern/i);

    s.cleanup();
  });

  it('rejects bad input gracefully', async () => {
    const s = ctx.session();

    const result = await s.run('COMMAND_NAME');
    assertOutput(result, /usage|missing|required/i, 'should show usage on empty args');

    s.cleanup();
  });

  it('works after picking up an item', async () => {
    const s = ctx.session();
    const item = await findTakeableItem(s);
    if (!item) { s.cleanup(); return; }

    const result = await s.run(`COMMAND_NAME ${item}`);
    assertOutput(result, /something/i);

    s.cleanup();
  });

  it('two players interact', async () => {
    const { a, b } = ctx.twoSessions();

    await a.run('say hello');
    const bOutput = await b.run('look'); // b sees a in the room

    assertOutput(bOutput, new RegExp(a.player.name, 'i'));

    a.cleanup();
    b.cleanup();
  });
});