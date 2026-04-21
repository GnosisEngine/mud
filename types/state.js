'use strict';

/**
 * @typedef {import('./primitives').RanvierArea}                    RanvierArea
 * @typedef {import('./primitives').RanvierRoom}                    RanvierRoom
 * @typedef {import('./primitives').RanvierPlayer}                  RanvierPlayer
 * @typedef {import('./primitives').RanvierNpc}                     RanvierNpc
 * @typedef {import('./primitives').RanvierItem}                    RanvierItem
 * @typedef {import('./primitives').RanvierQuest}                   RanvierQuest
 * @typedef {import('./primitives').RanvierLogger}                  RanvierLogger
 * @typedef {import('./primitives').RanvierCommand}                 RanvierCommand
 * @typedef {import('./primitives').RanvierAccount}                 RanvierAccount
 * @typedef {import('./primitives').RanvierExit}                    RanvierExit
 * @typedef {import('./primitives').RanvierAttribute}               RanvierAttribute
 * @typedef {import('./primitives').RanvierAttributeFormula}        RanvierAttributeFormula
 * @typedef {import('./primitives').RanvierSkill}                   RanvierSkill
 * @typedef {import('../bundles/time/types').TimeService}        TimeService
 * @typedef {import('../bundles/factions/types').FactionService} FactionService
 * @typedef {import('../bundles/world/types').WorldManager}      WorldManager
 * @typedef {import('../bundles/claims/lib/store').Store}        Store
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
 * @typedef {object} EntityFactory
 * @property {Map<string, Record<string, any>>} entities
 * @property {object}                           scripts
 *
 * @property {function(string, string): string}                                        createEntityRef
 * @property {function(string): Record<string, any>|undefined}                         getDefinition
 * @property {function(string, Record<string, any>): void}                             setDefinition
 * @property {function(string, string, Function): void}                                addScriptListener
 * @property {function(RanvierArea, string, Function): any}                            createByType
 * @property {function(RanvierArea, string): any}                                      create
 * @property {function(RanvierItem|RanvierNpc|RanvierRoom|RanvierArea): any}           clone
 */

/**
 * @typedef {EntityFactory & {
 *   create: function(RanvierArea, string): RanvierNpc
 * }} MobFactory
 */

/**
 * @typedef {object} ItemFactory
 * @property {function(string, RanvierArea): RanvierItem}     create
 */

/**
 * @typedef {object} QuestFactory
 * @property {Map<string, { id: string, area: string, config: Record<string, any> }>} quests
 *
 * @property {function(string, string, RanvierQuest): void}                           add
 * @property {function(string, RanvierQuest): void}                                   set
 * @property {function(string): RanvierQuest|undefined}                               get
 * @property {function(RanvierPlayer, string): boolean}                               canStart
 * @property {function(GameState, string, RanvierPlayer, any[]=): RanvierQuest}       create
 * @property {function(string, string): string}                                       makeQuestKey
 */

/**
 * @typedef {object} StorageManager
 * @property {Store} store
 */

/**
 * @typedef {object} AbilityManager
 * @property {Map<string, RanvierSkill>} skills
 * @property {function(string): RanvierSkill|undefined} get
 * @property {function(RanvierSkill): void} add
 * @property {function(RanvierSkill): void} remove
 * @property {function(string, boolean=): RanvierSkill|undefined} find
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
 * @property {import('./primitives').RanvierNpc|null}  npcInstance
 * @property {import('./primitives').RanvierItem|null} contractItem
 * @property {import('./primitives').RanvierRoom[]}    path
 * @property {number}            pathIndex
 * @property {number}            lastMoveAt
 * @property {number}            lastClaimCheckAt
 */

/**
 * @typedef {object} MercenaryService
 * @property {function(string): number}                                          getActiveMercCount
 * @property {function(string): Set<string>}                                     getCoveredRoomIds
 * @property {function(string): MercRegistryEntry[]}                             getContractsByPlayer
 * @property {function(string, GameState): import('./primitives').RanvierPlayer|null} findHolderForContract
 * @property {function(string, GameState): void}                                 beginFleeing
 * @property {function(import('./primitives').RanvierPlayer, import('./primitives').RanvierNpc, GameState): void} hire
 * @property {function(string, GameState): void}                                 dismiss
 * @property {function(import('./primitives').RanvierNpc, GameState): void}         handleMercDeath
 * @property {function(GameState): void}                                         tick
 * @property {function(GameState): Promise<void>}                                boot
 */

/**
 * @typedef {object} Party
 * @property {Set<RanvierPlayer>} invited
 * @property {RanvierPlayer}      leader
 *
 * @property {function(RanvierPlayer): void}          delete
 * @property {function(RanvierPlayer): void}          add
 * @property {function(): void}                       disband
 * @property {function(RanvierPlayer): void}          invite
 * @property {function(RanvierPlayer): boolean}       isInvited
 * @property {function(RanvierPlayer): void}          removeInvite
 * @property {function(): RanvierPlayer[]}            getBroadcastTargets
 */

/**
 * @typedef {object} PartyManager
 * @property {function(RanvierPlayer): void}    create
 * @property {function(Party): void}     disband
 */

/**
 * @typedef {object} AttributeFactory
 * @property {function(string, number, RanvierAttributeFormula=, object=): void} add
 * @property {function(string): boolean} has
 * @property {function(string): object} get
 * @property {function(string, number=, number=): RanvierAttribute} create
 * @property {function(): void} validateAttributes
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
 * @property {Map}               QuestRewardManager
 * @property {PartyManager}      PartyManager
 * @property {AttributeFactory}  AttributeFactory
 * @property {MercenaryService}  MercenaryService
 * @property {BundleManager}     BundleManager
 * @property {RanvierLogger}     Logger
 * @property {TimeService}       TimeService
 * @property {FactionService}    FactionService
 * @property {WorldManager}      WorldManager
 * @property {StorageManager}    StorageManager
 * @property {boolean}           WorldReady
 * @property {typeof import('../bundles/world/lib/ContextService').ContextService} ContextService
 * @property {{ get: function(string): any }} Config
 * @property {function(): void}  _timeBundleStop
 * @property {function(RanvierPlayer, string, string[]=, RanvierRoom=): RanvierPlayer|RanvierNpc|RanvierItem|RanvierExit|null} getTarget
 */

module.exports = {};
