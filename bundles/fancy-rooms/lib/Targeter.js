'use strict'

function fuzzyMatch(texts, q) {
  if (!texts || !q) return 0;

  if (!Array.isArray(texts)) texts = [texts];

  const strings = texts.filter(Boolean);
  if (!strings.length) return 0;

  const query = q.toLowerCase();

  return Math.max(...strings.map(text => {
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
    const score = (completionRatio * 0.7 + consecutiveBonus * 0.3) * 100;

    return Math.round(score);
  }));
}

function getTarget(room, rawQuery, targets = []) {
  const query = rawQuery.toLowerCase();
  const normalizedTargets = targets.map(t => t.toLowerCase());

  const findExits = normalizedTargets.length === 0 || normalizedTargets.includes('exit') || normalizedTargets.includes('exits');
  const findItems = normalizedTargets.length === 0 || normalizedTargets.includes('item') || normalizedTargets.includes('items');
  const findPlayers = normalizedTargets.length === 0 || normalizedTargets.includes('player') || normalizedTargets.includes('players');
  const findNpcs = normalizedTargets.length === 0 || normalizedTargets.includes('npc') || normalizedTargets.includes('npcs');

  const potentialTargets = [
    ...(findExits
      ? room.exits.map(entity => ({
          entity,
          score: fuzzyMatch([entity.direction, ...(entity.keywords || [])], query)
        }))
      : []
    ),

    ...(findItems
      ? [...room.items].map(entity => ({
          entity,
          score: fuzzyMatch([entity.name, entity.description, entity.roomDesc, ...(entity.keywords || [])], query)
        }))
      : []
    ),

    ...(findPlayers
      ? [...room.players].map(entity => ({
          entity,
          score: fuzzyMatch([entity.name, ...(entity.keywords || [])], query)
        }))
      : []
    ),

    ...(findNpcs
      ? [...room.npcs].map(entity => ({
          entity,
          score: fuzzyMatch([entity.name, entity.description, ...(entity.keywords || [])], query)
        }))
      : []
    ),
  ];

  const result = potentialTargets.sort((a, b) => b.score - a.score)[0];

  return result?.score > 0 ? result.entity : null;
}

module.exports = { fuzzyMatch, getTarget };