import { Socket } from 'net';
import { EventManager } from './managers';
import { GameState } from './state';

export interface EventEmitter {
  emit(event: string | symbol, ...args: any[]): boolean;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string | symbol): this;
  listeners(event: string | symbol): Function[];
  rawListeners(event: string | symbol): Function[];
  listenerCount(event: string | symbol): number;
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
  eventNames(): (string | symbol)[];
}

export interface RanvierLogger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  http(message: string, ...args: any[]): void;
  verbose(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  silly(message: string, ...args: any[]): void;
  log(message: string, meta?: object): void;
}

export interface RanvierDoor {
  lockedBy?: string;
  locked:    boolean;
  closed:    boolean;
}

export interface RanvierExit {
  roomId?:    string;
  direction:  string;
  inferred:   boolean;
  room?:      RanvierRoom;
}

export interface RanvierGameEntity extends EventEmitter, RanvierMetadatable, RanvierScriptable {
  __pruned:  boolean;
  behaviors: Map<string, any>;
  metadata:  Record<string, any>;

  hasBehavior(name: string): boolean;
  getBehavior(name: string): any;
  setupBehaviors(manager: any): void;
  setMeta(key: string, value: any): void;
  getMeta(key: string): any;
}

export interface RanvierArea extends RanvierGameEntity {
  bundle:    string;
  name:      string;
  title:     string;
  rooms:     Map<string, RanvierRoom>;
  npcs:      Set<RanvierNpc>;
  map:       Map<number, any>;
  script:    string | undefined;
  readonly areaPath: string;
  readonly floors:   number[];

  getRoomById(id: string): RanvierRoom | undefined;
  addRoom(room: RanvierRoom): void;
  removeRoom(room: RanvierRoom): void;
  addRoomToMap(room: RanvierRoom): void;
  getRoomAtCoordinates(x: number, y: number, z: number): RanvierRoom | false;
  addNpc(npc: RanvierNpc): void;
  removeNpc(npc: RanvierNpc): void;
  update(state: GameState): void;
  hydrate(state: GameState): void;
  getBroadcastTargets(): any[];
}

export interface RanvierRoom extends RanvierGameEntity {
  def:             object;
  area:            RanvierArea;
  defaultItems:    any[];
  defaultNpcs:     any[];
  script:          string | undefined;
  coordinates:     { x: number; y: number; z: number } | null;
  description:     string;
  entityReference: string;
  exits:           RanvierExit[];
  id:              string | number;
  title:           string;
  doors:           Map<string, RanvierDoor>;
  defaultDoors:    Record<string, RanvierDoor> | undefined;
  items:           Set<any>;
  npcs:            Set<RanvierNpc>;
  players:         Set<RanvierPlayer>;
  spawnedNpcs:     Set<RanvierNpc>;

  addPlayer(player: RanvierPlayer): void;
  removePlayer(player: RanvierPlayer): void;
  addNpc(npc: RanvierNpc): void;
  removeNpc(npc: RanvierNpc, removeSpawn?: boolean): void;
  addItem(item: any): void;
  removeItem(item: any): void;
  getExits(): RanvierExit[];
  findExit(exitName: string): RanvierExit | false;
  getExitToRoom(nextRoom: RanvierRoom): RanvierExit | false;
  hasDoor(fromRoom: RanvierRoom): boolean;
  getDoor(fromRoom: RanvierRoom): RanvierDoor | null;
  isDoorLocked(fromRoom: RanvierRoom): boolean;
  openDoor(fromRoom: RanvierRoom): void;
  closeDoor(fromRoom: RanvierRoom): void;
  unlockDoor(fromRoom: RanvierRoom): void;
  lockDoor(fromRoom: RanvierRoom): void;
  spawnItem(state: GameState, entityRef: string): any;
  spawnNpc(state: GameState, entityRef: string): RanvierNpc;
  hydrate(state: GameState): void;
  getBroadcastTargets(): any[];
}

export interface RanvierAttributeFormula {
  requires: string[];
  formula:  (...args: number[]) => number;

  evaluate(attribute: RanvierAttribute, ...args: number[]): number;
}

export interface RanvierAttribute {
  name:     string;
  base:     number;
  delta:    number;
  formula:  RanvierAttributeFormula | null;
  metadata: Record<string, unknown>;

  lower(amount: number): void;
  raise(amount: number): void;
  setBase(amount: number): void;
  setDelta(amount: number): void;
  serialize(): { delta: number; base: number };
}

export interface RanvierEffect extends EventEmitter {
  id:        string;
  flags:     symbol[];
  config: {
    autoActivate:    boolean;
    description:     string;
    duration:        number;
    hidden:          boolean;
    maxStacks:       number;
    name:            string;
    persists:        boolean;
    refreshes:       boolean;
    tickInterval:    boolean | number;
    type:            string;
    unique:          boolean;
    blockedChannels: string[];
    blockedMessage?: string;
  };
  startedAt: number;
  paused:    number | null;
  modifiers: {
    attributes:     Record<string, (current: number) => number> | ((attrName: string, current: number) => number);
    incomingDamage: (damage: any, current: number) => number;
    outgoingDamage: (damage: any, current: number) => number;
  };
  state:     Record<string, any>;
  active:    boolean;
  target:    RanvierCharacter | undefined;
  skill?:    RanvierSkill;
  attacker?: RanvierCharacter

  readonly name:        string;
  readonly description: string;
  readonly duration:    number;
  readonly elapsed:     number | null;
  readonly remaining:   number;

  isCurrent(): boolean;
  activate(): void;
  deactivate(): void;
  remove(): void;
  pause(): void;
  resume(): void;
  modifyAttribute(attrName: string, currentValue: number): number;
  modifyIncomingDamage(damage: any, currentAmount: number): number;
  modifyOutgoingDamage(damage: any, currentAmount: number): number;
  serialize(): object;
  hydrate(state: GameState, data: object): void;
}

export interface RanvierEffectList {
  effects: Set<RanvierEffect>;
  target:  RanvierCharacter;
  readonly size: number;

  entries(): RanvierEffect[];
  hasEffectType(type: string): boolean;
  getByType(type: string): RanvierEffect | undefined;
  emit(event: string | symbol, ...args: any[]): boolean;
  add(effect: RanvierEffect): boolean;
  remove(effect: RanvierEffect): void;
  clear(): void;
  validateEffects(): void;
  evaluateAttribute(attr: { name: string; base: number }): number;
  evaluateIncomingDamage(damage: any, currentAmount: number): number;
  evaluateOutgoingDamage(damage: any, currentAmount: number): number;
  serialize(): object[];
  hydrate(state: GameState): void;
}

export interface RanvierCommandExecutable {
  execute: () => void;
  label:   string;
  lag:     number;
}

export interface RanvierCommandQueue {
  commands: RanvierCommandExecutable[];
  lag:      number;
  lastRun:  number;

  readonly hasPending:   boolean;
  readonly queue:        RanvierCommandExecutable[];
  readonly lagRemaining: number;
  readonly msTilNextRun: number;

  addLag(amount: number): void;
  enqueue(executable: Omit<RanvierCommandExecutable, 'lag'>, lag: number): number;
  execute(): boolean;
  flush(): void;
  reset(): void;
  getTimeTilRun(commandIndex: number): number;
  getMsTilRun(commandIndex: number): number;
}

export interface RanvierAccount {
  username:   string;
  characters: Array<{ username: string; deleted: boolean }>;
  password:   string;
  banned:     boolean;
  deleted:    boolean;
  metadata:   Record<string, any>;

  getUsername(): string;
  addCharacter(username: string): void;
  hasCharacter(name: string): boolean;
  deleteCharacter(name: string): void;
  undeleteCharacter(name: string): void;
  setPassword(pass: string): void;
  checkPassword(pass: string): boolean;
  save(callback?: Function): void;
  ban(): void;
  deleteAccount(): void;
  serialize(): object;
}

export interface RanvierMetadatable {
  setMeta(key: string, value: any): void;
  getMeta(key: string): any;
}

export interface RanvierInventoryFullError extends Error {}

export interface RanvierCharacter extends EventEmitter, RanvierMetadatable {
  uuid:            string;
  entityReference: string;
  name:            string;
  inventory:       RanvierInventory | null;
  equipment:       Map<string, any>;
  combatants:      Set<RanvierCharacter>;
  combatData:      Record<string, any>;
  level:           number;
  room:            RanvierRoom | null;
  attributes:      any;
  followers:       Set<RanvierCharacter>;
  following:       RanvierCharacter | null;
  party:           any;
  effects:         RanvierEffectList;
  metadata:        Record<string, any>;

  readonly isNpc: boolean;

  hasAttribute(attr: string): boolean;
  getMaxAttribute(attr: string): number;
  getAttribute(attr: string): number;
  getBaseAttribute(attr: string): number;
  addAttribute(attribute: any): void;
  setAttributeToMax(attr: string): void;
  raiseAttribute(attr: string, amount: number): void;
  lowerAttribute(attr: string, amount: number): void;
  setAttributeBase(attr: string, newBase: number): void;
  hasEffectType(type: string): boolean;
  addEffect(effect: RanvierEffect): boolean;
  removeEffect(effect: RanvierEffect): void;
  initiateCombat(target: RanvierCharacter, lag?: number): void;
  isInCombat(target?: RanvierCharacter): boolean;
  addCombatant(target: RanvierCharacter): void;
  removeCombatant(target: RanvierCharacter): void;
  removeFromCombat(): void;
  evaluateIncomingDamage(damage: any, currentAmount: number): number;
  evaluateOutgoingDamage(damage: any, currentAmount: number): number;
  equip(item: any, slot: string): void;
  unequip(slot: string): void;
  addItem(item: any): void;
  removeItem(item: any): void;
  hasItem(itemReference: string): any | false;
  isInventoryFull(): boolean;
  follow(target: RanvierCharacter): void;
  unfollow(): void;
  addFollower(follower: RanvierCharacter): void;
  removeFollower(follower: RanvierCharacter): void;
  isFollowing(target: RanvierCharacter): boolean;
  hasFollower(target: RanvierCharacter): boolean;
  hydrate(state: GameState): void;
  serialize(): object;
  getBroadcastTargets(): RanvierCharacter[];
  moveTo(nextRoom: RanvierRoom, onMoved?: () => void): void;

  // Faction
  _factionAttackTarget:   RanvierCharacter | null;
  _factionAttackTimer:    NodeJS.Timeout | null;
  _factionEventHandler?:  (payload: any) => Promise<void>;
}
export interface RanvierSkillConfig {
  configureEffect?: (effect: RanvierEffect) => RanvierEffect;
  cooldown?: number | { group: string; length: number } | null;
  effect?: string | null;
  flags?: RanvierSkillFlag[];
  info?: (player: RanvierPlayer) => void;
  initiatesCombat?: boolean;
  name: string;
  requiresTarget?: boolean;
  resource?: SkillResource | SkillResource[] | null;
  run?: (args?: string, player?: RanvierPlayer, target?: RanvierCharacter) => boolean | void;
  targetSelf?: boolean;
  type?: RanvierSkillType;
  options?: Record<string, any>;
}

interface SkillResource {
  attribute: string;
  cost: number;
}

export interface RanvierAbility {
  skills: string[]
  spells: string[]
}
export interface RanvierAbilityTable {
  [key: string]: RanvierAbility
}

export interface RanvierPlayerClass {
  id: string,
  config: {
    name: string,
    description: string,
    abilityTable: RanvierAbilityTable,
    setupPlayer: (state: GameState, player: RanvierPlayer) => void
  },
  name: string,
  description: string,
  abilityTable: RanvierAbilityTable,
  setupPlayer: (state: GameState, player: RanvierPlayer) => void
  hasAbility: (id: string) => boolean
  canUseAbility: (player: RanvierPlayer, id: string) => boolean
}

export interface RanvierPlayer extends RanvierCharacter {
  account:          RanvierAccount;
  experience:       number;
  extraPrompts:     Map<string, { removeOnRender: boolean; renderer: () => string }>;
  password:         string;
  prompt:           string;
  socket:           Socket | null;
  questTracker:     any;
  commandQueue:     RanvierCommandQueue;
  role:             number;
  playerClass:      RanvierPlayerClass
  _lastCommandTime: number;

  queueCommand(executable: any, lag: number): void;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  interpolatePrompt(promptStr: string, extraData?: object): string;
  addPrompt(id: string, renderer: () => string, removeOnRender?: boolean): void;
  removePrompt(id: string): void;
  hasPrompt(id: string): boolean;
  moveTo(nextRoom: RanvierRoom, onMoved?: () => void): void;
  save(callback?: Function): void;
  hydrate(state: GameState): void;
  serialize(): object;
}

export interface RanvierScriptable {
  __pruned:  boolean;
  behaviors: Map<string, any>;

  emit(event: string | symbol, ...args: any[]): boolean;
  hasBehavior(name: string): boolean;
  getBehavior(name: string): any;
  setupBehaviors(manager: any): void;
}

export interface RanvierNpc extends RanvierCharacter, RanvierScriptable {
  area:             RanvierArea;
  script:           string | undefined;
  behaviors:        Map<string, any>;
  defaultEquipment: Record<string, string>;
  defaultItems:     string[];
  description:      string | undefined;
  id:               string | number;
  keywords:         string[];
  quests:           string[];
  uuid:             string;
  commandQueue:     any;
  __pruned:         boolean;

  readonly isNpc: true;

  hydrate(state: GameState): void;
  hasBehavior(name: string): boolean;
  getBehavior(name: string): any;
  setupBehaviors(manager: any): void;

  // Aggro
  _aggroTimer:     number;
  _aggroTarget:    RanvierCharacter | null;
  _aggroWarned:    boolean;
  _lastWanderTime: number;
}

export type RanvierItemTypes = {
  OBJECT:    1,
  CONTAINER: 2,
  ARMOR:     3,
  WEAPON:    4,
  POTION:    5,
  RESOURCE:  6,
};

export type RanvierItemType = RanvierItemTypes[keyof RanvierItemTypes];

export interface RanvierItem extends RanvierGameEntity {
  area:            RanvierArea;
  defaultItems:    any[];
  description:     string;
  entityReference: string;
  id:              string | number;
  maxItems:        number;
  inventory:       RanvierInventory | null;
  isEquipped:      boolean;
  keywords:        string[];
  name:            string;
  room:            RanvierRoom | null;
  roomDesc:        string;
  script:          string | null;
  type:            RanvierItemType;
  uuid:            string;
  closeable:       boolean;
  closed:          boolean;
  locked:          boolean;
  lockedBy:        string | null;
  carriedBy:       RanvierCharacter | RanvierItem | null;
  equippedBy:      RanvierCharacter | null;

  initializeInventory(inventory: object | null): void;
  hasKeyword(keyword: string): boolean;
  addItem(item: RanvierItem): void;
  removeItem(item: RanvierItem): void;
  isInventoryFull(): boolean;
  findCarrier(): RanvierCharacter | RanvierItem | null;
  open(): void;
  close(): void;
  lock(): void;
  unlock(): void;
  hydrate(state: GameState, serialized?: object): void;
  serialize(): object;
}

export interface RanvierBroadcast {
  sayAt(target: object, message?: string, wrapWidth?: number, useColor?: boolean): void;
  sayAtExcept(target: object, message: string, excludes: object[]): void;
  at(target: object, message?: string): void;
  prompt(player: object): void;
  progress(width: number, percent: number, color: string): string;
  wrap(message: string, width?: number): string;
  line(width: number, char?: string, color?: string): string;
  center(width: number, text: string, color?: string, char?: string): string
  indent(text: string, offset: number): string
}

export interface RanvierCommandDef {
  type?: RanvierCommandType;
  command: (args: string, player: RanvierPlayer, arg0: string) => unknown;
  aliases?: string[];
  usage?: string;
  requiredRole?: RanvierPlayerRoles;
  metadata?: Record<string, unknown>;
}

export interface RanvierCommand {
  bundle: string;
  type: RanvierCommandType;
  name: string;
  func: RanvierCommandDef['command'];
  aliases: string[];
  usage: string;
  requiredRole: RanvierPlayerRoles;
  file: string;
  metadata: Record<string, unknown>;
  execute(args: string|null, player: RanvierPlayer, arg0?: string): unknown;
  command: (state: GameState) => (args: string) => void
}

export interface RanvierCraftCommand {
  name:     string;
  aliases?: string[];
  command: (state: GameState) => (args: string, player: RanvierPlayer) => void
}

export interface RanvierVendorCommand {
  name:     string;
  aliases?: string[];
  command:  (state: GameState) => (vendor: RanvierNpc, args: string, player: RanvierPlayer) => void;
}


export type RanvierQuestState = Record<string, any>;

export interface RanvierQuestGoal extends EventEmitter {
  config:  Record<string, any>;
  quest:   RanvierQuest;
  state:   RanvierQuestState;
  player:  RanvierPlayer;

  getProgress(): { percent: number; display: string };
  complete(): void;
  serialize(): object;
  hydrate(state: Record<string, any>): void;
}

export interface RanvierQuestReward {
  reward(state: GameState, quest: RanvierQuest, config: Record<string, any>, player: RanvierPlayer): void;
  display(state: GameState, quest: RanvierQuest, config: Record<string, any>, player: RanvierPlayer): string;
}

export interface RanvierQuest extends EventEmitter {
  id:              string;
  entityReference: string;
  config: {
    title:             string;
    description:       string;
    completionMessage: string | null;
    requires:          string[];
    level:             number;
    autoComplete:      boolean;
    repeatable:        boolean;
    rewards:           any[];
    goals:             any[];
    [key: string]:     any;
  };
  player:    RanvierPlayer;
  goals:     RanvierQuestGoal[];
  state:     RanvierQuestState[];

  addGoal(goal: RanvierQuestGoal): void;
  onProgressUpdated(): void;
  getProgress(): { percent: number; display: string };
  serialize(): object;
  hydrate(): void;
  complete(): void;
}

export interface WorldPath {
  clusters: object[];
  coords:   number[][];
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

export interface MercRegistryEntry {
  contractId:      string;
  mercRef:         string;
  mercName:        string;
  homeRoomId:      string;
  holderId:        string;
  targetRoomId:    string;
  nextUpkeepAt:    number;
  expiresAt:       number;
  upkeepCost:      number;
  upkeepCurrency:  string;
  status:          'EN_ROUTE' | 'STATIONED' | 'RETURNING' | 'FLEEING';
  npcInstance:     RanvierNpc | null;
  contractItem:    RanvierItem | null;
  path:            RanvierRoom[];
  pathIndex:       number;
  lastMoveAt:      number;
  lastClaimCheckAt: number;
}

export interface PhaseInfo {
  name:  string;
  emoji: string;
  index: number;
}

export interface NamedIndex {
  name:  string;
  index: number | null;
}

export interface RanvierAreaAudience {
  sender: RanvierCharacter;
  state: GameState;
  getBroadcastTargets(): (RanvierCharacter)[];
}

export interface RanvierPartyAudience {
  getBroadcastTargets(): (RanvierCharacter)[];
}

export interface RanvierPrivateAudience {
  getBroadcastTargets(): (RanvierCharacter)[];
}

export interface RanvierRoomAudience {
  getBroadcastTargets(): (RanvierCharacter)[];
}

export interface RanvierWorldAudience {
  getBroadcastTargets(): (RanvierCharacter)[];
}

export type RanvierEffectFlag = {
  readonly BUFF: symbol;
  readonly DEBUFF: symbol;
};

export interface RanvierHeal {
  commit(target: object): void;
}

export interface RanvierDamage {
  attribute: string
  attacker?: RanvierCharacter
  metadata: Record<string, any>
  evaluate(target: object): number;
  commit(target: object): void;
}

export type RanvierSkillType  = {
  readonly SKILL: symbol;
  readonly SPELL: symbol;
};

export type RanvierPlayerRoles = {
  readonly PLAYER: 0;
  readonly BUILDER: 1;
  readonly ADMIN: 2;
};

export interface RanvierConfig {
  get(key: string, fallback?: any): any;
  load(data: object): void;
};

export interface RanvierResourceCost {
  attribute: string;
  cost: number;
}

export interface RanvierSkillFlag {
  readonly PASSIVE: symbol;
  readonly ACTIVE: symbol;
};

export interface RanvierSkill {
  id: string;
  name: string;
  configureEffect: (effect: RanvierEffect) => RanvierEffect;
  cooldownGroup: string | null;
  cooldownLength: number | null;
  effect: string | null;
  flags: RanvierSkillFlag[];
  info: (player: RanvierPlayer) => void;
  initiatesCombat: boolean;
  options: Record<string, any>;
  requiresTarget: boolean;
  resource: RanvierResourceCost[] | null;
  run: (...args: unknown[]) => unknown;
  state: GameState;
  targetSelf: boolean;
  target?: RanvierCharacter;
  type: RanvierSkillType;
  lag?: number

  execute(args: string, player: RanvierPlayer, target: RanvierCharacter): boolean;
  payResourceCosts(player: RanvierPlayer): boolean;
  payResourceCost(player: RanvierPlayer, resource: RanvierResourceCost): void;
  activate(player: RanvierPlayer): void;
  onCooldown(character: RanvierCharacter): RanvierEffect | false;
  cooldown(character: RanvierCharacter): void;
  getCooldownId(): string;
  hasEnoughResources(character: RanvierCharacter): boolean;
  hasEnoughResource(character: RanvierCharacter, resource: RanvierResourceCost): boolean;
}

export interface RanvierInventory extends Map<string, RanvierItem> {
  maxSize: number;

  setMax(size: number): void;
  getMax(): number;
  readonly isFull: boolean;
  addItem(item: RanvierItem): void;
  removeItem(item: RanvierItem): void;
  serialize(): { items: [string, RanvierItem][]; max: number };
  hydrate(state: GameState, carriedBy: RanvierCharacter | RanvierItem): void;
}

export interface RanvierEventUtil {
  genWrite(socket: import('net').Socket): (str: string) => void;
  genSay(socket: import('net').Socket): (str: string) => void;
}

export type RanvierCommandTypeValue = symbol;

export type RanvierCommandType = {
  COMMAND:  RanvierCommandTypeValue;
  SKILL:    RanvierCommandTypeValue;
  CHANNEL:  RanvierCommandTypeValue;
  MOVEMENT: RanvierCommandTypeValue;
}

export interface RanvierCooldownError {
  effect: RanvierEffect;
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

export interface PhaseInfo {
  name:  string;
  emoji: string;
  index: number;
}

export interface NamedIndex {
  name:  string;
  index: number | null;
}

export interface RanvierParty {
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

export interface WorldPath {
  clusters: object[];
  coords:   number[][];
}

export interface EffectDefinition {
  config: Record<string, unknown>;
  state?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EffectConfig {
  config: Record<string, unknown>;
  state?: Record<string, unknown>;
  listeners?:
    | Record<string, (...args: unknown[]) => void>
    | ((state: GameState) => Record<string, (...args: unknown[]) => void>);
}

export interface EffectEntry {
  definition: Omit<EffectConfig, 'listeners'>;
  eventManager: EventManager;
}

