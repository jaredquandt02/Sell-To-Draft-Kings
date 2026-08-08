/**
 * Shared domain types, mirroring supabase migrations.
 *
 * Generate typed Database with:
 *   supabase gen types typescript --local > lib/database.types.ts
 */

export type ContestStatus =
  | "open"
  | "drafting"
  | "active"
  | "phase2"
  | "complete";

export type GameMode = "classic" | "gladiator";
export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST";

/** @deprecated Use ContestStatus — leagues renamed to contests. */
export type LeagueStatus = ContestStatus;

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

export interface Contest {
  id: string;
  seasonId: string;
  name: string;
  entryFeeCredits: number;
  maxEntrants: number;
  podSize: number;
  gameMode: GameMode;
  status: ContestStatus;
  currentWeek: number;
  lockAt: string | null;
  draftRounds: number;
}

/** @deprecated Use Contest */
export type League = Contest;

export interface ContestEntry {
  id: string;
  contestId: string;
  userId: string;
  enteredAt: string;
}

export interface Pod {
  id: string;
  contestId: string;
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
  contestId: string;
}

export interface RosterPlayer {
  id?: string;
  rosterId: string;
  playerId: string;
  addedWeek: number;
  usedAsGladiatorWeek: number | null;
  isStarter: boolean;
  slotOrder: number;
}

export interface Player {
  id: string;
  externalId: string;
  name: string;
  position: Position;
  nflTeam: string;
}

export interface DraftPick {
  id: string;
  contestId: string;
  podId: string;
  pickNumber: number;
  userId: string;
  playerId: string | null;
  pickedAt: string | null;
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
  contestId: string;
  rosterPlayerId: string;
  userId: string;
  week: number;
  score: number;
  multiplierApplied: number;
}

export interface WeeklyScore {
  id: string;
  contestId: string;
  userId: string;
  week: number;
  points: number;
  cumulativePoints: number;
}

export interface MedicCardUse {
  id: string;
  contestId: string;
  userId: string;
  triggeredWeek: number;
  backupPlayerId: string;
}

export interface WaiverClaim {
  id: string;
  contestId: string;
  userId: string;
  addPlayerId: string;
  dropPlayerId: string | null;
  status: "pending" | "fulfilled" | "cancelled";
  createdAt: string;
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

export type ContestJobType =
  | "podding"
  | "scoring"
  | "elimination"
  | "phase2_cuts"
  | "waivers"
  | "lock";

export interface ContestJob {
  id: string;
  contestId: string | null;
  jobType: ContestJobType;
  week: number | null;
  status: "running" | "succeeded" | "failed";
  startedAt: string;
  finishedAt: string | null;
  rowsAffected: number;
  error: string | null;
  idempotencyKey: string;
}
