'use strict';

const { QuestGoal } = require('ranvier');
const { EVENTS } = require('../events');

/**
 * A quest goal requiring the player equip something to a particular slot
 */
module.exports = class EquipGoal extends QuestGoal {
  constructor(quest, config, player) {
    config = Object.assign({
      title: 'Equip Item',
      slot: null,
    }, config);

    super(quest, config, player);

    this.state = {
      equipped: false
    };

    this.on('equip', this._equipItem);
    this.on('unequip', this._unequipItem);
  }

  getProgress() {
    const percent = this.state.equipped ? 100 : 0;
    const display = `${this.config.title}: ` + (!this.state.equipped ? 'Not ' : '') + 'Equipped';
    return { percent, display };
  }

  _equipItem(slot) {
    if (slot !== this.config.slot) {
      return;
    }

    this.state.equipped = true;
    this.emit(EVENTS.GOAL_PROGRESS, this.getProgress());
  }

  _unequipItem(slot) {
    if (slot !== this.config.slot) {
      return;
    }

    this.state.equipped = false;
    this.emit(EVENTS.GOAL_PROGRESS, this.getProgress());
  }
};
