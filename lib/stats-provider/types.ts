import type { Position } from "@/lib/types";

export interface PlayerWeeklyStats {
  playerExternalId: string;
  week: number;
  season: number;
  passYards: number;
  passTouchdowns: number;
  interceptions: number;
  rushYards: number;
  rushTouchdowns: number;
  receptions: number;
  receivingYards: number;
  receivingTouchdowns: number;
  fumblesLost: number;
}

export type InjuryDesignation =
  | "healthy"
  | "questionable"
  | "doubtful"
  | "out"
  | "ir";

export interface InjuryStatus {
  playerExternalId: string;
  designation: InjuryDesignation;
  description: string | null;
  updatedAt: string;
}

export interface LiveGameScore {
  gameExternalId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  quarter: number | "final";
  clock: string | null;
}

/**
 * Contract every stats provider implements. Nothing outside
 * lib/stats-provider/ should import a provider file directly — go through
 * index.ts so swapping providers is an env change, not a rewrite.
 */
export interface StatsProvider {
  getWeeklyStats(week: number, season: number): Promise<PlayerWeeklyStats[]>;
  getPlayerStatus(playerId: string): Promise<InjuryStatus>;
  getLiveScores(week: number): Promise<LiveGameScore[]>;
}

/** Re-exported for provider implementations mapping position strings. */
export type { Position };
