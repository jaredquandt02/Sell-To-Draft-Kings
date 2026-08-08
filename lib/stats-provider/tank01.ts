import type {
  InjuryStatus,
  LiveGameScore,
  PlayerWeeklyStats,
  StatsProvider,
} from "./types";

const BASE_URL = "https://tank01-fantasy-stats.p.rapidapi.com";

function headers() {
  return {
    "X-RapidAPI-Key": process.env.TANK01_API_KEY!,
    "X-RapidAPI-Host": "tank01-fantasy-stats.p.rapidapi.com",
  };
}

export const tank01Provider: StatsProvider = {
  async getWeeklyStats(week, season): Promise<PlayerWeeklyStats[]> {
    const res = await fetch(
      `${BASE_URL}/getNFLGamesForWeek?week=${week}&season=${season}`,
      { headers: headers() },
    );
    if (!res.ok) {
      throw new Error(`tank01 getWeeklyStats failed: ${res.status}`);
    }
    const body = await res.json();
    // TODO: map Tank01's response shape into PlayerWeeklyStats[].
    return mapWeeklyStats(body);
  },

  async getPlayerStatus(playerId): Promise<InjuryStatus> {
    const res = await fetch(
      `${BASE_URL}/getNFLPlayerInfo?playerID=${playerId}`,
      { headers: headers() },
    );
    if (!res.ok) {
      throw new Error(`tank01 getPlayerStatus failed: ${res.status}`);
    }
    const body = await res.json();
    // TODO: map Tank01's injury shape into InjuryStatus.
    return mapInjuryStatus(playerId, body);
  },

  async getLiveScores(week): Promise<LiveGameScore[]> {
    const res = await fetch(`${BASE_URL}/getNFLScoresOnly?week=${week}`, {
      headers: headers(),
    });
    if (!res.ok) {
      throw new Error(`tank01 getLiveScores failed: ${res.status}`);
    }
    const body = await res.json();
    // TODO: map Tank01's scoreboard shape into LiveGameScore[].
    return mapLiveScores(body);
  },
};

function mapWeeklyStats(_body: unknown): PlayerWeeklyStats[] {
  throw new Error("tank01 mapWeeklyStats not yet implemented");
}

function mapInjuryStatus(_playerId: string, _body: unknown): InjuryStatus {
  throw new Error("tank01 mapInjuryStatus not yet implemented");
}

function mapLiveScores(_body: unknown): LiveGameScore[] {
  throw new Error("tank01 mapLiveScores not yet implemented");
}
