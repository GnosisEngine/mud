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
  MobManager
} from './managers';
import type {
  TimeService,
  FactionService,
  WorldManager,
  MercenaryService
} from './services';
import { ContextService } from '../bundles/world/lib/ContextService.js'

export type LogicCheck =( state: GameState, player: RanvierPlayer, options?: any) => boolean

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
  CommandManager:      object;
  EffectFactory:       EffectFactory;
  SkillManager:        AbilityManager;
  SpellManager:        AbilityManager;
  AccountManager:      object;
  HelpManager:         object;
  EventManager:        object;
  InputEventManager:   object;
  ItemManager:         object;
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