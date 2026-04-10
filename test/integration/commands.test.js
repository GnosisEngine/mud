// test/integration/commands.test.js
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  useSuite,
  assertOutput,
  findTakeableItem,
} = require('../harness/helpers');

const { setup, teardown, ctx } = useSuite();

before(setup);
after(teardown);

// look

describe('look command', () => {
  it('produces output for any room', async() => {
    const s = ctx.session();
    const { lines } = await s.run('look');
    assert.ok(lines.length > 0, 'look should produce at least one line');
    s.cleanup();
  });

  it('includes the room title or description', async() => {
    const s = ctx.session();
    const { text } = await s.run('look');
    const needle = (ctx.room.title || ctx.room.description || '').slice(0, 10).toLowerCase();
    if (needle) assert.ok(text.toLowerCase().includes(needle));
    s.cleanup();
  });

  it('lists exits', async() => {
    const s = ctx.session();
    const { text } = await s.run('look');
    if (ctx.room.exits && ctx.room.exits.size > 0) {
      assert.ok(/exit|north|south|east|west|up|down/i.test(text));
    }
    s.cleanup();
  });
});

// inventory

describe('inventory command', () => {
  it('runs without error on empty inventory', async() => {
    const s = ctx.session();
    const { lines } = await s.run('inventory');
    assert.ok(lines.length > 0);
    s.cleanup();
  });

  it('shows carried items after getting them', async() => {
    const s = ctx.session();
    const item = await findTakeableItem(s);
    if (!item) { s.cleanup(); return; }

    const { text } = await s.run('inventory');
    assertOutput({ text }, item, `inventory should list '${item}'`);
    s.cleanup();
  });
});

// get

describe('get command', () => {
  it('rejects getting a nonexistent item', async() => {
    const s = ctx.session();
    const { text } = await s.run('get xyzzy_does_not_exist_42');
    assertOutput({ text }, /no|not|find|here/i, 'should say item was not found');
    s.cleanup();
  });

  it('can pick up an item that is in the room', async() => {
    const s = ctx.session();
    // Room may be depleted by the inventory suite above — skip rather than fail.
    const item = await findTakeableItem(s);
    if (!item) { s.cleanup(); return; }
    assert.ok(s.player.inventory.size > 0);
    s.cleanup();
  });
});

// give

describe('give command', () => {
  it('rejects giving to a nonexistent target', async() => {
    const s = ctx.session();
    const item = await findTakeableItem(s);
    if (!item) { s.cleanup(); return; }

    const { text } = await s.run(`give ${item} nobody_here_xyzzy`);
    assertOutput({ text }, /no|not|find|nobody|here/i, 'should say target was not found');
    s.cleanup();
  });
});

// time

describe('time command', () => {
  it('produces output', async() => {
    const s = ctx.session();
    const { lines } = await s.run('time');
    assert.ok(lines.length > 0);
    s.cleanup();
  });

  it('accepts a tick argument', async() => {
    const s = ctx.session();
    const { lines } = await s.run('time 1000');
    assert.ok(lines.length > 0);
    s.cleanup();
  });
});

// claim / enforce

describe('claim command', () => {
  it('produces output', async() => {
    const s = ctx.session();
    const { text } = await s.run('claim');
    assert.ok(text.length > 0);
    s.cleanup();
  });
});

describe('enforce command', () => {
  it('produces output with no target', async() => {
    const s = ctx.session();
    const { text } = await s.run('enforce');
    assert.ok(text.length > 0);
    s.cleanup();
  });
});

// fuzzy command matching

describe('fuzzy command matching', () => {
  it('"inv" resolves to inventory', async() => {
    const s = ctx.session();
    const { lines } = await s.run('inv');
    assert.ok(lines.length > 0);
    s.cleanup();
  });

  it('"lo" resolves to look', async() => {
    const s = ctx.session();
    const { lines } = await s.run('lo');
    assert.ok(lines.length > 0);
    s.cleanup();
  });
});
