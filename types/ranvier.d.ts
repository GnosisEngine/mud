/// <reference types="node" />

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

export class RanvierGameEntity extends NodeJS.EventEmitter 
  implements RanvierMetadatable, RanvierScriptable {

  __pruned:  boolean;
  behaviors: Map<string, any>;
  metadata:  Record<string, any>;

  emit(event: string | symbol, ...args: any[]): boolean;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string | symbol): this;
  hasBehavior(name: string): boolean;
  getBehavior(name: string): any;
  setupBehaviors(manager: any): void;
  setMeta(key: string, value: any): void;
  getMeta(key: string): any;
}

export class RanvierArea extends RanvierGameEntity {
  constructor(bundle: string, name: string, manifest: {
    title:      string;
    metadata?:  Record<string, any>;
    script?:    string;
    behaviors?: Record<string, any>;
  });

  bundle:   string;
  name:     string;
  title:    string;
  metadata: Record<string, any>;
  rooms:    Map<string, RanvierRoom>;
  npcs:     Set<RanvierNpc>;
  map:      Map<number, any>;
  script:   string | undefined;
  behaviors: Map<string, any>;

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

export class RanvierRoom extends RanvierGameEntity {
  constructor(area: RanvierArea, def: {
    title:        string;
    description:  string;
    id:           string | number;
    items?:       any[];
    npcs?:        any[];
    metadata?:    Record<string, any>;
    script?:      string;
    behaviors?:   Record<string, any>;
    coordinates?: [number, number, number];
    exits?:       RanvierExit[];
    doors?:       Record<string, RanvierDoor>;
    [key: string]: any;
  });

  def:             object;
  area:            RanvierArea;
  defaultItems:    any[];
  defaultNpcs:     any[];
  metadata:        Record<string, any>;
  script:          string | undefined;
  behaviors:       Map<string, any>;
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

  emit(event: string | symbol, ...args: any[]): boolean;
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

export class RanvierAttributeFormula {
  requires: string[];
  formula: (...args: number[]) => number;

  constructor(requires: string[], fn: (...args: number[]) => number);
  evaluate(attribute: RanvierAttribute, ...args: number[]): number;
}

export class RanvierAttribute {
  name: string;
  base: number;
  delta: number;
  formula: RanvierAttributeFormula | null;
  metadata: Record<string, unknown>;

  constructor(
    name: string,
    base: number,
    delta?: number,
    formula?: RanvierAttributeFormula | null,
    metadata?: Record<string, unknown>
  );

  lower(amount: number): void;
  raise(amount: number): void;
  setBase(amount: number): void;
  setDelta(amount: number): void;
  serialize(): { delta: number; base: number };
}

export class RanvierEffect extends NodeJS.EventEmitter {
  constructor(id: string, def: {
    flags?:     string[];
    config?: {
      autoActivate?:  boolean;
      description?:   string;
      duration?:      number;
      hidden?:        boolean;
      maxStacks?:     number;
      name?:          string;
      persists?:      boolean;
      refreshes?:     boolean;
      tickInterval?:  boolean | number;
      type?:          string;
      unique?:        boolean;
    };
    modifiers?: {
      attributes?:      Record<string, (current: number) => number> | ((attrName: string, current: number) => number);
      incomingDamage?:  (damage: any, current: number) => number;
      outgoingDamage?:  (damage: any, current: number) => number;
    };
    state?: Record<string, any>;
  });

  id:        string;
  flags:     string[];
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
    blockedChannels: string[]
    blockedMessage?: string
  };
  startedAt: number;
  paused:    number | null;
  modifiers: {
    attributes:      Record<string, (current: number) => number> | ((attrName: string, current: number) => number);
    incomingDamage:  (damage: any, current: number) => number;
    outgoingDamage:  (damage: any, current: number) => number;
  };
  state:     Record<string, any>;
  active:    boolean;
  target:    RanvierCharacter | undefined;
  skill?:    any;

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

export class RanvierEffectList {
  constructor(target: RanvierCharacter, effects: Array<RanvierEffect | object>);

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

export class RanvierCommandQueue {
  constructor();

  commands: RanvierCommandExecutable[];
  lag:      number;
  lastRun:  number;

  readonly hasPending:    boolean;
  readonly queue:         RanvierCommandExecutable[];
  readonly lagRemaining:  number;
  readonly msTilNextRun:  number;

  addLag(amount: number): void;
  enqueue(executable: Omit<RanvierCommandExecutable, 'lag'>, lag: number): number;
  execute(): boolean;
  flush(): void;
  reset(): void;
  getTimeTilRun(commandIndex: number): number;
  getMsTilRun(commandIndex: number): number;
}

export class RanvierAccount {
  username:   string;
  characters: Array<{ username: string; deleted: boolean }>;
  password:   string;
  banned:     boolean;
  deleted:    boolean;
  metadata:   Record<string, any>;

  constructor(data: object);

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

export class RanvierCharacter extends NodeJS.EventEmitter implements RanvierMetadatable {
  constructor(data: {
    name:        string;
    inventory?:  object;
    equipment?:  Map<string, any>;
    level?:      number;
    room?:       RanvierRoom | string | null;
    attributes?: object;
    effects?:    RanvierEffect[];
    metadata?:   Record<string, any>;
    [key: string]: any;
  });

  uuid:       string;
  entityReference:  string;
  name:       string;
  inventory:  Inventory | null;
  equipment:  Map<string, any>;
  combatants: Set<RanvierCharacter>;
  combatData: Record<string, any>;
  level:      number;
  room:       RanvierRoom | null;
  attributes: any;
  followers:  Set<RanvierCharacter>;
  following:  RanvierCharacter | null;
  party:      any;
  effects:    RanvierEffectList;
  metadata:   Record<string, any>;

  readonly isNpc: boolean;

  emit(event: string | symbol, ...args: any[]): boolean;
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
  initiateCombat(target: CombatTarget, lag?: number): void;
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

  setMeta(key: string, value: any): void;
  getMeta(key: string): any;

  // Faction stuff
  _factionAttackTarget: CombatTarget
  _factionAttackTimer: NodeJS.Timeout
  _factionEventHandler?: (payload: any) => Promise<void>;
}

export class RanvierPlayer extends RanvierCharacter {
  constructor(data: {
    account?:    RanvierAccount;
    experience?: number;
    password?:   string;
    prompt?:     string;
    socket?:     import('net').Socket;
    quests?:     { completed: any[]; active: any[] };
    role?:       number;
    [key: string]: any;
  });

  account:      RanvierAccount;
  experience:   number;
  extraPrompts: Map<string, { removeOnRender: boolean; renderer: () => string }>;
  password:     string;
  prompt:       string;
  socket:       import('net').Socket | null;
  questTracker: any;
  commandQueue: RanvierCommandQueue;
  role:         number;

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

  _lastCommandTime: number
}

export interface RanvierScriptable {
  __pruned:  boolean;
  behaviors: Map<string, any>;

  emit(event: string | symbol, ...args: any[]): boolean;
  hasBehavior(name: string): boolean;
  getBehavior(name: string): any;
  setupBehaviors(manager: any): void;
}

export class RanvierNpc extends RanvierCharacter implements RanvierScriptable {
  constructor(area: RanvierArea, data: {
    id:               string | number;
    name:             string;
    keywords:         string[];
    area?:            string;
    script?:          string;
    behaviors?:       Record<string, any>;
    equipment?:       Record<string, string>;
    items?:           string[];
    description?:     string;
    entityReference?: string;
    quests?:          string[];
    uuid?:            string;
    [key: string]:    any;
  });

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

  readonly isNpc: true;

  __pruned: boolean;

  hydrate(state: GameState): void;
  hasBehavior(name: string): boolean;
  getBehavior(name: string): any;
  setupBehaviors(manager: any): void;
  emit(event: string | symbol, ...args: any[]): boolean;

  _aggroTimer: number
  _aggroTarget: CombatTarget | null
  _aggroWarned: boolean
  _lastWanderTime: number
}

export const ItemType: {
  readonly OBJECT: 1;
  readonly CONTAINER: 2;
  readonly ARMOR: 3;
  readonly WEAPON: 4;
  readonly POTION: 5;
  readonly RESOURCE: 6;
};

export type ItemTypeValue = typeof ItemType[keyof typeof ItemType];

export class RanvierItem extends RanvierGameEntity {
  constructor(area: RanvierArea, item: {
    keywords:         string[];
    name:             string;
    id:               string | number;
    metadata?:        Record<string, any>;
    behaviors?:       Record<string, any>;
    items?:           any[];
    description?:     string;
    entityReference?: string;
    maxItems?:        number;
    inventory?:       object;
    isEquipped?:      boolean;
    room?:            RanvierRoom | null;
    roomDesc?:        string;
    script?:          string | null;
    type?:            ItemTypeValue | string;
    uuid?:            string;
    closeable?:       boolean;
    closed?:          boolean;
    locked?:          boolean;
    lockedBy?:        string | null;
    [key: string]:    any;
  });

  area:            RanvierArea;
  metadata:        Record<string, any>;
  behaviors:       Map<string, any>;
  defaultItems:    any[];
  description:     string;
  entityReference: string;
  id:              string | number;
  maxItems:        number;
  inventory:       Inventory | null;
  isEquipped:      boolean;
  keywords:        string[];
  name:            string;
  room:            RanvierRoom | null;
  roomDesc:        string;
  script:          string | null;
  type:            ItemTypeValue | string;
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

export interface RanvierQuest {
  id: string;
  title: string;
  player: RanvierPlayer;
  state: object;
  isComplete(): boolean;
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

export type CombatTarget = RanvierPlayer | RanvierNpc

export interface RanvierCommand {
  name: string;
  command: (state: GameState) => (args: string, player: RanvierPlayer) => void;
  aliases?: string[]
}

export interface RanvierVendorCommand {
  name:     string;
  aliases?: string[];
  command:  (state: GameState) => (vendor: RanvierNpc, args: string, player: RanvierPlayer) => void;
}

export class RanvierQuestGoal extends NodeJS.EventEmitter {
  constructor(quest: RanvierQuest, config: Record<string, any>, player: RanvierPlayer);

  config:  Record<string, any>;
  quest:   RanvierQuest;
  state:   Record<string, any>;
  player:  RanvierPlayer;

  getProgress(): { percent: number; display: string };
  complete(): void;
  serialize(): object;
  hydrate(state: Record<string, any>): void;
  emit(event: string | symbol, ...args: any[]): boolean;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string | symbol): this;
}

export class RanvierQuestReward {
  static reward(state: GameState, quest: RanvierQuest, config: Record<string, any>, player: RanvierPlayer): void;
  static display(state: GameState, quest: RanvierQuest, config: Record<string, any>, player: RanvierPlayer): string;
}

export class RanvierQuest extends NodeJS.EventEmitter {
  constructor(state: GameState, id: string, config: {
    entityReference?:   string;
    title?:             string;
    description?:       string;
    completionMessage?: string | null;
    requires?:          string[];
    level?:             number;
    autoComplete?:      boolean;
    repeatable?:        boolean;
    rewards?:           any[];
    goals?:             any[];
    [key: string]:      any;
  }, player: RanvierPlayer);

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
  state:     any[];
  GameState: GameState;

  emit(event: string | symbol, ...args: any[]): boolean;
  addGoal(goal: RanvierQuestGoal): void;
  onProgressUpdated(): void;
  getProgress(): { percent: number; display: string };
  serialize(): object;
  hydrate(): void;
  complete(): void;
}

/**
 * Module Declaration
 */

declare module 'ranvier' {
  export class Room extends RanvierRoom {}
  export class Account extends RanvierAccount {}
  export const Logger: RanvierLogger;
  export const Broadcast: RanvierBroadcast;
  export class QuestGoal extends RanvierQuestGoal {}
  export class QuestReward extends RanvierQuestReward {}
  export class Quest extends RanvierQuest {}
  export class AreaAudience {
    sender: CombatTarget;
    state: import('../types/state').GameState;
    getBroadcastTargets(): (CombatTarget)[];
  }

  export class PartyAudience {
    getBroadcastTargets(): (CombatTarget)[];
  }

  export class PrivateAudience {
    getBroadcastTargets(): (CombatTarget)[];
  }

  export class RoomAudience {
    getBroadcastTargets(): (CombatTarget)[];
  }

  export class WorldAudience {
    getBroadcastTargets(): (CombatTarget)[];
  }

  export class Channel {
    constructor(options: {
      name: string;
      aliases?: string[];
      color?: string[];
      description: string;
      audience: object;
      formatter: {
        sender: (sender: RanvierPlayer, target: object, message: string, colorify: (s: string) => string) => string;
        target: (sender: RanvierPlayer, target: object, message: string, colorify: (s: string) => string) => string;
      };
    });
  }

  export const EffectFlag: {
    readonly BUFF: symbol;
    readonly DEBUFF: symbol;
  };

  export class Heal {
    constructor(stat: string, amount: number, source: object, attacker: object, options?: object);
    commit(target: object): void;
  }

  export class Damage {
    constructor(stat: string, amount: number, attacker: object, source: object, options?: object);
    evaluate(target: object): number;
    commit(target: object): void;
  }

  export class Player extends RanvierPlayer {
    constructor(options: { name: string; account: RanvierAccount });
  }

  export const SkillType: {
    readonly SKILL: symbol;
    readonly SPELL: symbol;
  };

  export const SkillFlag: {
    readonly PASSIVE: symbol;
    readonly ACTIVE: symbol;
  };

  export const PlayerRoles: {
    readonly PLAYER: 0;
    readonly BUILDER: 1;
    readonly ADMIN: 2;
  };

  export const Config: {
    get(key: string, fallback?: any): any;
    load(data: object): void;
  };

  export const ResourceCost: {
    attribute: string;
    cost: number;
  }

  export const SkillConfig: {
    configureEffect?: (effect: Effect) => Effect;
    cooldown?: number | { group: string; length: number } | null;
    effect?: string | null;
    flags?: SkillFlag[];
    info?: (player: Player) => void;
    initiatesCombat?: boolean;
    name: string;
    requiresTarget?: boolean;
    resource?: ResourceCost | ResourceCost[] | null;
    run?: (...args: unknown[]) => unknown;
    targetSelf?: boolean;
    type?: SkillType;
    options?: Record<string, unknown>;
  }

  export class RanvierSkill {
    id: string;
    name: string;
    configureEffect: (effect: Effect) => Effect;
    cooldownGroup: string | null;
    cooldownLength: number | null;
    effect: string | null;
    flags: SkillFlag[];
    info: (player: Player) => void;
    initiatesCombat: boolean;
    options: Record<string, unknown>;
    requiresTarget: boolean;
    resource: ResourceCost | ResourceCost[] | null;
    run: (...args: unknown[]) => unknown;
    state: GameState;
    targetSelf: boolean;
    type: SkillType;

    constructor(id: string, config: SkillConfig, state: GameState);

    execute(args: string, player: Player, target: Character): boolean;
    payResourceCosts(player: Player): boolean;
    payResourceCost(player: Player, resource: ResourceCost): void;
    activate(player: Player): void;
    onCooldown(character: Character): Effect | false;
    cooldown(character: Character): void;
    getCooldownId(): string;
    hasEnoughResources(character: Character): boolean;
    hasEnoughResource(character: Character, resource: ResourceCost): boolean;
  }

  export class NotEnoughResourcesError extends Error {}
  export class PassiveError extends Error {}

  export class CooldownError extends Error {
    effect: Effect;
    constructor(effect: Effect);
  }

  export const ItemType: RanvierItemType

  export class Item extends RanvierItem {}

  export class Inventory extends Map {
    maxSize: number;
    isFull: boolean;
    constructor(init?: { items?: Array<Item>, max?: number });
    setMax(size: number): void;
    getMax(): number;
    addItem(item: Item): void;
    removeItem(item: Item): void;
    serialize(): object;
    hydrate(state: GameState, carriedBy: any): void;
  }

  export class InventoryFullError extends Error {}

  export class CommandManager<T extends { name: string; aliases?: string[] } = RanvierCommand> {
    get(name: string): T | undefined;
    add(command: T): void;
    remove(name: string): void;
    find(name: string, returnAlias?: false): T | undefined;
    find(name: string, returnAlias: true): { command: T; alias: string } | undefined;
  }

  export class EventUtil {
    static genWrite(socket: import('net').Socket): (str: string) => void;
    static genSay(socket: import('net').Socket): (str: string) => void;
  }

  export type CommandTypeValue = symbol;

  export const CommandType: {
    COMMAND:  CommandTypeValue;
    SKILL:    CommandTypeValue;
    CHANNEL:  CommandTypeValue;
    MOVEMENT: CommandTypeValue;
  };
}