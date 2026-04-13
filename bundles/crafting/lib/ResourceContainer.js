// resources/lib/ResourceContainer.js
'use strict';

const { CARRY_MULTIPLIER } = require('../constants');
const ResourceDefinitions = require('./ResourceDefinitions');

function _getHeldMap(entity) {
  return entity.getMeta('resources') || {};
}

function _getCarryCapacity(entity) {
  return (entity.getAttribute('strength') || 0) * CARRY_MULTIPLIER;
}

function getAmount(entity, key) {
  const held = _getHeldMap(entity);
  const val = held[key];
  if (val === undefined || val === null) return 0;
  if (Array.isArray(val)) return val.length;
  return val;
}

function getHeld(entity) {
  const held = _getHeldMap(entity);
  const copy = {};
  for (const [key, val] of Object.entries(held)) {
    copy[key] = Array.isArray(val) ? val.slice() : val;
  }
  return copy;
}

function getTotalWeight(entity) {
  const held = _getHeldMap(entity);
  let total = 0;
  for (const key of Object.keys(held)) {
    const w = ResourceDefinitions.getWeight(key);
    if (w !== null) {
      total += w * getAmount(entity, key);
    }
  }
  return total;
}

function canAdd(entity, key, amount) {
  if (!ResourceDefinitions.isValidKey(key)) {
    return { ok: false, reason: 'unknown_resource' };
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }
  const addedWeight = ResourceDefinitions.getWeight(key) * amount;
  const currentWeight = getTotalWeight(entity);
  const capacity = _getCarryCapacity(entity);
  if (currentWeight + addedWeight > capacity) {
    return { ok: false, reason: 'over_capacity' };
  }
  return { ok: true };
}

function add(entity, key, amount, expiryTick) {
  const check = canAdd(entity, key, amount);
  if (!check.ok) return check;

  const held = _getHeldMap(entity);

  if (ResourceDefinitions.isPerishable(key)) {
    if (expiryTick === undefined || expiryTick === null) {
      return { ok: false, reason: 'missing_expiry' };
    }
    const existing = Array.isArray(held[key]) ? held[key] : [];
    for (let i = 0; i < amount; i++) existing.push(expiryTick);
    held[key] = existing;
  } else {
    held[key] = (held[key] || 0) + amount;
  }

  entity.setMeta('resources', held);
  return { ok: true };
}

function remove(entity, key, amount) {
  if (!ResourceDefinitions.isValidKey(key)) {
    return { ok: false, reason: 'unknown_resource' };
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }
  const current = getAmount(entity, key);
  if (current < amount) {
    return { ok: false, reason: 'insufficient' };
  }

  const held = _getHeldMap(entity);

  if (ResourceDefinitions.isPerishable(key)) {
    const sorted = held[key].slice().sort((a, b) => a - b);
    sorted.splice(0, amount);
    if (sorted.length === 0) {
      delete held[key];
    } else {
      held[key] = sorted;
    }
  } else {
    const next = held[key] - amount;
    if (next === 0) {
      delete held[key];
    } else {
      held[key] = next;
    }
  }

  entity.setMeta('resources', held);
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
    if (getAmount(from, key) < amount) {
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

  const fromHeld = _getHeldMap(from);
  const toHeld = _getHeldMap(to);

  for (const [key, amount] of Object.entries(resourceMap)) {
    if (ResourceDefinitions.isPerishable(key)) {
      const sorted = fromHeld[key].slice().sort((a, b) => a - b);
      const moving = sorted.splice(0, amount);
      if (sorted.length === 0) {
        delete fromHeld[key];
      } else {
        fromHeld[key] = sorted;
      }
      const dest = Array.isArray(toHeld[key]) ? toHeld[key] : [];
      for (const tick of moving) dest.push(tick);
      toHeld[key] = dest;
    } else {
      fromHeld[key] -= amount;
      if (fromHeld[key] === 0) delete fromHeld[key];
      toHeld[key] = (toHeld[key] || 0) + amount;
    }
  }

  from.setMeta('resources', fromHeld);
  to.setMeta('resources', toHeld);
  return { ok: true };
}

function steal(thief, victim, key, amount) {
  if (!ResourceDefinitions.isValidKey(key)) {
    return { ok: false, reason: 'unknown_resource' };
  }
  return transfer(victim, thief, { [key]: amount });
}

function getDrops(entity) {
  const held = _getHeldMap(entity);
  const drops = {};
  for (const key of Object.keys(held)) {
    drops[key] = getAmount(entity, key);
  }
  return drops;
}

function isDirty(entity) {
  const held = _getHeldMap(entity);
  for (const key of Object.keys(held)) {
    if (ResourceDefinitions.isPerishable(key)) {
      const val = held[key];
      if (Array.isArray(val) && val.length > 0) return true;
    }
  }
  return false;
}

function processRot(entity, currentTick) {
  const held = _getHeldMap(entity);
  const rotted = {};
  let changed = false;

  for (const key of Object.keys(held)) {
    if (!ResourceDefinitions.isPerishable(key)) continue;
    const arr = held[key];
    if (!Array.isArray(arr) || arr.length === 0) continue;

    const surviving = arr.filter(tick => tick > currentTick);
    const expiredCount = arr.length - surviving.length;

    if (expiredCount > 0) {
      if (surviving.length === 0) {
        delete held[key];
      } else {
        held[key] = surviving;
      }
      rotted[key] = expiredCount;
      changed = true;
    }
  }

  if (changed) entity.setMeta('resources', held);
  return { rotted };
}

function clearAll(entity) {
  entity.setMeta('resources', {});
}

module.exports = {
  getAmount,
  getHeld,
  getTotalWeight,
  canAdd,
  add,
  remove,
  transfer,
  steal,
  getDrops,
  clearAll,
  isDirty,
  processRot,
  CARRY_MULTIPLIER,
};
