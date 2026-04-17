'use strict';

/**
 * @typedef {import('./ranvier').RanvierArea}    RanvierArea
 * @typedef {import('./ranvier').RanvierRoom}    RanvierRoom
 * @typedef {import('./ranvier').RanvierPlayer}  RanvierPlayer
 * @typedef {import('./ranvier').RanvierNpc}     RanvierNpc
 * @typedef {import('./ranvier').RanvierItem}    RanvierItem
 * @typedef {import('./ranvier').RanvierQuest}   RanvierQuest
 * @typedef {import('./ranvier').RanvierLogger}  RanvierLogger
 * @typedef {import('./ranvier').RanvierCommand}  RanvierCommand
 * @typedef {import('../bundles/time/types').TimeService}        TimeService
 * @typedef {import('../bundles/factions/types').FactionService} FactionService
 * @typedef {import('../bundles/world/types').WorldManager}      WorldManager
 * @typedef {import('../bundles/fancy-rooms/lib/Targeter').TargetEntity} TargetEntity
 * @typedef {import('../bundles/claims/lib/store').Store}            Store
 */

/**
 * @typedef {object} BehaviorManager
 * @property {function(string, object): void}     addBehavior
 * @property {function(string): object|undefined} getBehavior
 */

/**
 * @typedef {object} AreaManager
 * @property {function(string): RanvierArea|undefined}        getArea
 * @property {function(): Map<string, RanvierArea>}           getAreas
 */

/**
 * @typedef {object} RoomManager
 * @property {function(string): RanvierRoom|undefined}        getRoom
 */

/**
 * @typedef {object} PlayerManager
 * @property {function(string): RanvierPlayer|undefined}         getPlayer
 * @property {function(): Set<RanvierPlayer>}                    getPlayersAsSet
 * @property {function(): void}                    saveAll
 * @property {function(function(RanvierPlayer): boolean): RanvierPlayer[]} filter
 * @property {Map<string, RanvierPlayer>}                        players
 */

/**
 * @typedef {object} MobFactory
 * @property {function(string, RanvierArea): RanvierNpc}      create
 */

/**
 * @typedef {object} ItemFactory
 * @property {function(string, RanvierArea): RanvierItem}     create
 */

/**
 * @typedef {object} QuestFactory
 * @property {function(string, RanvierPlayer): RanvierQuest}  create
 * @property {function(string): boolean}                      has
 */

/**
 * @typedef {object} StorageManager
 * @property {Store} store
 */

/**
 * @typedef {object} AbilityManager
 * @property {function(string): object|undefined} get
 * @property {function(string): object|undefined} find
 * @property {function(object): void}             add
 * @property {function(string): void}             remove
 */

/**
 * @typedef {object} BundleManager
 * @property {function(string, string, string): RanvierCommand} createCommand
 */

/**
 * @typedef {object} GameState
 * @property {AreaManager}       AreaManager
 * @property {RoomManager}       RoomManager
 * @property {PlayerManager}     PlayerManager
 * @property {BehaviorManager}   ItemBehaviorManager
 * @property {BehaviorManager}   NpcBehaviorManager
 * @property {BehaviorManager}   RoomBehaviorManager
 * @property {BehaviorManager}   AreaBehaviorManager
 * @property {MobFactory}        MobFactory
 * @property {ItemFactory}       ItemFactory
 * @property {QuestFactory}      QuestFactory
 * @property {object}            ChannelManager
 * @property {object}            CommandManager
 * @property {object}            EffectFactory
 * @property {AbilityManager}    SkillManager
 * @property {AbilityManager}    SpellManager
 * @property {object}            AccountManager
 * @property {object}            HelpManager
 * @property {object}            EventManager
 * @property {object}            InputEventManager
 * @property {object}            ItemManager
 * @property {object}            MobManager
 * @property {object}            GameServer
 * @property {BundleManager}     BundleManager
 * @property {RanvierLogger}     Logger
 * @property {TimeService}       TimeService
 * @property {FactionService}    FactionService
 * @property {WorldManager}      WorldManager
 * @property {StorageManager}    StorageManager
  * @property {{ get: function(string): any }} Config
 * @property {function(): void}  _timeBundleStop
 * @property {function(RanvierPlayer, string, string[]=, RanvierRoom=): TargetEntity|null} getTarget
 */

module.exports = {};
