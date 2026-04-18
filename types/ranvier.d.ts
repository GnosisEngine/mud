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

export interface RanvierArea {
  name: string;
  title: string;
  rooms: Map<string, RanvierRoom>;
  getRoomAtCoordinates(x: number, y: number, z: number): RanvierRoom
}

export interface RanvierDoor {
  locked: boolean;
  closed: boolean;
  lockedBy?: string;
}
export interface RanvierRoom {
  entityReference: string;
  title: string;
  description: string;
  area: RanvierArea;
  players: Set<RanvierPlayer>;
  npcs: Set<RanvierNpc>;
  items: Set<RanvierItem>;
  coordinates: { x: number, y: number, z: number } | null;
  emit(event: string, ...args: any[]): void;
  getExits(): RanvierExit[];
  getDoor(room: RavnierRoom): RanvierDoor
  removeItem(item: RanvierItem): void
}

export interface RanvierCharacter extends NodeJS.EventEmitter {
  name: string;
  level: number;
  room: RanvierRoom;
  inventory: Map<string, RanvierItem>;
  equipment: Map<string, RanvierItem>;
  combatants: Set<CombatTarget>;
  combatData: {
    killed?: boolean;
    killedBy?: CombatTarget;
    roundStarted?: number;
    lag?: number;
  };
  effects: { entries(): RanvierEffect[] };
  followers: Set<CombatTarget>;
  following: CombatTarget | null;
  party: object | null;
  metadata: Record<string, any>;
  isNpc: boolean;

  // Metadatable
  getMeta(key: string): any;
  setMeta(key: string, value: any): void;

  // Attribute methods
  hasAttribute(attr: string): boolean;
  getAttribute(attr: string): number;
  getMaxAttribute(attr: string): number;
  getBaseAttribute(attr: string): number;
  raiseAttribute(attr: string, amount: number): void;
  lowerAttribute(attr: string, amount: number): void;
  setAttributeBase(attr: string, value: number): void;
  setAttributeToMax(attr: string): void;
  addAttribute(attr: object): void;

  // Combat methods
  isInCombat(): boolean;
  initiateCombat(target: CombatTarget): void;
  addCombatant(target: CombatTarget): void;
  removeCombatant(target: CombatTarget): void;
  removeFromCombat(): void;
  evaluateIncomingDamage(damage: object, currentAmount: number): number;
  evaluateOutgoingDamage(damage: object, currentAmount: number): number;

  // Effect methods
  hasEffectType(type: string): boolean;
  addEffect(effect: object): boolean;
  removeEffect(effect: object): void;

  // Inventory methods
  addItem(item: RanvierItem): void;
  removeItem(item: RanvierItem): void;
  hasItem(item: RanvierItem): boolean;
  isInventoryFull(): boolean;
  equip(item: RanvierItem, slot: string): void;
  unequip(slot: string): void;

  // Follow methods
  follow(target: CombatTarget): void;
  unfollow(): void;
  isFollowing(target: CombatTarget): boolean;
  hasFollower(target: CombatTarget): boolean;
  addFollower(target: CombatTarget): void;
  removeFollower(target: CombatTarget): void;

  emit(event: string, ...args: any[]): void;
  getBroadcastTargets(): (CombatTarget)[];
  hydrate(state: object): void;
  serialize(): object;

  // Faction stuff
  _factionAttackTarget: CombatTarget
  _factionAttackTimer: NodeJS.Timeout
  _factionEventHandler?: (payload: any) => Promise<void>;

  moveTo(room: RanvierRoom, done: () => void): void
  keywords: string[];
  initiateCombat(target: CombatTarget): void
  removeFromCombat(): void

  getMeta(key: string): string | boolean | number | null
  setMeta(key: string, value: string | boolean | number | null): void

  room: RanvierRoom
}

export interface RanvierPlayer extends RanvierCharacter {
  account: object;
  prompt: string;
  queueCommand(command: { execute: (...args: any[]) => void, label: string }, lag: number): void;
  removePrompt(id: string): void;
  addPrompt(id: string, fn: () => string): void;
  hasPrompt(id: string): boolean;
  save(): void
  playerClass: {
    id: string;
    name: string;
    config: { name: string, abilityTable: Record<number, { skills?: string[], spells?: string[] }> };
    abilityTable: Record<number, { skills?: string[], spells?: string[] }>;
    abilityList: string[];
    hasAbility(id: string): boolean;
    canUseAbility(player: RanvierPlayer, abilityId: string): boolean;
    getAbilitiesForPlayer(player: RanvierPlayer): string[];
    setupPlayer(state: GameState, player: RanvierPlayer): void;
  };
}

export interface RanvierNpc extends RanvierCharacter {
  entityReference: string;
  behaviors: Map<string, any>;
  description: string;
  hasBehavior(name: string): boolean;
}

export interface RanvierItem {
  entityReference: string;
  name: string;
  roomDesc: string;
  description: string;
  type: string;
  keywords: string[];
  metadata: {
    minDamage?: number;
    maxDamage?: number;
    speed?: number;
    [key: string]: any;
  };
}
export interface RanvierExit {
  direction: string;
  roomId: string;
  name?: string;
  keywords?: string[];
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
}

export type CombatTarget = RanvierPlayer | RanvierNpc

export interface RanvierCommand {
  name: string;
  command: (state: GameState) => (args: string, player: RanvierPlayer) => void;
}

declare module 'ranvier' {
  export const Logger: RanvierLogger;
  export const Broadcast: RanvierBroadcast;
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

  export class Player {
    constructor(data: object);
    queueCommand(command: { execute: (...args: any[]) => void, label: string }, lag: number): void;
    emit(event: string, ...args: any[]): void;
    moveTo(room: object, callback?: () => void): void;
    save(callback?: () => void): void;
    hydrate(state: object): void;
    serialize(): object;
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

  export const ItemType: {
    readonly OBJECT: 1;
    readonly CONTAINER: 2;
    readonly ARMOR: 3;
    readonly WEAPON: 4;
    readonly POTION: 5;
    readonly RESOURCE: 6;
  };

  export class Item {
    uuid: string;
    name: string;
    entityReference: string;
    carriedBy: any;
    inventory?: Inventory;
    type: ItemType
    serialize(): object;
    hydrate(state: GameState, data: object): void;
    initializeInventory(inv: object): void;
  }

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

  export class CommandManager {
    get(name: string): RanvierCommand | undefined;
    add(command: RanvierCommand): void;
    remove(name: string): void;
    find(name: string): RanvierCommand | undefined;
  }
}