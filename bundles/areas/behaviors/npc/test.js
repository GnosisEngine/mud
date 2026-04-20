'use strict';

/** @typedef {import('../../../../types/ranvier').RanvierPlayer} RanvierPlayer */
/** @typedef {import('../../../../types/ranvier').RanvierNpc} RanvierNpc */
/** @typedef {import('../../../../types/ranvier').RanvierCharacter} RanvierCharacter */

const { Logger } = require('ranvier');

module.exports = {
  listeners: {

    spawn: () => /** @this {RanvierPlayer} */ function() {
      Logger.log(`${this.name} spawned into room ${this.room?.title}`);
    },

    playerEnter: () => /** @this {RanvierPlayer} */ function(player) {
      Logger.log(`${this.name} noticed ${player.name} enter room`);
    },

    playerLeave: () => /** @this {RanvierPlayer} */ function(target, destination) {
      Logger.log(`${target.name} left ${this.room?.title} towards ${destination.title}`);
    },

    playerDropItem: () => /** @this {RanvierPlayer} */ function(player, item) {
      Logger.log(`${this.name} noticed ${player.name} dropped ${item.name}`);
    },

    hit: () => /** @this {RanvierCharacter} */ function(target, amount) {
      Logger.log(`${this.name} hit ${target.name} for ${amount}`);
    },

    damaged: () => /** @this {RanvierCharacter} */ function(amount) {
      Logger.log(`${this.name} damaged ${amount}`);
    },

    npcLeave: () => /** @this {RanvierNpc} */ function(target, destination) {
      Logger.log(`${target.name} left ${this.room?.title} towards ${destination.title}`);
    },

    npcEnter: () => /** @this {RanvierNpc} */ function(target) {
      Logger.log(`${target.name} entered same room as ${this.name}`);
    },
  }
};
