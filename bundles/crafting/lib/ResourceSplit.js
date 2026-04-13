// resources/lib/ResourceSplit.js
'use strict';

const ResourceContainer = require('./ResourceContainer');

function _applyFloorSplit(yields, splits) {
  const shares = splits.map(s => ({ entity: s.entity, amounts: {} }));
  const remainder = {};

  for (const [resourceKey, totalAmount] of Object.entries(yields)) {
    let allocated = 0;

    for (let i = 0; i < splits.length; i++) {
      const share = Math.floor(totalAmount * splits[i].percentage);
      shares[i].amounts[resourceKey] = share;
      allocated += share;
    }

    const leftover = totalAmount - allocated;
    if (leftover > 0) {
      remainder[resourceKey] = (remainder[resourceKey] || 0) + leftover;
    }
  }

  return { shares, remainder };
}

function _tryAdd(entity, resourceKey, amount, room, roomDropper, allocation, expiryTick) {
  if (amount <= 0) return;
  const result = ResourceContainer.add(entity, resourceKey, amount, expiryTick);
  if (result.ok) {
    if (!allocation.has(entity)) allocation.set(entity, {});
    const map = allocation.get(entity);
    map[resourceKey] = (map[resourceKey] || 0) + amount;
  } else if (result.reason === 'over_capacity') {
    roomDropper(room, resourceKey, amount);
  }
}

function _allocationToArray(allocation) {
  return Array.from(allocation.entries()).map(([entity, amounts]) => ({ entity, amounts }));
}

function distribute(player, room, yields, options = {}) {
  const splitResolver = options.splitResolver || null;
  const roomDropper = options.roomDropper || function() {};
  const expiryTicks = options.expiryTicks || {};
  const allocation = new Map();

  const splits = splitResolver ? splitResolver(room) : null;

  if (!splits || splits.length === 0) {
    for (const [resourceKey, amount] of Object.entries(yields)) {
      _tryAdd(player, resourceKey, amount, room, roomDropper, allocation, expiryTicks[resourceKey]);
    }
    return _allocationToArray(allocation);
  }

  const fullSplits = [{ entity: player, percentage: 0 }, ...splits];
  const totalAllocated = splits.reduce((sum, s) => sum + s.percentage, 0);
  fullSplits[0].percentage = Math.max(0, 1 - totalAllocated);

  const { shares, remainder } = _applyFloorSplit(yields, fullSplits);

  for (const { entity, amounts } of shares) {
    for (const [resourceKey, amount] of Object.entries(amounts)) {
      _tryAdd(entity, resourceKey, amount, room, roomDropper, allocation, expiryTicks[resourceKey]);
    }
  }

  for (const [resourceKey, amount] of Object.entries(remainder)) {
    _tryAdd(player, resourceKey, amount, room, roomDropper, allocation, expiryTicks[resourceKey]);
  }

  return _allocationToArray(allocation);
}

module.exports = { distribute };
