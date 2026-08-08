/**
 * Phase 2 median-cut mechanic and tie handling. Pure functions — no I/O.
 */

export function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error("median() requires at least one value");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export interface StandingsEntry {
  userId: string;
  cumulativePoints: number;
}

/**
 * Users at or below the field median are cut. Ties AT the median all
 * survive (cutting only strictly-below avoids arbitrary coin-flips).
 */
export function usersCutByMedian(standings: StandingsEntry[]): string[] {
  const med = median(standings.map((s) => s.cumulativePoints));
  return standings
    .filter((s) => s.cumulativePoints < med)
    .map((s) => s.userId);
}
