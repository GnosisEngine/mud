// resources/lib/NpcDeathHandler.js
'use strict';

const ResourceContainer = require('./ResourceContainer');

function _findCorpse(room) {
  for (const item of room.items) {
    if (item.getMeta('isCorpse')) return item;
  }
  return null;
}

function handleKilled(npc, state) {
  const drops = ResourceContainer.getDrops(npc);
  if (!Object.keys(drops).length) return;

  const room = npc.room;

  if (!room) {
    ResourceContainer.clearAll(npc);
    return;
  }

  const corpse = _findCorpse(room);

  if (corpse) {
    const existing = corpse.getMeta('resourceDrops') || {};
    for (const [key, amount] of Object.entries(drops)) {
      existing[key] = (existing[key] || 0) + amount;
    }
    corpse.setMeta('resourceDrops', existing);
  } else {
    room.emit('resource:orphanedDrops', { drops, npc });
  }

  ResourceContainer.clearAll(npc);
}

module.exports = { handleKilled };