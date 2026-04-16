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
}

export interface RanvierCharacter {
  name: string;
  level: number;
  room: RanvierRoom;
  inventory: Map<string, RanvierItem>;
  emit(event: string, ...args: any[]): void;
  say(message: string): void;
  effects: { entries(): Iterable<RanvierEffect> };
}

export interface RanvierPlayer extends RanvierCharacter {
  account: object;
  prompt: string;
  keywords: string[];
  queueCommand(command: { execute: (...args: any[]) => void, label: string }, lag: number): void;
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
  keywords: string[];
  effects: { entries(): Iterable<RanvierEffect> };
}

export interface RanvierItem {
  entityReference: string;
  name: string;
  roomDesc: string;
  description: string;
  type: string;
  metadata: object;
  keywords: string[];
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
  center(width: number, text: string, color: string, char?: string): string
}

declare module 'ranvier' {
  export const Logger: RanvierLogger;
  export const Broadcast: RanvierBroadcast;
  export class AreaAudience {
    sender: RanvierPlayer | RanvierNpc;
    state: import('../types/state').GameState;
    getBroadcastTargets(): (RanvierPlayer | RanvierNpc)[];
  }

  export class PartyAudience {
    getBroadcastTargets(): (RanvierPlayer | RanvierNpc)[];
  }

  export class PrivateAudience {
    getBroadcastTargets(): (RanvierPlayer | RanvierNpc)[];
  }

  export class RoomAudience {
    getBroadcastTargets(): (RanvierPlayer | RanvierNpc)[];
  }

  export class WorldAudience {
    getBroadcastTargets(): (RanvierPlayer | RanvierNpc)[];
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
}