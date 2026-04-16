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
}

export interface RanvierPlayer extends RanvierCharacter {
  account: object;
  prompt: string;
  keywords: string[];
}

export interface RanvierNpc extends RanvierCharacter {
  entityReference: string;
  behaviors: Map<string, any>;
  description: string;
  keywords: string[];
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
}

declare module 'ranvier' {
  export const Logger: RanvierLogger;
  export const Broadcast: RanvierBroadcast;
}