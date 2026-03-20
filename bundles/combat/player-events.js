'use strict';

// Set to true to show the numeric health bar in the combat prompt.
// In production this is off — the pip row and bar fills carry the information.
const DEBUG = false;

const { Config, Broadcast: B } = require('ranvier');
const Combat = require('./lib/Combat');
const CombatErrors = require('./lib/CombatErrors');
const LevelUtil = require('../lib/lib/LevelUtil');
const WebsocketStream = require('../websocket-networking/lib/WebsocketStream');

const {
  buildHitMessage,
  buildDamagedMessage,
  buildHealedMessage,
  buildHealMessage,
  buildStatusFlavor,
  buildTargetExhaustionFlavor,
  buildKillMessage,
  buildDeathMessage,
} = require('./lib/CombatNarrativeBuilders');

const ArcTracker = require('./lib/ArcTracker');

/**
 * Auto combat module — narrative edition.
 *
 * All number output has been replaced with descriptive text.
 * Wiring contract:
 *   - Builders return strings. Listeners display them via B.sayAt().
 *   - ArcTracker.update() is called once per tick after damage is applied.
 *   - Status flavor is throttled inside the builders — listeners don't gate it.
 */
module.exports = {
  listeners: {

    // -----------------------------------------------------------------------
    // updateTick
    // Drives the combat loop, injects arc language and status flavor.
    // -----------------------------------------------------------------------
    updateTick: state => function () {
      Combat.startRegeneration(state, this);

      let hadActions = false;
      try {
        hadActions = Combat.updateRound(state, this);
      } catch (e) {
        if (e instanceof CombatErrors.CombatInvalidTargetError) {
          B.sayAt(this, "You can't attack that target.");
        } else {
          throw e;
        }
      }

      if (!hadActions) {
        return;
      }

      const usingWebsockets = this.socket instanceof WebsocketStream;

      const firstCombatant = [...this.combatants][0];
      let arcFired = false;
      if (firstCombatant) {
        const arcLine = ArcTracker.update(firstCombatant, this);
        if (arcLine) {
          B.sayAt(this, arcLine);
          arcFired = true;
        }
      }

      // Status flavor — throttled, only fires every 4–6 rounds.
      // Suppressed when an arc transition already fired this tick to avoid
      // two meta-commentary lines appearing in the same prompt block.
      if (!arcFired) {
        const selfFlavor = buildStatusFlavor(this);
        if (selfFlavor) {
          B.sayAt(this, selfFlavor);
        }

        if (firstCombatant) {
          const targetFlavor = buildTargetExhaustionFlavor(this, firstCombatant);
          if (targetFlavor) {
            B.sayAt(this, targetFlavor);
          }
        }
      }

      // Combat prompt (health bars).
      if (!usingWebsockets) {
        if (DEBUG && !this.hasPrompt('combat')) {
          this.addPrompt('combat', _ => promptBuilder(this));
        }
        B.prompt(this);
        B.sayAt(this, '');
      }
    },

    // -----------------------------------------------------------------------
    // hit
    // You struck a target. Build attacker-pov message.
    // -----------------------------------------------------------------------
    hit: state => function (damage, target, finalAmount) {
      if (damage.metadata.hidden) {
        return;
      }

      const msg = buildHitMessage(this, target, damage, finalAmount);
      B.sayAt(this, msg);

      // Propagate weapon hit event (enchantments etc. may listen on this).
      if (this.equipment.has('wield')) {
        this.equipment.get('wield').emit('hit', damage, target, finalAmount);
      }

      // Show to party members in the same room.
      if (!this.party) {
        return;
      }

      for (const member of this.party) {
        if (member === this || member.room !== this.room) {
          continue;
        }

        // Party members see a third-person version — reuse attacker-pov
        // builder but the member is the observer. We let the template
        // resolve naturally since party members aren't the attacker or target;
        // a simple prefix carries the attribution.
        B.sayAt(member, `${this.name}: ${msg}`);
      }
    },

    // -----------------------------------------------------------------------
    // heal
    // You healed a target. Build healer-pov message.
    // -----------------------------------------------------------------------
    heal: state => function (heal, target, finalAmount) {
      if (heal.metadata.hidden) {
        return;
      }

      // Only emit if healing someone other than yourself —
      // 'healed' covers the self-recipient message.
      if (target === this) {
        return;
      }

      const msg = buildHealMessage(this, target, heal, finalAmount);
      B.sayAt(this, msg);

      // Show to party members.
      if (!this.party) {
        return;
      }

      for (const member of this.party) {
        if (member === this || member.room !== this.room) {
          continue;
        }
        B.sayAt(member, `${this.name}: ${msg}`);
      }
    },

    // -----------------------------------------------------------------------
    // damaged
    // You were struck. Build target-pov message and check for death.
    // -----------------------------------------------------------------------
    damaged: state => function (damage, finalAmount) {
      if (damage.metadata.hidden || damage.attribute !== 'health') {
        return;
      }

      const msg = buildDamagedMessage(damage.attacker, this, damage, finalAmount);
      B.sayAt(this, msg);

      // Show to party members in the same room.
      if (this.party) {
        for (const member of this.party) {
          if (member === this || member.room !== this.room) {
            continue;
          }
          B.sayAt(member, `${this.name}: ${msg}`);
        }
      }

      if (this.getAttribute('health') <= 0) {
        Combat.handleDeath(state, this, damage.attacker);
      }
    },

    // -----------------------------------------------------------------------
    // healed
    // You received a heal. Build target-pov message.
    // -----------------------------------------------------------------------
    healed: state => function (heal, finalAmount) {
      if (heal.metadata.hidden) {
        return;
      }

      const msg = buildHealedMessage(this, heal, finalAmount);
      B.sayAt(this, msg);

      // Show health heals to party members.
      if (!this.party || heal.attribute !== 'health') {
        return;
      }

      for (const member of this.party) {
        if (member === this || member.room !== this.room) {
          continue;
        }
        B.sayAt(member, `${this.name} ${msg}`);
      }
    },

    // -----------------------------------------------------------------------
    // killed
    // You were killed. Respawn, strip experience, move to home room.
    // -----------------------------------------------------------------------
    killed: state => {
      const startingRoomRef = Config.get('startingRoom');
      if (!startingRoomRef) {
        Logger.error('No startingRoom defined in ranvier.json');
      }

      return function (killer) {
        this.removePrompt('combat');
        ArcTracker.reset(this);

        // Room sees a third-person death message.
        const othersDeathMessage = killer
          ? `<b><red>${this.name} collapses to the ground, dead at the hands of ${killer.name}.</red></b>`
          : `<b><red>${this.name} collapses to the ground, dead.</red></b>`;

        B.sayAtExcept(this.room, othersDeathMessage, (killer ? [killer, this] : this));

        if (this.party) {
          B.sayAt(this.party, `<b><green>${this.name} was killed!</green></b>`);
        }

        this.setAttributeToMax('health');

        let home = state.RoomManager.getRoom(this.getMeta('waypoint.home'));
        if (!home) {
          home = state.RoomManager.getRoom(startingRoomRef);
        }

        this.moveTo(home, _ => {
          state.CommandManager.get('look').execute(null, this);

          // Death message (your pov).
          const deathMsg = buildDeathMessage(this, killer);
          B.sayAt(this, deathMsg);

          if (killer && killer !== this) {
            B.sayAt(this, `<red>Killed by ${killer.name}.</red>`);
          }

          // Lose 20% of experience gained this level.
          const lostExp = Math.floor(this.experience * 0.2);
          this.experience -= lostExp;
          this.save();
          B.sayAt(this, `<red>The setback costs you something. You feel diminished.</red>`);

          B.prompt(this);
        });
      };
    },

    // -----------------------------------------------------------------------
    // deathblow
    // You killed a target. Award XP, proxy to party.
    // -----------------------------------------------------------------------
    deathblow: state => function (target, skipParty) {
      const xp = LevelUtil.mobExp(target.level);

      if (this.party && !skipParty) {
        // Proxy to all party members in the same room so each gets
        // quest credit and triggers anything else listening for deathblow.
        for (const member of this.party) {
          if (member.room === this.room) {
            member.emit('deathblow', target, true);
          }
        }
        return;
      }

      if (target && !this.isNpc) {
        const killMsg = buildKillMessage(this, target);
        B.sayAt(this, killMsg);
      }

      this.emit('experience', xp);
    },

  }
};

// ---------------------------------------------------------------------------
// Combat prompt builder
// Unchanged from original — health bars are numbers-free by design since
// they already use visual bar lengths rather than explicit values.
// The bar fills communicate percentage without a number label.
// ---------------------------------------------------------------------------

function promptBuilder(promptee) {
  if (!promptee.isInCombat()) {
    return '';
  }

  if (!DEBUG) {
    return '';
  }

  const playerName       = 'You';
  const targetNameLengths = [...promptee.combatants].map(t => t.name.length);
  const nameWidth         = Math.max(playerName.length, ...targetNameLengths);
  const progWidth         = 60 - (nameWidth + ':  ').length;

  const getHealthPercentage = entity =>
    Math.floor((entity.getAttribute('health') / entity.getMaxAttribute('health')) * 100);

  const formatProgressBar = (name, progress, entity) => {
    const pad = B.line(nameWidth - name.length, ' ');
    // No explicit numbers — the bar length tells the story.
    return `<b>${name}${pad}</b>: ${progress}`;
  };

  let currentPerc = getHealthPercentage(promptee);
  let progress    = B.progress(progWidth, currentPerc, 'green');
  let buf         = formatProgressBar(playerName, progress, promptee);

  for (const target of promptee.combatants) {
    const targetPerc     = Math.floor((target.getAttribute('health') / target.getMaxAttribute('health')) * 100);
    const targetProgress = B.progress(progWidth, targetPerc, 'red');
    buf += `\r\n${formatProgressBar(target.name, targetProgress, target)}`;
  }

  return buf;
}