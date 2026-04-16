'use strict';
const NOOP = {};

module.exports = {
  hasNoOptions: (_, __, { options } = NOOP) => {
    return !options || !options.length;
  },

  npcHasQuests: (_, __, { npc } = NOOP) => {
    return !!(npc && npc.quests && npc.quests.length);
  },

  isQuestActive: (_, player, { qref } = NOOP) => {
    return player.questTracker.isActive(qref);
  },

  canStartQuest: (state, player, { qref } = NOOP) => {
    return state.QuestFactory.canStart(player, qref);
  },

  isValidQuestIndex: (_, __, { index, count } = NOOP) => {
    return !isNaN(index) && index >= 0 && index <= count;
  },

  isValidActiveQuest: (_, __, { active, index } = NOOP) => {
    return !!(active && active[index]);
  },

  isQuestComplete: (_, __, { quest } = NOOP) => {
    return quest && quest.getProgress().percent >= 100;
  },

  isQuestorPresent: (_, player, { quest } = NOOP) => {
    if (!quest || !quest.config.npc) return true;
    return !![...player.room.npcs].find(npc => npc.entityReference === quest.config.npc);
  },
};
