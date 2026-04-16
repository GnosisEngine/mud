'use strict';

const { Broadcast: B, Logger } = require('ranvier');
const {
  isInCombat,
  hasAggroTarget,
  isTargetInRoom,
  isAttackReady,
  isWarnReady,
  hasWarned,
  hasPlayersInRoom,
  isAggroTowardsNpc,
} = require('../../logic');

module.exports = {
  listeners: {
    updateTick: () => function(config) {
      if (!this.room) {
        return;
      }

      if (typeof config !== 'object') {
        config = {};
      }

      config = Object.assign({
        delay: 5,
        warnMessage: '%name% growls, warning you away.',
        attackMessage: '%name% attacks you!',
        towards: {
          players: true,
          npcs: false
        }
      }, config);

      if (isInCombat(null, this)) {
        return;
      }

      if (hasAggroTarget(null, this)) {
        if (!isTargetInRoom(null, this, { target: this._aggroTarget })) {
          this._aggroTarget = null;
          this._aggroWarned = false;
          return;
        }

        const sinceLastCheck = Date.now() - this._aggroTimer;
        const delayLength = config.delay * 1000;

        if (isAttackReady(null, this, { sinceLastCheck, delayLength })) {
          if (!this._aggroTarget.isNpc) {
            B.sayAt(this._aggroTarget, config.attackMessage.replace(/%name%/, this.name));
          } else {
            Logger.verbose(`NPC [${this.uuid}/${this.entityReference}] attacks NPC [${this._aggroTarget.uuid}/${this._aggroTarget.entityReference}] in room ${this.room.entityReference}.`);
          }
          this.initiateCombat(this._aggroTarget);
          this._aggroTarget = null;
          this._aggroWarned = false;
          return;
        }

        if (isWarnReady(null, this, { sinceLastCheck, delayLength }) && !this._aggroTarget.isNpc && !hasWarned(null, this)) {
          B.sayAt(this._aggroTarget, config.warnMessage.replace(/%name%/, this.name));
          this._aggroWarned = true;
        }

        return;
      }

      if (config.towards.players && hasPlayersInRoom(null, this)) {
        this._aggroTarget = [...this.room.players][0];
        this._aggroTimer = Date.now();
        return;
      }

      if (config.towards.npcs && this.room.npcs.size) {
        for (const npc of this.room.npcs) {
          if (npc === this) {
            continue;
          }

          if (isAggroTowardsNpc(null, this, { config, targetNpc: npc })) {
            this._aggroTarget = npc;
            this._aggroTimer = Date.now();
            return;
          }
        }
      }
    }
  }
};
