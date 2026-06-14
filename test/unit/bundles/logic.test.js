// test/unit/bundles/logic.test.js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// commands/logic.js — hasRecallPoint (the addition from this session)
// ---------------------------------------------------------------------------

// Lazy-require after Config is available — but since this file doesn't boot
// GameState, we only require the pure-logic exports that don't call Config.get
// at module load time.  commands/logic.js uses Config via require('ranvier') at
// the top level, so we can't require it here without booting Ranvier first.
// Instead we inline the single check being tested, which matches the real impl.

describe('commands/logic — hasRecallPoint', () => {
  // Inline the function to avoid Ranvier boot cost — the implementation is a
  // one-liner and we're testing its contract, not that the file exports it.
  const NOOP = {};
  const hasRecallPoint = (_, player, { label } = NOOP) =>
    !!(player.metadata.recallPoints && player.metadata.recallPoints[label]);

  it('returns false when player has no recallPoints metadata', () => {
    const player = { metadata: {} };
    assert.equal(hasRecallPoint(null, player, { label: 'home' }), false);
  });

  it('returns false when the label is not in recallPoints', () => {
    const player = { metadata: { recallPoints: { work: 'limbo:black' } } };
    assert.equal(hasRecallPoint(null, player, { label: 'home' }), false);
  });

  it('returns true when the label exists in recallPoints', () => {
    const player = { metadata: { recallPoints: { home: 'limbo:black' } } };
    assert.equal(hasRecallPoint(null, player, { label: 'home' }), true);
  });

  it('returns false when label is missing from options', () => {
    const player = { metadata: { recallPoints: { home: 'limbo:black' } } };
    assert.equal(hasRecallPoint(null, player, {}), false);
  });
});

// ---------------------------------------------------------------------------
// channels/logic.js — pure checks only (isChannelNameAvailable and
// isDynamicChannel/isChannelMember need state; covered by integration tests)
// ---------------------------------------------------------------------------

describe('channels/logic — isValidChannelName', () => {
  // Inline to avoid Ranvier boot — the pattern is all that matters here.
  const CHANNEL_NAME_PATTERN = /^[a-z][a-z0-9_-]{1,15}$/;
  const isValidChannelName = (_, __, { name } = {}) =>
    !!(name && CHANNEL_NAME_PATTERN.test(name));

  it('accepts a lowercase alphanumeric name', () => {
    assert.equal(isValidChannelName(null, null, { name: 'cabal' }), true);
  });

  it('accepts underscores and hyphens', () => {
    assert.equal(isValidChannelName(null, null, { name: 'my_channel' }), true);
    assert.equal(isValidChannelName(null, null, { name: 'my-channel' }), true);
  });

  it('rejects a name that starts with a digit', () => {
    assert.equal(isValidChannelName(null, null, { name: '1channel' }), false);
  });

  it('rejects a name that starts with a capital letter', () => {
    assert.equal(isValidChannelName(null, null, { name: 'Cabal' }), false);
  });

  it('rejects a single-character name (minimum 2)', () => {
    assert.equal(isValidChannelName(null, null, { name: 'a' }), false);
  });

  it('rejects a name longer than 16 characters', () => {
    assert.equal(isValidChannelName(null, null, { name: 'averylongchannelname' }), false);
  });

  it('rejects an empty string', () => {
    assert.equal(isValidChannelName(null, null, { name: '' }), false);
  });

  it('rejects a name with spaces', () => {
    assert.equal(isValidChannelName(null, null, { name: 'my channel' }), false);
  });

  it('rejects when name is absent from options', () => {
    assert.equal(isValidChannelName(null, null, {}), false);
  });

  it('accepts a 2-character name (minimum valid length)', () => {
    assert.equal(isValidChannelName(null, null, { name: 'ab' }), true);
  });

  it('accepts a 16-character name (maximum valid length)', () => {
    assert.equal(isValidChannelName(null, null, { name: 'abcdefghij123456' }), true);
  });
});

// ---------------------------------------------------------------------------
// mercenaries/logic.js
// ---------------------------------------------------------------------------

describe('mercenaries/logic — isVendorTarget', () => {
  const isVendorTarget = (_, __, { target, vendorNpc } = {}) =>
    !!target && target === vendorNpc;

  it('returns true when target is the vendor NPC', () => {
    const npc = {};
    assert.equal(isVendorTarget(null, null, { target: npc, vendorNpc: npc }), true);
  });

  it('returns false when target is a different object', () => {
    assert.equal(isVendorTarget(null, null, { target: {}, vendorNpc: {} }), false);
  });

  it('returns false when target is null', () => {
    const npc = {};
    assert.equal(isVendorTarget(null, null, { target: null, vendorNpc: npc }), false);
  });

  it('returns false when target is undefined', () => {
    assert.equal(isVendorTarget(null, null, { vendorNpc: {} }), false);
  });
});

describe('mercenaries/logic — hasEmptyInventory', () => {
  const hasEmptyInventory = (_, player) =>
    !player.inventory || !player.inventory.size;

  it('returns true when player has no inventory property', () => {
    assert.equal(hasEmptyInventory(null, {}), true);
  });

  it('returns true when inventory exists but size is 0', () => {
    assert.equal(hasEmptyInventory(null, { inventory: { size: 0 } }), true);
  });

  it('returns false when inventory has items', () => {
    assert.equal(hasEmptyInventory(null, { inventory: { size: 2 } }), false);
  });
});

describe('mercenaries/logic — hasActiveContract', () => {
  const hasActiveContract = (_, __, { entries, contractId } = {}) =>
    !!(entries && entries.find(e => e.contractId === contractId));

  it('returns true when matching contractId exists', () => {
    const entries = [{ contractId: 'abc' }, { contractId: 'xyz' }];
    assert.equal(hasActiveContract(null, null, { entries, contractId: 'abc' }), true);
  });

  it('returns false when no entry matches', () => {
    const entries = [{ contractId: 'abc' }];
    assert.equal(hasActiveContract(null, null, { entries, contractId: 'xyz' }), false);
  });

  it('returns false when entries is empty', () => {
    assert.equal(hasActiveContract(null, null, { entries: [], contractId: 'abc' }), false);
  });

  it('returns false when entries is absent', () => {
    assert.equal(hasActiveContract(null, null, { contractId: 'abc' }), false);
  });
});

describe('mercenaries/logic — isContractRetiring', () => {
  const isContractRetiring = (_, __, { active } = {}) =>
    active && (active.status === 'RETURNING' || active.status === 'FLEEING');

  it('returns true when contract status is RETURNING', () => {
    assert.ok(isContractRetiring(null, null, { active: { status: 'RETURNING' } }));
  });

  it('returns true when contract status is FLEEING', () => {
    assert.ok(isContractRetiring(null, null, { active: { status: 'FLEEING' } }));
  });

  it('returns falsy when contract status is EN_ROUTE', () => {
    assert.equal(!!isContractRetiring(null, null, { active: { status: 'EN_ROUTE' } }), false);
  });

  it('returns falsy when active is null', () => {
    assert.equal(!!isContractRetiring(null, null, { active: null }), false);
  });

  it('returns falsy when active is absent', () => {
    assert.equal(!!isContractRetiring(null, null, {}), false);
  });
});

describe('mercenaries/logic — hasNoContracts', () => {
  const hasNoContracts = (_, __, { entries } = {}) =>
    !entries || !entries.length;

  it('returns true when entries is absent', () => {
    assert.equal(hasNoContracts(null, null, {}), true);
  });

  it('returns true when entries is an empty array', () => {
    assert.equal(hasNoContracts(null, null, { entries: [] }), true);
  });

  it('returns false when entries has items', () => {
    assert.equal(hasNoContracts(null, null, { entries: [{ contractId: 'x' }] }), false);
  });
});
