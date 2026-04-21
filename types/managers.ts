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

// Minimal structural type for manager use — full implementation in declare module 'ranvier' in primitives.d.ts
export interface RanvierSkill {
  id:   string;
  name: string;
  [key: string]: any;
}

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

export interface MercRegistryEntry {
  contractId:       string;
  mercRef:          string;
  mercName:         string;
  homeRoomId:       string;
  holderId:         string;
  targetRoomId:     string;
  nextUpkeepAt:     number;
  expiresAt:        number;
  upkeepCost:       number;
  upkeepCurrency:   string;
  status:           'EN_ROUTE' | 'STATIONED' | 'RETURNING' | 'FLEEING';
  npcInstance:      RanvierNpc | null;
  contractItem:     RanvierItem | null;
  path:             RanvierRoom[];
  pathIndex:        number;
  lastMoveAt:       number;
  lastClaimCheckAt: number;
}

export interface MercenaryService {
  getActiveMercCount(holderId: string): number;
  getCoveredRoomIds(holderId: string): Set<string>;
  getContractsByPlayer(holderId: string): MercRegistryEntry[];
  findHolderForContract(contractId: string, state: GameState): RanvierPlayer | null;
  beginFleeing(contractId: string, state: GameState): void;
  hire(player: RanvierPlayer, npc: RanvierNpc, state: GameState): void;
  dismiss(contractId: string, state: GameState): void;
  handleMercDeath(npc: RanvierNpc, state: GameState): void;
  tick(state: GameState): void;
  boot(state: GameState): Promise<void>;
}

export interface Party {
  invited: Set<RanvierPlayer>;
  leader:  RanvierPlayer;

  delete(player: RanvierPlayer): void;
  add(player: RanvierPlayer): void;
  disband(): void;
  invite(player: RanvierPlayer): void;
  isInvited(player: RanvierPlayer): boolean;
  removeInvite(player: RanvierPlayer): void;
  getBroadcastTargets(): RanvierPlayer[];
}

export interface PartyManager {
  create(player: RanvierPlayer): void;
  disband(party: Party): void;
}

export interface AttributeFactory {
  add(name: string, base: number, formula?: RanvierAttributeFormula, metadata?: object): void;
  has(name: string): boolean;
  get(name: string): object;
  create(name: string, base?: number, delta?: number): RanvierAttribute;
  validateAttributes(): void;
}