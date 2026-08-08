/**
 * Fantasy point calculation. Pure functions — no I/O.
 */

export interface StatLine {
  passYards?: number;
  passTouchdowns?: number;
  interceptions?: number;
  rushYards?: number;
  rushTouchdowns?: number;
  receptions?: number;
  receivingYards?: number;
  receivingTouchdowns?: number;
  fumblesLost?: number;
}

/** Standard PPR scoring rules. */
export const PPR_SCORING = {
  passYardsPerPoint: 25,
  passTouchdown: 4,
  interception: -2,
  rushYardsPerPoint: 10,
  rushTouchdown: 6,
  reception: 1,
  receivingYardsPerPoint: 10,
  receivingTouchdown: 6,
  fumbleLost: -2,
} as const;

export function scoreStatLine(
  stats: StatLine,
  rules: typeof PPR_SCORING = PPR_SCORING,
): number {
  const points =
    (stats.passYards ?? 0) / rules.passYardsPerPoint +
    (stats.passTouchdowns ?? 0) * rules.passTouchdown +
    (stats.interceptions ?? 0) * rules.interception +
    (stats.rushYards ?? 0) / rules.rushYardsPerPoint +
    (stats.rushTouchdowns ?? 0) * rules.rushTouchdown +
    (stats.receptions ?? 0) * rules.reception +
    (stats.receivingYards ?? 0) / rules.receivingYardsPerPoint +
    (stats.receivingTouchdowns ?? 0) * rules.receivingTouchdown +
    (stats.fumblesLost ?? 0) * rules.fumbleLost;

  return +points.toFixed(2);
}

/** Applies the gladiator-week multiplier to a base score. */
export function applyGladiatorMultiplier(
  baseScore: number,
  multiplier: number,
): number {
  return +(baseScore * multiplier).toFixed(2);
}
