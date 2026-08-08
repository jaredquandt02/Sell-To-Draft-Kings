import type {
  InjuryStatus,
  LiveGameScore,
  PlayerWeeklyStats,
  StatsProvider,
} from "./types";

/**
 * Deterministic mock stats for local/dev and load tests when no paid
 * sports API key is configured. Seeded by external id + week.
 */
export const mockProvider: StatsProvider = {
  async getWeeklyStats(week, season): Promise<PlayerWeeklyStats[]> {
    // Generate plausible lines for common seeded external ids + a range
    const ids = Array.from({ length: 220 }, (_, i) => `nfl-${i + 1}`);
    return ids.map((playerExternalId) => {
      const seed = hash(`${playerExternalId}:${week}:${season}`);
      return {
        playerExternalId,
        week,
        season,
        passYards: (seed % 350) + 50,
        passTouchdowns: seed % 4,
        interceptions: seed % 3,
        rushYards: seed % 120,
        rushTouchdowns: seed % 2,
        receptions: seed % 9,
        receivingYards: seed % 140,
        receivingTouchdowns: seed % 2,
        fumblesLost: seed % 2 === 0 ? 0 : 1,
      };
    });
  },

  async getPlayerStatus(playerId): Promise<InjuryStatus> {
    const seed = hash(playerId);
    return {
      playerExternalId: playerId,
      designation: seed % 10 === 0 ? "out" : "healthy",
      description: null,
      updatedAt: new Date().toISOString(),
    };
  },

  async getLiveScores(week): Promise<LiveGameScore[]> {
    return [
      {
        gameExternalId: `mock-game-${week}-1`,
        homeTeam: "KC",
        awayTeam: "BUF",
        homeScore: 24,
        awayScore: 20,
        quarter: "final",
        clock: null,
      },
    ];
  },
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
