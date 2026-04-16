'use strict';
/**
 * @typedef {import('../../../types/ranvier').RanvierPlayer} RanvierPlayer
 * @typedef {import('../../../types/ranvier').RanvierRoom}   RanvierRoom
 * @typedef {import('../../../types/ranvier').RanvierNpc}    RanvierNpc
 * @typedef {import('../../../types/ranvier').RanvierItem}   RanvierItem
 */

/**
 * @typedef {object} RanvierExit
 * @property {string}   direction
 * @property {string}   roomId
 * @property {string[]} [keywords]
 */

/**
 * @typedef {RanvierPlayer | RanvierNpc | RanvierItem | RanvierExit} TargetEntity
 */

/**
 * Scores a query string against a primary text and optional secondary texts.
 * Returns 0–100 based on fuzzy character match quality.
 *
 * @param {string}           primaryText
 * @param {string|string[]}  otherTexts
 * @param {string}           q
 * @returns {number}
 */
function fuzzyMatch(primaryText, otherTexts, q) {
  if (!q) return 0;
  if (q === '*') return 100;

  if (!Array.isArray(otherTexts)) otherTexts = otherTexts ? [otherTexts] : [];

  const query = q.toLowerCase();

  function scoreText(text) {
    if (!text) return 0;
    const t = text.toLowerCase();

    let tIndex = 0;
    let qIndex = 0;
    let matchCount = 0;
    let consecutive = 0;
    let maxConsecutive = 0;

    while (tIndex < t.length && qIndex < query.length) {
      if (t[tIndex] === query[qIndex]) {
        matchCount++;
        consecutive++;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
        qIndex++;
      } else {
        consecutive = 0;
      }
      tIndex++;
    }

    const completionRatio = matchCount / query.length;
    const consecutiveBonus = maxConsecutive / query.length;
    return (completionRatio * 0.7 + consecutiveBonus * 0.3) * 100;
  }

  const primaryScore = scoreText(primaryText);

  const secondaryScore = otherTexts.filter(Boolean).length
    ? Math.max(...otherTexts.filter(Boolean).map(scoreText))
    : 0;

  // Primary dominates; secondary can nudge the score up slightly
  const combined = primaryScore * 0.85 + secondaryScore * 0.15;

  return Math.round(combined);
}

/**
 * Resolves a raw query string to the best-matching entity in the room.
 * Searches inventory, exits, items, players, and npcs depending on the
 * targets filter. Returns null if no match scores above zero.
 *
 * @param {RanvierPlayer}  player
 * @param {string}         rawQuery
 * @param {string[]}       [targets=[]]   - filter by category: 'item', 'npc', 'player', 'exit', 'inventory'
 * @param {RanvierRoom}    [room]         - defaults to player.room
 * @returns {TargetEntity|null}
 */
function getTarget(player, rawQuery, targets = [], room = player.room) {
  const query = rawQuery.toLowerCase();
  const normalizedTargets = targets.map(t => t.toLowerCase());
  const hasTargets = normalizedTargets.length === 0;

  const findExits = hasTargets || normalizedTargets.includes('exit') || normalizedTargets.includes('exits');
  const findItems = hasTargets || normalizedTargets.includes('item') || normalizedTargets.includes('items');
  const findPlayers = hasTargets || normalizedTargets.includes('player') || normalizedTargets.includes('players');
  const findNpcs = hasTargets || normalizedTargets.includes('npc') || normalizedTargets.includes('npcs');
  // const findResources = hasTargets || normalizedTargets.includes('resources');
  const findInventory = hasTargets || normalizedTargets.includes('inventory');

  const exits = findExits && room.getExits ? room.getExits() : [];

  const potentialTargets = [
    ...(findInventory
      ? [...player.inventory].map(([_,entity]) => ({
        entity,
        score: fuzzyMatch(entity.roomDesc, [entity.description, entity.name, ...(entity.keywords || [])], query)
      }))
      : []
    ),

    ...(findExits
      ? exits.map(entity => ({
        entity,
        score: fuzzyMatch(entity.direction, [...(entity.keywords || [])], query)
      }))
      : []
    ),

    ...(findItems
      ? [...room.items].map(entity => ({
        entity,
        score: fuzzyMatch(entity.roomDesc, [entity.description, entity.name, ...(entity.keywords || [])], query)
      }))
      : []
    ),

    ...(findPlayers
      ? [...room.players].map(entity => ({
        entity,
        score: fuzzyMatch(entity.name, [...(entity.keywords || [])], query)
      }))
      : []
    ),

    ...(findNpcs
      ? [...room.npcs].map(entity => ({
        entity,
        score: fuzzyMatch(entity.name, [entity.description, ...(entity.keywords || [])], query)
      }))
      : []
    ),
  ];

  const result = potentialTargets.sort((a, b) => b.score - a.score)[0];

  return result?.score > 0 ? result.entity : null;
}

module.exports = { fuzzyMatch, getTarget };
