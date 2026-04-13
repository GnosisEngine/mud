// resources/lib/GatherLogic.js
'use strict';

const ResourceVisibility = require('./ResourceVisibility');
const ResourceSplit = require('./ResourceSplit');
const ResourceDefinitions = require('./ResourceDefinitions');

function findNode(args, roomItems) {
  if (!args || !args.trim().length) return null;
  const keyword = args.trim().toLowerCase();
  for (const item of roomItems) {
    if (!item.getMeta || !item.getMeta('resource')) continue;
    const keywords = item.keywords || [];
    if (keywords.some(function(k) { return k.toLowerCase().includes(keyword); })) return item;
  }
  return null;
}

function rollYield(node) {
  const resource = node.getMeta('resource');
  if (!resource || !resource.materials) return {};

  const yields = {};
  for (const [material, range] of Object.entries(resource.materials)) {
    const amount = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    if (amount > 0) yields[material] = amount;
  }
  return yields;
}

function execute(player, room, args, options) {
  options = options || {};
  const roomItems = options.roomItems || [];
  const splitResolver = options.splitResolver || null;
  const roomDropper = options.roomDropper || function() {};
  const removeNode = options.removeNode || function() {};
  const currentTick = options.currentTick !== undefined ? options.currentTick : null;

  if (!args || !args.trim().length) {
    return { ok: false, reason: 'no_args' };
  }

  const node = findNode(args, roomItems);
  if (!node) {
    return { ok: false, reason: 'not_found' };
  }

  if (!ResourceVisibility.canSeeNode(player, node)) {
    return { ok: false, reason: 'not_found' };
  }

  const resource = node.getMeta('resource');
  if (!resource) {
    return { ok: false, reason: 'not_gatherable' };
  }

  const yields = rollYield(node);
  if (!Object.keys(yields).length) {
    return { ok: false, reason: 'nothing_yielded' };
  }

  const expiryTicks = {};
  if (currentTick !== null) {
    for (const resourceKey of Object.keys(yields)) {
      const rotTicks = ResourceDefinitions.getRotTicks(resourceKey);
      if (rotTicks !== null) {
        expiryTicks[resourceKey] = currentTick + rotTicks;
      }
    }
  }

  const allocation = ResourceSplit.distribute(player, room, yields, {
    splitResolver,
    roomDropper,
    expiryTicks,
  });

  if (allocation.length === 0) {
    return { ok: false, reason: 'over_capacity' };
  }

  removeNode(node);

  return {
    ok: true,
    yields,
    allocation,
    node,
    depletedMessage: resource.depletedMessage || 'is depleted.',
  };
}

module.exports = { findNode, rollYield, execute };
