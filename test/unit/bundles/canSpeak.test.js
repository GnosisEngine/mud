// test/unit/bundles/canSpeak.test.js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const canSpeak = require('../../../bundles/moderation/lib/canSpeak');

// ---------------------------------------------------------------------------
// Minimal stubs
// ---------------------------------------------------------------------------

function makePlayer({ allowedChannels, allowedChannelsMessage, effects = [] } = {}) {
  return {
    room: allowedChannels !== undefined
      ? { metadata: { allowedChannels, allowedChannelsMessage } }
      : { metadata: {} },
    effects: {
      entries: () => effects,
    },
  };
}

function makeEffect(blockedChannels, blockedMessage = 'You cannot speak.') {
  return {
    config: {
      blockedChannels,
      blockedMessage,
    },
  };
}

// ---------------------------------------------------------------------------
// Room-level allowlist
// ---------------------------------------------------------------------------

describe('canSpeak — room allowlist', () => {
  it('returns not-blocked when room has no allowedChannels', () => {
    const player = makePlayer();
    const result = canSpeak(player, 'yell');
    assert.equal(result.blocked, false);
    assert.equal(result.effect, null);
  });

  it('allows a channel that is in the room allowlist', () => {
    const player = makePlayer({ allowedChannels: ['say', 'tell'] });
    assert.equal(canSpeak(player, 'say').blocked, false);
    assert.equal(canSpeak(player, 'tell').blocked, false);
  });

  it('blocks a channel not in the room allowlist', () => {
    const player = makePlayer({ allowedChannels: ['say'] });
    const result = canSpeak(player, 'yell');
    assert.equal(result.blocked, true);
    assert.ok(result.effect, 'should return a synthetic effect');
  });

  it('uses the default block message when none is configured', () => {
    const player = makePlayer({ allowedChannels: ['say'] });
    const result = canSpeak(player, 'chat');
    assert.match(result.effect.config.blockedMessage, /hush/i);
  });

  it('uses a custom allowedChannelsMessage when configured', () => {
    const player = makePlayer({
      allowedChannels: ['say'],
      allowedChannelsMessage: 'Dead quiet in here.',
    });
    const result = canSpeak(player, 'yell');
    assert.equal(result.effect.config.blockedMessage, 'Dead quiet in here.');
  });

  it('room check takes priority over effects', () => {
    // Room blocks the channel; no effect would be needed to prove it's blocked.
    const effect = makeEffect(['say']); // effect also blocks say
    const player = makePlayer({ allowedChannels: ['tell'], effects: [effect] });
    const result = canSpeak(player, 'say');
    assert.equal(result.blocked, true);
    // Should be the room's synthetic effect, not the per-effect one
    assert.ok(!result.effect.config.blockedChannels, 'room effect has no blockedChannels array');
  });
});

// ---------------------------------------------------------------------------
// Per-effect blocklist
// ---------------------------------------------------------------------------

describe('canSpeak — per-effect blocklist', () => {
  it('returns not-blocked when no effects are present', () => {
    const player = makePlayer({ effects: [] });
    assert.equal(canSpeak(player, 'yell').blocked, false);
  });

  it('ignores effects with no blockedChannels property', () => {
    const effect = { config: { name: 'raspy' } }; // no blockedChannels
    const player = makePlayer({ effects: [effect] });
    assert.equal(canSpeak(player, 'yell').blocked, false);
  });

  it('ignores effects where blockedChannels is not an array', () => {
    const effect = { config: { blockedChannels: 'yell' } }; // string, not array
    const player = makePlayer({ effects: [effect] });
    assert.equal(canSpeak(player, 'yell').blocked, false);
  });

  it('blocks a channel listed in an effect blockedChannels', () => {
    const effect = makeEffect(['yell', 'chat']);
    const player = makePlayer({ effects: [effect] });

    assert.equal(canSpeak(player, 'yell').blocked, true);
    assert.equal(canSpeak(player, 'chat').blocked, true);
  });

  it('returns the blocking effect', () => {
    const effect = makeEffect(['yell']);
    const player = makePlayer({ effects: [effect] });
    const result = canSpeak(player, 'yell');
    assert.equal(result.effect, effect);
  });

  it('allows a channel not in any effect blocklist', () => {
    const effect = makeEffect(['yell']);
    const player = makePlayer({ effects: [effect] });
    assert.equal(canSpeak(player, 'say').blocked, false);
  });

  it('stops at the first blocking effect', () => {
    const effect1 = makeEffect(['yell']);
    const effect2 = makeEffect(['yell']);
    const player = makePlayer({ effects: [effect1, effect2] });
    const result = canSpeak(player, 'yell');
    assert.equal(result.effect, effect1, 'should return the first blocking effect');
  });

  it('independent effects do not interfere — expiring one leaves the other', () => {
    const _effect1 = makeEffect(['yell']);
    const effect2 = makeEffect(['chat']);
    // Simulate effect1 expiring by removing it from the entries
    const player = makePlayer({ effects: [effect2] });
    assert.equal(canSpeak(player, 'yell').blocked, false, 'yell should now be allowed');
    assert.equal(canSpeak(player, 'chat').blocked, true,  'chat should still be blocked');
  });
});
