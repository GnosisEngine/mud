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
 * @typedef {import('./ranvier').RanvierAccount}  RanvierAccount
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
 * @property {Map<string, RanvierPlayer>} players
 * @property {object}                     events
 * @property {object|null}                loader
 *
 * @property {function(object): void}                                           setLoader
 * @property {function(string): RanvierPlayer|undefined}                        getPlayer
 * @property {function(RanvierPlayer): void}                                    addPlayer
 * @property {function(RanvierPlayer, boolean=): void}                          removePlayer
 * @property {function(): RanvierPlayer[]}                                      getPlayersAsArray
 * @property {function(string, Function): void}                                 addListener
 * @property {function(function(RanvierPlayer): boolean): RanvierPlayer[]}      filter
 * @property {function(GameState, RanvierAccount, string, boolean=): Promise<RanvierPlayer>} loadPlayer
 * @property {function(RanvierPlayer): string}                                  keyify
 * @property {function(string): boolean}                                        exists
 * @property {function(RanvierPlayer): Promise<void>}                           save
 * @property {function(): Promise<void>}                                        saveAll
 * @property {function(): void}                                                 tickAll
 * @property {function(): RanvierPlayer[]}                                      getBroadcastTargets
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
 * @typedef {object} MercRegistryEntry
 * @property {string}            contractId
 * @property {string}            mercRef
 * @property {string}            mercName
 * @property {string}            homeRoomId
 * @property {string}            holderId
 * @property {string}            targetRoomId
 * @property {number}            nextUpkeepAt
 * @property {number}            expiresAt
 * @property {number}            upkeepCost
 * @property {string}            upkeepCurrency
 * @property {'EN_ROUTE'|'STATIONED'|'RETURNING'|'FLEEING'} status
 * @property {import('./ranvier').RanvierNpc|null}  npcInstance
 * @property {import('./ranvier').RanvierItem|null} contractItem
 * @property {import('./ranvier').RanvierRoom[]}    path
 * @property {number}            pathIndex
 * @property {number}            lastMoveAt
 * @property {number}            lastClaimCheckAt
 */

/**
 * @typedef {object} MercenaryService
 * @property {function(string): number}                                          getActiveMercCount
 * @property {function(string): Set<string>}                                     getCoveredRoomIds
 * @property {function(string): MercRegistryEntry[]}                             getContractsByPlayer
 * @property {function(string, GameState): import('./ranvier').RanvierPlayer|null} findHolderForContract
 * @property {function(string, GameState): void}                                 beginFleeing
 * @property {function(import('./ranvier').RanvierPlayer, import('./ranvier').RanvierNpc, GameState): void} hire
 * @property {function(string, GameState): void}                                 dismiss
 * @property {function(import('./ranvier').RanvierNpc, GameState): void}         handleMercDeath
 * @property {function(GameState): void}                                         tick
 * @property {function(GameState): Promise<void>}                                boot
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
 * @property {MercenaryService}  MercenaryService
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
