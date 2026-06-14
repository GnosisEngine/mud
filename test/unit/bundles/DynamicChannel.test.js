// test/unit/bundles/DynamicChannel.test.js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const DynamicChannelAudience = require('../../../bundles/channels/lib/DynamicChannelAudience');
const DynamicChannelRegistry = require('../../../bundles/channels/lib/DynamicChannelRegistry');
const { buildDynamicChannel, BlockedByChannelRestriction } = require('../../../bundles/channels/lib/buildDynamicChannel');

// ---------------------------------------------------------------------------
// Minimal stubs
// ---------------------------------------------------------------------------

function makePlayer(name, opts = {}) {
  return {
    name,
    room: opts.room ?? { metadata: {} },
    effects: { entries: () => [] },
  };
}

function makeRegistry() {
  const reg = new DynamicChannelRegistry();
  // Stub channelStore.save so persist() is a no-op
  const channelStore = require('../../../bundles/channels/lib/channelStore');
  const _orig = channelStore.save;
  channelStore.save = () => {};
  return { reg, restore: () => { channelStore.save = _orig; } };
}

// ---------------------------------------------------------------------------
// DynamicChannelAudience
// ---------------------------------------------------------------------------

describe('DynamicChannelAudience', () => {
  it('returns empty array when channel entry does not exist', () => {
    const { reg, restore } = makeRegistry();
    try {
      const audience = new DynamicChannelAudience(reg, 'nonexistent');
      audience.state = { PlayerManager: { getPlayersAsArray: () => [] } };
      assert.deepEqual(audience.getBroadcastTargets(), []);
    } finally {
      restore();
    }
  });

  it('returns only online players who are members', () => {
    const { reg, restore } = makeRegistry();
    try {
      reg.create('myroom', 'pw1', 'alice');
      reg.invite('myroom', 'bob');

      const alice = makePlayer('alice');
      const bob   = makePlayer('bob');
      const carol = makePlayer('carol'); // online but not a member

      const audience = new DynamicChannelAudience(reg, 'myroom');
      audience.state = {
        PlayerManager: { getPlayersAsArray: () => [alice, bob, carol] },
      };

      const targets = audience.getBroadcastTargets();
      assert.equal(targets.length, 2);
      assert.ok(targets.includes(alice));
      assert.ok(targets.includes(bob));
      assert.ok(!targets.includes(carol));
    } finally {
      restore();
    }
  });

  it('returns empty array when no members are online', () => {
    const { reg, restore } = makeRegistry();
    try {
      reg.create('ghost', 'pw', 'alice');

      const audience = new DynamicChannelAudience(reg, 'ghost');
      audience.state = {
        PlayerManager: { getPlayersAsArray: () => [makePlayer('bob')] },
      };

      assert.deepEqual(audience.getBroadcastTargets(), []);
    } finally {
      restore();
    }
  });
});

// ---------------------------------------------------------------------------
// buildDynamicChannel + BlockedByChannelRestriction
// ---------------------------------------------------------------------------

describe('buildDynamicChannel', () => {
  it('returns a Channel object with the correct name', () => {
    const { reg, restore } = makeRegistry();
    try {
      reg.create('cabal', 'pw', 'alice');
      const channel = buildDynamicChannel(reg, 'cabal', 'alice');
      assert.equal(channel.name, 'cabal');
    } finally {
      restore();
    }
  });

  it('description mentions the owner and join syntax', () => {
    const { reg, restore } = makeRegistry();
    try {
      reg.create('cabal', 'pw', 'alice');
      const channel = buildDynamicChannel(reg, 'cabal', 'alice');
      assert.match(channel.description, /alice/i);
      assert.match(channel.description, /channel join cabal/i);
    } finally {
      restore();
    }
  });

  it('target formatter returns formatted string', () => {
    const { reg, restore } = makeRegistry();
    try {
      reg.create('cabal', 'pw', 'alice');
      const channel = buildDynamicChannel(reg, 'cabal', 'alice');

      const alice = makePlayer('alice');
      const bob   = makePlayer('bob');
      const formatter = channel.formatter;

      const result = formatter.target(alice, bob, 'hello world', s => s);
      assert.match(result, /cabal/);
      assert.match(result, /alice: hello world/i);
    } finally {
      restore();
    }
  });

  it('BlockedByChannelRestriction is an Error subclass', () => {
    assert.ok(new BlockedByChannelRestriction() instanceof Error);
  });
});
