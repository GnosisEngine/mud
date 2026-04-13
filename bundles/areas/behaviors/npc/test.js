'use strict';

const { Logger } = require('ranvier');

module.exports = {
  listeners: {
    spawn: () => function() {
      Logger.log(`${this.name} spawned into room ${this.room.title}`);
    },

    playerEnter: () => function(player) {
      Logger.log(`${this.name} noticed ${player.name} enter room`);
    },

    playerLeave: () => function(target, destination) {
      Logger.log(`${target.name} left ${this.room.title} towards ${destination.title}`);
    },

    playerDropItem: () => function(player, item) {
      Logger.log(`${this.name} noticed ${player.name} dropped ${item.name}`);
    },

    hit: () => function(target, amount) {
      Logger.log(`${this.name} hit ${target.name} for ${amount}`);
    },

    damaged: () => function(amount) {
      Logger.log(`${this.name} damaged ${amount}`);
    },

    npcLeave: () => function(target, destination) {
      Logger.log(`${target.name} left ${this.room.title} towards ${destination.title}`);
    },

    npcEnter: () => function(target) {
      Logger.log(`${target.name} entered same room as ${this.name}`);
    },
  }
};
