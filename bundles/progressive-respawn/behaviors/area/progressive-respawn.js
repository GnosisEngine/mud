'use strict';

/** @typedef {import('../../../../types/state').GameState} GameState */
/** @typedef {import('../../../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../../../types/ranvier').RanvierRoom} RanvierRoom */


const { Logger } = require('ranvier');
const { Random } = require('rando-js');
const {
  isRespawnReady,
  isBelowMaxLoad,
  shouldReplaceOnRespawn,
} = require('../../logic');

module.exports = {
  listeners: {
    /**
     * @param {GameState} state
     */
    updateTick: state => {
      let lastRespawnTick = Date.now();
      return function(config) {
        const respawnInterval = config.interval || 30;
        const sinceLastTick = Date.now() - lastRespawnTick;

        if (isRespawnReady(state, null, { sinceLastTick, respawnInterval })) {
          lastRespawnTick = Date.now();
          for (const [, room] of this.rooms) {
            room.emit('respawnTick', state);
          }
        }
      };
    },

    /**
     * @param {GameState} _
     * @returns {function(string, RanvierRoom): void}
    */
    roomAdded: (_) => function(_, room) {
      room.on('respawnTick', _respawnRoom.bind(room));
    },
  },
};

/**
 * @param {GameState} state
 * @this {RanvierRoom}
 */
function _respawnRoom(state) {
  this.doors = new Map(Object.entries(JSON.parse(JSON.stringify(this.defaultDoors || {}))));

  this.defaultNpcs.forEach(defaultNpc => {
    if (typeof defaultNpc === 'string') {
      defaultNpc = { id: defaultNpc };
    }

    defaultNpc = Object.assign({
      respawnChance: 100,
      maxLoad: 1,
      replaceOnRespawn: false
    }, defaultNpc);

    const npcCount = [...this.spawnedNpcs].filter(npc => npc.entityReference === defaultNpc.id).length;

    if (!isBelowMaxLoad(null, null, { count: npcCount, maxLoad: defaultNpc.maxLoad })) {
      return;
    }

    if (Random.probability(defaultNpc.respawnChance)) {
      try {
        this.spawnNpc(state, defaultNpc.id);
      } catch (err) {
        Logger.error(err.message);
      }
    }
  });

  this.defaultItems.forEach(defaultItem => {
    if (typeof defaultItem === 'string') {
      defaultItem = { id: defaultItem };
    }

    defaultItem = Object.assign({
      respawnChance: 100,
      maxLoad: 1,
      replaceOnRespawn: false
    }, defaultItem);

    const itemCount = [...this.items].filter(item => item.entityReference === defaultItem.id).length;
    const belowMax = isBelowMaxLoad(null, null, { count: itemCount, maxLoad: defaultItem.maxLoad });
    const replace  = shouldReplaceOnRespawn(null, null, { defaultItem });

    if (!belowMax && !replace) {
      return;
    }

    if (Random.probability(defaultItem.respawnChance)) {
      if (replace) {
        this.items.forEach(item => {
          if (item.entityReference === defaultItem.id) {
            state.ItemManager.remove(item);
          }
        });
      }
      this.spawnItem(state, defaultItem.id);
    }
  });
}
