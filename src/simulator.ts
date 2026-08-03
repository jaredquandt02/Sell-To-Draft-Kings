export type GladiatorStatus = "idle" | "running" | "complete";

export type GladiatorPlayer = {
  id: string;
  name: string;
  position: string;
  projectedPoints: number;
  salary: number;
};

export type SimulationResult = {
  seed: number;
  totalPoints: number;
  payoutEstimate: number;
  players: Array<GladiatorPlayer & { simulatedPoints: number }>;
};

export type SimulatorState = {
  status: GladiatorStatus;
  entryFee: number;
  players: GladiatorPlayer[];
  result: SimulationResult | null;
};

/** Seeded PRNG — same seed → same sim path. */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const STARTER_ROSTER: GladiatorPlayer[] = [
  { id: "p1", name: "A. Rodriguez", position: "PG", projectedPoints: 42.5, salary: 9800 },
  { id: "p2", name: "J. Mitchell", position: "SG", projectedPoints: 38.2, salary: 8600 },
  { id: "p3", name: "K. Thompson", position: "SF", projectedPoints: 35.8, salary: 7900 },
  { id: "p4", name: "D. Carter", position: "PF", projectedPoints: 31.4, salary: 7200 },
  { id: "p5", name: "M. Brooks", position: "C", projectedPoints: 28.9, salary: 6500 },
];

export function createInitialState(): SimulatorState {
  return {
    status: "idle",
    entryFee: 25,
    players: STARTER_ROSTER,
    result: null,
  };
}

/**
 * Core Gladiator sim: variance around projections, then a rough payout curve.
 * Swap this for real DK pricing / contest math later.
 */
export function runSimulation(
  players: GladiatorPlayer[],
  entryFee: number,
  seed = Date.now() % 1_000_000,
): SimulationResult {
  const rand = mulberry32(seed);

  const simulated = players.map((player) => {
    const noise = (rand() - 0.5) * 2 * (player.projectedPoints * 0.35);
    const simulatedPoints = Math.max(0, +(player.projectedPoints + noise).toFixed(1));
    return { ...player, simulatedPoints };
  });

  const totalPoints = +simulated
    .reduce((sum, p) => sum + p.simulatedPoints, 0)
    .toFixed(1);

  // Placeholder payout: above ~160 pts starts returning; scales with entry.
  const breakEven = 155;
  const edge = Math.max(0, totalPoints - breakEven);
  const payoutEstimate = +(entryFee * (edge / 12) ** 1.15).toFixed(2);

  return { seed, totalPoints, payoutEstimate, players: simulated };
}
