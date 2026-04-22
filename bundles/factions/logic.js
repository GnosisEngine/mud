'use strict';

/** @typedef {import('types').RanvierPlayer} RanvierPlayer */

const { BRACKET_LABELS } = require('./constants');
const NOOP = /** @type {any} */ ({});

const AXES = ['affinity', 'honor', 'trust', 'debt'];
const DEFAULT_AXIS                 = 'affinity';
const DEFAULT_MIN_LABEL            = 'neutral';
const DEFAULT_ACCEPTABLE_RELATIONS = ['cold', 'neutral'];

function _bracketMeetsMinimum(brackets, axis, minLabel) {
  const order  = BRACKET_LABELS[axis];
  const current = brackets[axis];
  return order.indexOf(current) >= order.indexOf(minLabel);
}

module.exports = {
  /** @type {import('types').LogicCheck<{ before: any, after: any }>} */
  hasFactionStanceChanged: (_, __, { before, after } = NOOP) => {
    if (!before || !after) return false;
    return !AXES.every(axis => before[axis] === after[axis]);
  },

  /** @type {import('types').LogicCheck<{ room: any }>} */
  roomHasFaction: (_, __, { room } = NOOP) => {
    return !!(room && room.faction !== undefined);
  },

  /** @type {import('types').LogicCheck<{ renown: any, factionDef: any }>} */
  isStranger: (_, __, { renown, factionDef } = NOOP) => {
    return renown < factionDef.renownThreshold;
  },

  /**
   * Checks whether two entities (player or NPC) are on acceptable faction terms.
   *
   * player + npc / npc + player:
   *   Resolves the player's stance with the NPC's faction and checks that the
   *   bracket for `axis` is at or above `minLabel` in the ordered label list.
   *
   * npc + npc:
   *   Looks up the faction-to-faction relation string and checks it is in
   *   `acceptableRelations`.
   *
   * player + player:
   *   Returns null — undefined behavior in this system.
   */
  /**
   * @type {import('types').LogicCheck<{target: RanvierPlayer, axis?: 'affinity' | 'honor' | 'trust' | 'debt', minLabel?, string, acceptableRelations?: string[] }>}
   */
  async areFactionsCompatible(state, source, {
    target,
    axis               = DEFAULT_AXIS,
    minLabel           = DEFAULT_MIN_LABEL,
    acceptableRelations = DEFAULT_ACCEPTABLE_RELATIONS,
  } = NOOP) {
    const aIsNpc = !!(source && source.isNpc);
    const bIsNpc = !!(target && target.isNpc);

    // player + player — undefined in this system
    if (!aIsNpc && !bIsNpc) return null;

    // npc + npc — check faction relation string
    if (aIsNpc && bIsNpc) {
      const factionIdA = source.getMeta('faction');
      const factionIdB = target.getMeta('faction');
      if (factionIdA === null || factionIdA === undefined) return null;
      if (factionIdB === null || factionIdB === undefined) return null;
      if (factionIdA === factionIdB) return true;
      const relation = state.FactionManager.getFactionRelation(factionIdA, factionIdB);
      if (!relation) return true; // no configured relation — assume peaceful
      return acceptableRelations.includes(relation);
    }

    // mixed — resolve the player's stance with the NPC's faction
    const player = aIsNpc ? target : source;
    const npc    = aIsNpc ? source : target;

    const factionId = npc.getMeta('faction');
    if (factionId === null || factionId === undefined) return null;

    const stance = await state.FactionManager.getStance(player.name, factionId);
    if (!stance) return null;

    return _bracketMeetsMinimum(stance.brackets, axis, minLabel);
  },
};
