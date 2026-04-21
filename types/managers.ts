import { RanvierEffect, EffectEntry, RanvierSkill, RanvierParty, EventEmitter, EffectConfig } from './primitives';
import type {
  RanvierArea,
  RanvierRoom,
  RanvierPlayer,
  RanvierNpc,
  RanvierItem,
  RanvierQuest,
  RanvierAccount,
  RanvierAttribute,
  RanvierAttributeFormula,
  RanvierCommand,
} from './primitives';
import type { GameState } from './state';

export interface BehaviorManager {
  addBehavior(name: string, behavior: object): void;
  getBehavior(name: string): object | undefined;
}

export interface AreaManager {
  getArea(id: string): RanvierArea | undefined;
  getAreas(): Map<string, RanvierArea>;
}

export interface RoomManager {
  getRoom(id: string): RanvierRoom | undefined;
}

export interface PlayerManager {
  players: Map<string, RanvierPlayer>;
  events:  object;
  loader:  object | null;
  setLoader(loader: object): void;
  getPlayer(name: string): RanvierPlayer | undefined;
  addPlayer(player: RanvierPlayer): void;
  removePlayer(player: RanvierPlayer, skipSave?: boolean): void;
  getPlayersAsArray(): RanvierPlayer[];
  addListener(event: string, listener: Function): void;
  filter(predicate: (player: RanvierPlayer) => boolean): RanvierPlayer[];
  loadPlayer(state: GameState, account: RanvierAccount, name: string, force?: boolean): Promise<RanvierPlayer>;
  keyify(player: RanvierPlayer): string;
  exists(name: string): boolean;
  save(player: RanvierPlayer): Promise<void>;
  saveAll(): Promise<void>;
  tickAll(): void;
  getBroadcastTargets(): RanvierPlayer[];
}

export interface EntityFactory {
  entities: Map<string, Record<string, any>>;
  scripts:  object;
  createEntityRef(area: string, id: string): string;
  getDefinition(ref: string): Record<string, any> | undefined;
  setDefinition(ref: string, def: Record<string, any>): void;
  addScriptListener(ref: string, event: string, listener: Function): void;
  createByType(area: RanvierArea, ref: string, listener: Function): any;
  create(area: RanvierArea, ref: string): any;
  clone(entity: RanvierItem | RanvierNpc | RanvierRoom | RanvierArea): any;
}

export interface MobFactory extends EntityFactory {
  create(area: RanvierArea, ref: string): RanvierNpc;
}

export interface MobManager {
  mobs: Map<string, RanvierNpc>;
  addMob(mob: RanvierNpc): void;
  removeMob(mob: RanvierNpc): void;
}

export interface ItemFactory {
  create(ref: string, area: RanvierArea): RanvierItem;
}

export interface QuestFactory {
  quests: Map<string, { id: string; area: string; config: Record<string, any> }>;
  add(area: string, id: string, quest: RanvierQuest): void;
  set(id: string, quest: RanvierQuest): void;
  get(id: string): RanvierQuest | undefined;
  canStart(player: RanvierPlayer, id: string): boolean;
  create(state: GameState, id: string, player: RanvierPlayer, rewards?: any[]): RanvierQuest;
  makeQuestKey(area: string, id: string): string;
}

export interface StorageManager {
  store: any; // full type: bundles/claims/lib/store.js — no declarations yet
}

export interface AbilityManager {
  skills: Map<string, RanvierSkill>;
  get(id: string): RanvierSkill | undefined;
  add(skill: RanvierSkill): void;
  remove(skill: RanvierSkill): void;
  find(id: string, includeHidden?: boolean): RanvierSkill | undefined;
}

export interface BundleManager {
  createCommand(bundle: string, area: string, name: string): RanvierCommand;
}

export interface PartyManager {
  create(player: RanvierPlayer): void;
  disband(party: RanvierParty): void;
}

export interface AttributeFactory {
  add(name: string, base: number, formula?: RanvierAttributeFormula, metadata?: object): void;
  has(name: string): boolean;
  get(name: string): object;
  create(name: string, base?: number, delta?: number): RanvierAttribute;
  validateAttributes(): void;
}

export interface EventManager {
  events: Map<string, Set<(...args: unknown[]) => void>>;
  get(name: string): Set<(...args: unknown[]) => void> | undefined;
  add(eventName: string, listener: (...args: unknown[]) => void): void;
  attach(emitter: EventEmitter, config?: Record<string, unknown>): void;
  detach(emitter: EventEmitter, events?: string | Iterable<string>): void;
}

export interface EffectFactory {
  effects: Map<string, EffectEntry>;
  add(id: string, config: EffectConfig, state?: GameState): void;
  has(id: string): boolean;
  get(id: string): EffectEntry | undefined;
  create(id: string, config?: Record<string, unknown>, state?: Record<string, unknown>): RanvierEffect;
}