import type { StatsProvider } from "./types";
import { tank01Provider } from "./tank01";
import { mySportsFeedsProvider } from "./mysportsfeeds";
import { sportsDataIOProvider } from "./sportsdataio";

const providers: Record<string, StatsProvider> = {
  tank01: tank01Provider,
  mysportsfeeds: mySportsFeedsProvider,
  sportsdataio: sportsDataIOProvider,
};

const providerName = process.env.STATS_PROVIDER ?? "tank01";
const provider = providers[providerName];

if (!provider) {
  throw new Error(
    `Unknown STATS_PROVIDER "${providerName}". Expected one of: ${Object.keys(providers).join(", ")}`,
  );
}

/**
 * The active stats provider, selected by STATS_PROVIDER. Import this —
 * never import a provider file directly — so swapping providers is an env
 * change, not a rewrite.
 */
export const statsProvider: StatsProvider = provider;

export type {
  StatsProvider,
  PlayerWeeklyStats,
  InjuryStatus,
  InjuryDesignation,
  LiveGameScore,
} from "./types";
