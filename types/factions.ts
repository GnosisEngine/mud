// --- Supporting types ---

import { RanvierRoom } from "./primitives";

export interface FactionDef {
  policies:        Record<string, string>;       // situation → policyName
  factionRelations: Record<number, string>;      // factionId → relation string
  [key: string]:   unknown;
}

export interface FactionProfile {
  axes:       Record<string, number>;
  brackets:   Record<string, string>;
  renown:     number;
  isStranger: boolean;
}

export interface FactionStance {
  brackets:   Record<string, string>;
  renown:     number;
  isStranger: boolean;
}

export interface FactionPolicyContext {
  player:  unknown;
  faction: FactionDef;
  profile: FactionProfile;
  room:    RanvierRoom;
  state:   unknown;
}

export interface FactionApplyEventResult {
  profile: FactionProfile  | null;
  action:  string | null;
}

// --- Store interface ---

export interface FactionStore {
  get(playerId: string, factionId: number): unknown;
  upsertDelta(playerId: string, factionId: number, deltas: unknown, now: number): void;
  logEvent(eventId: string, playerId: string, factionId: number, eventType: string, deltas: unknown, now: number): void;
}

// --- Service interface ---

export interface FactionManager {
  getFaction(factionId: number): FactionDef | null;
  getFactionIds(): number[];

  getProfile(playerId: string, factionId: number): Promise<FactionProfile | null>;
  getStance(playerId: string, factionId: number): Promise<FactionStance | null>;

  applyEvent(playerId: string, factionId: number, eventType: string): Promise<FactionApplyEventResult>;

  getFactionRelation(factionIdA: number, factionIdB: number): string | null;
  getFactionsForRoom(room: RanvierRoom): number[];
  executePolicy(policyName: string, ctx: FactionPolicyContext): unknown | null;
}

// --- Builder ---

export type FactionServiceBuilder = (
  factionMap: Map<number, FactionDef>,
  store:      FactionStore,
  policyMap:  Map<string, (ctx: FactionPolicyContext) => unknown>
) => FactionManager;

// --- Row shapes returned from SQL ---

export interface ReputationRow {
  player_id:  string;
  faction_id: number;
  affinity:   number;
  honor:      number;
  trust:      number;
  debt:       number;
  updated_at: number;
}

export interface ReputationEventRow {
  id:             string;
  player_id:      string;
  faction_id:     number;
  event_type:     string;
  affinity_delta: number;
  honor_delta:    number;
  trust_delta:    number;
  debt_delta:     number;
  ts:             number;
}

// --- Axis deltas (all optional — omitted axes default to 0) ---

export interface ReputationDeltas {
  affinity?: number;
  honor?:    number;
  trust?:    number;
  debt?:     number;
}

// --- Store interface ---

export interface ReputationStore {
  get(playerId: string, factionId: number): ReputationRow | null;

  upsertDelta(
    playerId:  string,
    factionId: number,
    deltas:    ReputationDeltas,
    now:       number
  ): void;

  logEvent(
    id:        string,
    playerId:  string,
    factionId: number,
    eventType: string,
    deltas:    ReputationDeltas,
    now:       number
  ): void;

  getHistory(playerId: string, factionId: number): ReputationEventRow[];
  getAllForPlayer(playerId: string): ReputationRow[];

  close(): void;
}

// --- Static factory ---

export interface ReputationStoreConstructor {
  create(dataDir: string): Promise<ReputationStore>;
}