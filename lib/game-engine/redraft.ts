/**
 * Waiver pick-order logic for the redraft/replacement flow after eliminations.
 * Pure functions — no I/O.
 */

/**
 * Worst-record-first waiver order, tiebroken by lowest cumulative points
 * (rewards struggling teams first, consistent with a loser's-waiver model).
 */
export function waiverOrder(
  standings: Array<{ userId: string; wins: number; cumulativePoints: number }>,
): string[] {
  return [...standings]
    .sort((a, b) => {
      if (a.wins !== b.wins) return a.wins - b.wins;
      return a.cumulativePoints - b.cumulativePoints;
    })
    .map((s) => s.userId);
}
