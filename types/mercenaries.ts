// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

import { RanvierItem, RanvierNpc } from ".";

export type MercStatus = 'EN_ROUTE' | 'STATIONED' | 'RETURNING' | 'FLEEING';

export type CurrencyKey = string; // e.g. "guild_marks"

// ---------------------------------------------------------------------------
// Registry entry
// ---------------------------------------------------------------------------

export interface MercenaryContract {
  contractId: string;
  mercRef: string;           // e.g. "mercs:sellsword"
  mercName: string;
  homeRoomId: string;        // room entity reference
  holderId: string;          // player name
  targetRoomId: string;      // room entity reference
  nextUpkeepAt: number;      // epoch ms
  expiresAt: number;         // epoch ms
  upkeepCost: number;
  upkeepCurrency: CurrencyKey;
  status: MercStatus;
  npcInstance: RanvierNpc | null;
  contractItem: RanvierItem | null;
  path: RoomPath;
  pathIndex: number;
  lastMoveAt: number;        // epoch ms
  lastClaimCheckAt: number;  // epoch ms
}

// Whatever MercPathfinder.computePath returns — adjust if you have the type
export type RoomPath = unknown[];

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

