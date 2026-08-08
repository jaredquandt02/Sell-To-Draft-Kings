import type {
  InjuryStatus,
  LiveGameScore,
  PlayerWeeklyStats,
  StatsProvider,
} from "./types";

const BASE_URL = "https://api.mysportsfeeds.com/v2.1/pull/nfl";

function authHeader() {
  const token = Buffer.from(
    `${process.env.MYSPORTSFEEDS_API_KEY}:MYSPORTSFEEDS`,
  ).toString("base64");
  return { Authorization: `Basic ${token}` };
}

export const mySportsFeedsProvider: StatsProvider = {
  async getWeeklyStats(week, season): Promise<PlayerWeeklyStats[]> {
    const res = await fetch(
      `${BASE_URL}/${season}-regular/week/${week}/player_gamelogs.json`,
      { headers: authHeader() },
    );
    if (!res.ok) {
      throw new Error(`mysportsfeeds getWeeklyStats failed: ${res.status}`);
    }
    const body = await res.json();
    // TODO: map MySportsFeeds' response shape into PlayerWeeklyStats[].
    return mapWeeklyStats(body);
  },

  async getPlayerStatus(playerId): Promise<InjuryStatus> {
    const res = await fetch(`${BASE_URL}/injuries.json?player=${playerId}`, {
      headers: authHeader(),
    });
    if (!res.ok) {
      throw new Error(`mysportsfeeds getPlayerStatus failed: ${res.status}`);
    }
    const body = await res.json();
    // TODO: map MySportsFeeds' injury shape into InjuryStatus.
    return mapInjuryStatus(playerId, body);
  },

  async getLiveScores(week): Promise<LiveGameScore[]> {
    const res = await fetch(`${BASE_URL}/week/${week}/scoreboard.json`, {
      headers: authHeader(),
    });
    if (!res.ok) {
      throw new Error(`mysportsfeeds getLiveScores failed: ${res.status}`);
    }
    const body = await res.json();
    // TODO: map MySportsFeeds' scoreboard shape into LiveGameScore[].
    return mapLiveScores(body);
  },
};

function mapWeeklyStats(_body: unknown): PlayerWeeklyStats[] {
  throw new Error("mysportsfeeds mapWeeklyStats not yet implemented");
}

function mapInjuryStatus(_playerId: string, _body: unknown): InjuryStatus {
  throw new Error("mysportsfeeds mapInjuryStatus not yet implemented");
}

function mapLiveScores(_body: unknown): LiveGameScore[] {
  throw new Error("mysportsfeeds mapLiveScores not yet implemented");
}
