import { GameState } from './state';
import {
  FactionProfile,
  FactionStance,
  NamedIndex,
  WorldPath,
  MercRegistryEntry,
  PhaseInfo,
  RanvierNpc,
  RanvierPlayer
} from './primitives';

export interface TimeService {
  getTick(): number;
  getFormalTime(tick?: number): string;
  getMonth(tick?: number): NamedIndex;
  getDayOfWeek(tick?: number): NamedIndex;
  getDayOfMonth(tick?: number): number | null;
  getHour(tick?: number): number;
  getMinute(tick?: number): number;
  getMoonPhase(tick?: number): PhaseInfo;
  getDayPhase(tick?: number): PhaseInfo;
  getMoonSkyPosition(tick?: number): PhaseInfo;
  getTimePosition(tick?: number): string;
}

export interface FactionService {
  getFaction(id: number): object | null;
  getFactionIds(): number[];
  getProfile(playerId: string, factionId: number): Promise<FactionProfile | null>;
  applyEvent(playerId: string, factionId: number, event: string): Promise<{ profile: FactionProfile; action: string | null }>;
  getStance(playerId: string, factionId: number): Promise<FactionStance | null>;
  getFactionRelation(factionA: number, factionB: number): string | null;
  getFactionsForRoom(room: object): number[];
  executePolicy(policy: string, context: object): object | null;
}

export interface WorldManager {
  getTerrainForRoom(room: object): string | null;
  getFactionForRoom(room: object): number | null;
  getRoomsByFaction(factionId: number): object[];
  getClustersByFaction(factionId: number): number[];
  getEntryByCoords(x: number, y: number): object | null;
  getClusters(): object;
  getRoadPairs(): object[];
  getPath(from: number[], to: number[]): WorldPath | null;
  getPathBetweenClusters(fromCluster: number, toCluster: number): WorldPath | null;
  getDirection(from: number[], to: number[]): string | null;
  getClusterIndex(): Map<number, object>;
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