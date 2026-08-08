/**
 * 1v1 matchup resolution within a pod. Pure functions — no I/O.
 */

export interface MatchupResult {
  userIdA: string;
  userIdB: string;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  isTie: boolean;
}

export function resolveMatchup(
  userIdA: string,
  scoreA: number,
  userIdB: string,
  scoreB: number,
): MatchupResult {
  const isTie = scoreA === scoreB;
  return {
    userIdA,
    userIdB,
    scoreA,
    scoreB,
    winnerId: isTie ? null : scoreA > scoreB ? userIdA : userIdB,
    isTie,
  };
}

/** Users eliminated this week are every loser; ties carry both forward. */
export function eliminatedUserIds(results: MatchupResult[]): string[] {
  return results
    .filter((r) => !r.isTie && r.winnerId)
    .map((r) => (r.winnerId === r.userIdA ? r.userIdB : r.userIdA));
}
