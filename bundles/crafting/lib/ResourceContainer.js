// resources/lib/ResourceContainer.js
'use strict';

const ResourceDefinitions = require('./ResourceDefinitions');

const CARRY_MULTIPLIER = 10;

function _getMeta(entity, key) {
  return entity.getMeta(key);
}

function _setMeta(entity, key, value) {
  entity.setMeta(key, value);
}

function _getHeldMap(entity) {
  return _getMeta(entity, 'resources') || {};
}

function _getCarryCapacity(entity) {
  return (entity.getAttribute('strength') || 0) * CARRY_MULTIPLIER;
}

function getHeld(entity) {
  return { ..._getHeldMap(entity) };
}

function getTotalWeight(entity) {
  const held = _getHeldMap(entity);
  let total = 0;
  for (const [key, amount] of Object.entries(held)) {
    const w = ResourceDefinitions.getWeight(key);
    if (w !== null) {
      total += w * amount;
    }
  }
  return total;
}

function canAdd(entity, resourceKey, amount) {
  if (!ResourceDefinitions.isValidKey(resourceKey)) {
    return { ok: false, reason: 'unknown_resource' };
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }
  const addedWeight = ResourceDefinitions.getWeight(resourceKey) * amount;
  const currentWeight = getTotalWeight(entity);
  const capacity = _getCarryCapacity(entity);
  if (currentWeight + addedWeight > capacity) {
    return { ok: false, reason: 'over_capacity' };
  }
  return { ok: true };
}

function add(entity, resourceKey, amount) {
  const check = canAdd(entity, resourceKey, amount);
  if (!check.ok) return check;

  const held = _getHeldMap(entity);
  const current = held[resourceKey] || 0;
  held[resourceKey] = current + amount;
  _setMeta(entity, 'resources', held);
  return { ok: true };
}

function remove(entity, resourceKey, amount) {
  if (!ResourceDefinitions.isValidKey(resourceKey)) {
    return { ok: false, reason: 'unknown_resource' };
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }
  const held = _getHeldMap(entity);
  const current = held[resourceKey] || 0;
  if (current < amount) {
    return { ok: false, reason: 'insufficient' };
  }
  const next = current - amount;
  if (next === 0) {
    delete held[resourceKey];
  } else {
    held[resourceKey] = next;
  }
  _setMeta(entity, 'resources', held);
  return { ok: true };
}

function transfer(from, to, resourceMap) {
  for (const [key, amount] of Object.entries(resourceMap)) {
    if (!ResourceDefinitions.isValidKey(key)) {
      return { ok: false, reason: 'unknown_resource', key };
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return { ok: false, reason: 'invalid_amount', key };
    }
    const fromHeld = _getHeldMap(from);
    if ((fromHeld[key] || 0) < amount) {
      return { ok: false, reason: 'insufficient', key };
    }
  }

  let projectedWeight = getTotalWeight(to);
  const capacity = _getCarryCapacity(to);
  for (const [key, amount] of Object.entries(resourceMap)) {
    projectedWeight += ResourceDefinitions.getWeight(key) * amount;
  }
  if (projectedWeight > capacity) {
    return { ok: false, reason: 'over_capacity' };
  }

  for (const [key, amount] of Object.entries(resourceMap)) {
    remove(from, key, amount);
    const toHeld = _getHeldMap(to);
    toHeld[key] = (toHeld[key] || 0) + amount;
    _setMeta(to, 'resources', toHeld);
  }

  return { ok: true };
}

function steal(thief, victim, resourceKey, amount) {
  if (!ResourceDefinitions.isValidKey(resourceKey)) {
    return { ok: false, reason: 'unknown_resource' };
  }
  return transfer(victim, thief, { [resourceKey]: amount });
}

function getDrops(entity) {
  return { ..._getHeldMap(entity) };
}

function clearAll(entity) {
  _setMeta(entity, 'resources', {});
}

module.exports = {
  getHeld,
  getTotalWeight,
  canAdd,
  add,
  remove,
  transfer,
  steal,
  getDrops,
  clearAll,
  CARRY_MULTIPLIER,
};