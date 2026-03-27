// resources/lib/ResourceVisibility.js
'use strict';

const ResourceDefinitions = require('./ResourceDefinitions');

function canSeeNode(player, node) {
  const resourceMeta = node.getMeta('resource');
  if (!resourceMeta) return true;

  const resourceKey = resourceMeta.resourceKey;
  if (!resourceKey) return true;

  const requirements = ResourceDefinitions.getRequirements(resourceKey);
  if (!requirements) return true;

  const { skills = [], effects = [] } = requirements;

  for (const skill of skills) {
    if (!player.skills || !player.skills.has(skill)) return false;
  }

  for (const effect of effects) {
    if (!player.effects || !player.effects.hasEffect(effect)) return false;
  }

  return true;
}

function filterVisibleNodes(player, roomItems) {
  return roomItems.filter(item => canSeeNode(player, item));
}

module.exports = {
  canSeeNode,
  filterVisibleNodes,
};