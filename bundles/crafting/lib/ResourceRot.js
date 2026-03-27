// resources/lib/ResourceRot.js
'use strict';

const ResourceContainer = require('./ResourceContainer');

function addRotEntry(entity, resourceKey, amount, expiresAt) {
  if (expiresAt === null || expiresAt === undefined) return;
  if (typeof amount !== 'number' || amount <= 0) return;

  const entries = entity.getMeta('resourceRot') || [];
  entries.push({ key: resourceKey, amount, expiresAt });
  entity.setMeta('resourceRot', entries);
}

function getRotEntries(entity) {
  const entries = entity.getMeta('resourceRot') || [];
  return entries.map(e => ({ ...e }));
}

function processEntity(entity, currentTick) {
  const entries = entity.getMeta('resourceRot') || [];
  const rotted = {};
  const surviving = [];

  for (const entry of entries) {
    if (entry.expiresAt <= currentTick) {
      const held = ResourceContainer.getHeld(entity);
      const available = held[entry.key] || 0;
      const toRot = Math.min(entry.amount, available);
      if (toRot > 0) {
        ResourceContainer.remove(entity, entry.key, toRot);
        rotted[entry.key] = (rotted[entry.key] || 0) + toRot;
      }
    } else {
      surviving.push(entry);
    }
  }

  entity.setMeta('resourceRot', surviving);
  return { rotted };
}

module.exports = { addRotEntry, getRotEntries, processEntity };