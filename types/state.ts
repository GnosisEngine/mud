import type {
  RanvierPlayer,
  RanvierNpc,
  RanvierItem,
  RanvierExit,
  RanvierRoom,
  RanvierLogger,
} from './primitives';
import type {
  AreaManager,
  RoomManager,
  PlayerManager,
  BehaviorManager,
  MobFactory,
  ItemFactory,
  QuestFactory,
  StorageManager,
  AbilityManager,
  BundleManager,
  PartyManager,
  AttributeFactory,
  EffectFactory,
  MobManager,
  CommandManager,
  ItemManager
} from './managers';
import type {
  TimeService,
  FactionService,
  WorldManager,
  MercenaryService
} from './services';
import { ContextService } from '../bundles/world/lib/ContextService.js'
import { FactionManager, ReputationStore } from './factions';

//export type LogicCheck<T = {}> = (state: GameState, player: RanvierPlayer, options?: T) => boolean
export type LogicCheck<T = Record<string, never>> = (
  state:   GameState,
  player:  RanvierPlayer,
  options: T
) => boolean | null

export type PlayerEvents = (state: GameState) => () => void

export type ServerEvent = (state: GameState) => () => void

export interface LogicChecks {
  [key: string]: LogicCheck
}

export interface GameState {
  AreaManager:         AreaManager;
  RoomManager:         RoomManager;
  PlayerManager:       PlayerManager;
  ItemBehaviorManager: BehaviorManager;
  NpcBehaviorManager:  BehaviorManager;
  RoomBehaviorManager: BehaviorManager;
  AreaBehaviorManager: BehaviorManager;
  MobFactory:          MobFactory;
  ItemFactory:         ItemFactory;
  QuestFactory:        QuestFactory;
  ChannelManager:      object;
  CommandManager:      CommandManager;
  EffectFactory:       EffectFactory;
  SkillManager:        AbilityManager;
  SpellManager:        AbilityManager;
  AccountManager:      object;
  HelpManager:         object;
  EventManager:        object;
  InputEventManager:   object;
  ItemManager:         ItemManager;
  MobManager:          MobManager;
  GameServer:          object;
  QuestRewardManager:  Map<any, any>;
  PartyManager:        PartyManager;
  AttributeFactory:    AttributeFactory;
  MercenaryService:    MercenaryService;
  BundleManager:       BundleManager;
  Logger:              RanvierLogger;
  TimeService:         TimeService;
  FactionService:      FactionService;
  WorldManager:        WorldManager;
  StorageManager:      StorageManager;
  WorldReady:          boolean;
  FactionManager:      FactionManager;
  _factionStore:       ReputationStore | null;
  ContextService:      typeof ContextService;
  Config:              { get(key: string): any };
  _timeBundleStop():   void;
  getTarget(
    player:  RanvierPlayer,
    query:   string,
    targets: string[],
    room?:   RanvierRoom,
  ): RanvierPlayer | RanvierNpc | RanvierItem | RanvierExit | null;
}