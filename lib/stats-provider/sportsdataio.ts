import type {
  InjuryStatus,
  LiveGameScore,
  PlayerWeeklyStats,
  StatsProvider,
} from "./types";

const BASE_URL = "https://api.sportsdata.io/v3/nfl";

function headers() {
  return { "Ocp-Apim-Subscription-Key": process.env.SPORTSDATAIO_API_KEY! };
}

/**
 * Not wired up for v1 — this is the swap target for real-money launch
 * (see docs/ARCHITECTURE.md). Kept implementing the same interface so the
 * swap is an env change once real API access is provisioned.
 */
export const sportsDataIOProvider: StatsProvider = {
  async getWeeklyStats(week, season): Promise<PlayerWeeklyStats[]> {
    const res = await fetch(
      `${BASE_URL}/stats/json/PlayerGameStatsByWeek/${season}/${week}`,
      { headers: headers() },
    );
    if (!res.ok) {
      throw new Error(`sportsdataio getWeeklyStats failed: ${res.status}`);
    }
    const body = await res.json();
    // TODO: map SportsDataIO's response shape into PlayerWeeklyStats[].
    return mapWeeklyStats(body);
  },

  async getPlayerStatus(playerId): Promise<InjuryStatus> {
    const res = await fetch(`${BASE_URL}/scores/json/Injuries`, {
      headers: headers(),
    });
    if (!res.ok) {
      throw new Error(`sportsdataio getPlayerStatus failed: ${res.status}`);
    }
    const body = await res.json();
    // TODO: filter to playerId and map into InjuryStatus.
    return mapInjuryStatus(playerId, body);
  },

  async getLiveScores(week): Promise<LiveGameScore[]> {
    const res = await fetch(`${BASE_URL}/scores/json/ScoresByWeek/${week}`, {
      headers: headers(),
    });
    if (!res.ok) {
      throw new Error(`sportsdataio getLiveScores failed: ${res.status}`);
    }
    const body = await res.json();
    // TODO: map SportsDataIO's scoreboard shape into LiveGameScore[].
    return mapLiveScores(body);
  },
};

function mapWeeklyStats(_body: unknown): PlayerWeeklyStats[] {
  throw new Error("sportsdataio mapWeeklyStats not yet implemented");
}

function mapInjuryStatus(_playerId: string, _body: unknown): InjuryStatus {
  throw new Error("sportsdataio mapInjuryStatus not yet implemented");
}

function mapLiveScores(_body: unknown): LiveGameScore[] {
  throw new Error("sportsdataio mapLiveScores not yet implemented");
}
