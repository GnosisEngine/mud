// resources/lib/SpawnLoop.js
'use strict';

const SpawnTable = require('./SpawnTable');
const TerrainResolver = require('./TerrainResolver');
const { ItemType } = require('ranvier');

const SPAWNABLE_ZONE_TYPES = new Set(['SUPPLY', 'WILDERNESS']);
const RESOURCE_ITEM_TYPE = ItemType.RESOURCE;
const RESOURCES_AREA_NAME = 'craft';

function _countResourceNodesInRoom(room, resourceKey) {
  let count = 0;
  for (const item of room.items) {
    if (item.type !== RESOURCE_ITEM_TYPE) continue;
    const meta = item.getMeta('resource');
    if (meta && meta.resourceKey === resourceKey) count++;
  }
  return count;
}

function _spawnIntoRoom(state, room) {
  const terrain = TerrainResolver.getTerrain(room);
  const draw = SpawnTable.drawSpawn(terrain);
  if (!draw) return;

  const { resourceKey } = draw;
  const maxDensity = SpawnTable.getMaxDensityForResource(terrain, resourceKey);
  const existing = _countResourceNodesInRoom(room, resourceKey);
  if (existing >= maxDensity) return;

  const area = state.AreaManager.getArea(RESOURCES_AREA_NAME);
  if (!area) return;

  const itemRef = `${RESOURCES_AREA_NAME}:${resourceKey}`;
  let item;
  try {
    item = state.ItemFactory.create(area, itemRef);
  } catch (_) {
    return;
  }

  if (!item) return;
  item.hydrate(state);
  room.addItem(item);
  state.ItemManager.add(item);
}

function tick(state) {
  for (const [, area] of state.AreaManager.areas) {
    const zoneType = area.metadata && area.metadata.zoneType;
    if (!SPAWNABLE_ZONE_TYPES.has(zoneType)) continue;
    for (const [, room] of area.rooms) {
      _spawnIntoRoom(state, room);
    }
  }
}

module.exports = {
  tick,
  SPAWNABLE_ZONE_TYPES,
  RESOURCES_AREA_NAME,
};
