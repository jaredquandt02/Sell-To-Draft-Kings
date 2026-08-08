/**
 * Shared domain types, mirroring supabase/migrations/0001_core_schema.sql.
 *
 * `Database` is a placeholder for the Supabase client generics until the
 * real schema is generated with:
 *   supabase gen types typescript --local > lib/database.types.ts
 */
export type Database = Record<string, unknown>;

export type LeagueStatus = "drafting" | "active" | "phase2" | "complete";
export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST";

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface Season {
  id: string;
  name: string;
  startWeek: number;
  endWeek: number;
  status: "upcoming" | "active" | "complete";
}

export interface League {
  id: string;
  seasonId: string;
  entryFeeCredits: number;
  status: LeagueStatus;
}

export interface Pod {
  id: string;
  leagueId: string;
  podNumber: number;
}

export interface PodMember {
  podId: string;
  userId: string;
  rosterId: string;
  eliminatedAtWeek: number | null;
}

export interface Roster {
  id: string;
  userId: string;
  leagueId: string;
}

export interface RosterPlayer {
  rosterId: string;
  playerId: string;
  addedWeek: number;
  /** Enforcement point for the one-time-use gladiator rule. Null until used. */
  usedAsGladiatorWeek: number | null;
}

export interface Player {
  id: string;
  externalId: string;
  name: string;
  position: Position;
  nflTeam: string;
}

export interface Matchup {
  id: string;
  podId: string;
  week: number;
  userIdA: string;
  userIdB: string;
  winnerId: string | null;
}

export interface GladiatorPick {
  id: string;
  rosterPlayerId: string;
  userId: string;
  week: number;
  score: number;
  multiplierApplied: number;
}

export interface WeeklyScore {
  id: string;
  userId: string;
  week: number;
  points: number;
  cumulativePoints: number;
}

export interface MedicCardUse {
  id: string;
  userId: string;
  triggeredWeek: number;
  backupPlayerId: string;
}

export type TransactionType =
  | "entry_fee"
  | "payout"
  | "credit_grant"
  | "adjustment";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  credits: number;
  createdAt: string;
}
