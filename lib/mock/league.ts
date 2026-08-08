/**
 * In-memory fixture data run through the real lib/game-engine functions.
 *
 * There's no Supabase data yet, so this stands in for the DB just to give
 * the UI something real to render and exercise. Nothing here is persisted —
 * swap this module out once server actions / queries exist.
 */
import { assignPods, snakeDraftOrder } from "@/lib/game-engine/pods";
import { resolveMatchup, eliminatedUserIds } from "@/lib/game-engine/elimination";
import { scoreStatLine, applyGladiatorMultiplier, type StatLine } from "@/lib/game-engine/scoring";
import type { Player, User } from "@/lib/types";

export const LEAGUE_ID = "demo-league";
export const POD_ID = "pod-1";
export const WEEK = 1;
export const CURRENT_USER_ID = "u1";

/** Not defined anywhere in lib/game-engine yet — assumed for this demo. */
export const GLADIATOR_MULTIPLIER = 1.5;

export const users: User[] = Array.from({ length: 12 }, (_, i) => ({
  id: `u${i + 1}`,
  email: `player${i + 1}@example.com`,
  displayName: [
    "Jared Q.", "Sam R.", "Morgan T.", "Casey L.", "Devon K.", "Riley M.",
    "Avery S.", "Jordan B.", "Quinn P.", "Reese N.", "Skyler F.", "Emerson G.",
  ][i],
  createdAt: "2026-08-01T00:00:00.000Z",
}));

export const players: Player[] = [
  { id: "p1", externalId: "ext-p1", name: "Jalen Rourke", position: "QB", nflTeam: "DAL" },
  { id: "p2", externalId: "ext-p2", name: "Micah Sten", position: "QB", nflTeam: "KC" },
  { id: "p3", externalId: "ext-p3", name: "Derek Vance", position: "QB", nflTeam: "BUF" },
  { id: "p4", externalId: "ext-p4", name: "Owen Trask", position: "QB", nflTeam: "MIA" },
  { id: "p5", externalId: "ext-p5", name: "Trey Dawkins", position: "RB", nflTeam: "SF" },
  { id: "p6", externalId: "ext-p6", name: "Marcus Voss", position: "RB", nflTeam: "PHI" },
  { id: "p7", externalId: "ext-p7", name: "Isaiah Kern", position: "RB", nflTeam: "DET" },
  { id: "p8", externalId: "ext-p8", name: "Chris Boland", position: "RB", nflTeam: "BAL" },
  { id: "p9", externalId: "ext-p9", name: "Andre Wexler", position: "RB", nflTeam: "GB" },
  { id: "p10", externalId: "ext-p10", name: "Nate Corbin", position: "RB", nflTeam: "CIN" },
  { id: "p11", externalId: "ext-p11", name: "Devon Lark", position: "WR", nflTeam: "MIN" },
  { id: "p12", externalId: "ext-p12", name: "Jamal Ostro", position: "WR", nflTeam: "LAC" },
  { id: "p13", externalId: "ext-p13", name: "Tyrell Finch", position: "WR", nflTeam: "SEA" },
  { id: "p14", externalId: "ext-p14", name: "Cole Bryant", position: "WR", nflTeam: "NYJ" },
  { id: "p15", externalId: "ext-p15", name: "Xavier Drummond", position: "WR", nflTeam: "LV" },
  { id: "p16", externalId: "ext-p16", name: "Reggie Coats", position: "WR", nflTeam: "CAR" },
  { id: "p17", externalId: "ext-p17", name: "Blake Sorrento", position: "TE", nflTeam: "ATL" },
  { id: "p18", externalId: "ext-p18", name: "Marcus Adeyemi", position: "TE", nflTeam: "NE" },
  { id: "p19", externalId: "ext-p19", name: "Petr Nowicki", position: "K", nflTeam: "CHI" },
  { id: "p20", externalId: "ext-p20", name: "Salvatore Reyna", position: "K", nflTeam: "ARI" },
  { id: "p21", externalId: "ext-p21", name: "Houston Defense", position: "DST", nflTeam: "HOU" },
  { id: "p22", externalId: "ext-p22", name: "Denver Defense", position: "DST", nflTeam: "DEN" },
];

const playerById = new Map(players.map((p) => [p.id, p]));
export function getPlayer(playerId: string): Player {
  const player = playerById.get(playerId);
  if (!player) throw new Error(`unknown mock player id: ${playerId}`);
  return player;
}

/** userId -> every player on that roster (starter first). */
export const rosters: Record<string, string[]> = {
  u1: ["p1", "p9", "p15"],
  u2: ["p2"],
  u3: ["p6"],
  u4: ["p7"],
  u5: ["p11"],
  u6: ["p12"],
  u7: ["p3"],
  u8: ["p4"],
  u9: ["p8"],
  u10: ["p5"],
  u11: ["p13"],
  u12: ["p14"],
};

/** userId -> this week's starting player (first roster slot for everyone but you). */
export const starterByUser: Record<string, string> = Object.fromEntries(
  Object.entries(rosters).map(([userId, playerIds]) => [userId, playerIds[0]]),
);

/** Week 1 stat lines, keyed by playerId, for every rostered player. */
export const statLines: Record<string, StatLine> = {
  p1: { passYards: 285, passTouchdowns: 3, interceptions: 1 },
  p2: { passYards: 240, passTouchdowns: 1, interceptions: 1 },
  p3: { passYards: 310, passTouchdowns: 2, interceptions: 0 },
  p4: { passYards: 190, passTouchdowns: 1, interceptions: 2 },
  p5: { rushYards: 95, rushTouchdowns: 1, receptions: 3, receivingYards: 22 },
  p6: { rushYards: 60, rushTouchdowns: 0, receptions: 5, receivingYards: 38 },
  p7: { rushYards: 130, rushTouchdowns: 2, receptions: 1, receivingYards: 5 },
  p8: { rushYards: 45, rushTouchdowns: 0, receptions: 2, receivingYards: 15, fumblesLost: 1 },
  p9: { rushYards: 70, rushTouchdowns: 1, receptions: 2, receivingYards: 10 },
  p11: { receptions: 8, receivingYards: 110, receivingTouchdowns: 1 },
  p12: { receptions: 4, receivingYards: 55, receivingTouchdowns: 0 },
  p13: { receptions: 6, receivingYards: 90, receivingTouchdowns: 1 },
  p14: { receptions: 3, receivingYards: 40, receivingTouchdowns: 0 },
  p15: { receptions: 5, receivingYards: 65, receivingTouchdowns: 1 },
};

export function weeklyPoints(userId: string): number {
  const starterId = starterByUser[userId];
  const stats = statLines[starterId];
  return stats ? scoreStatLine(stats) : 0;
}

/** Marks your starting QB as banged up so the Medic Card flow has something to demo. */
export const injuredPlayerIds = new Set(["p1"]);
export function isInjured(playerId: string): boolean {
  return injuredPlayerIds.has(playerId);
}

/** userId -> whether they've used their season's one Medic Card yet. */
export const hasUsedMedicCardByUser: Record<string, boolean> = { u1: false };

/** userId -> whether they've made this week's gladiator pick yet (drives the Dashboard to-do list). */
export const hasMadeGladiatorPickByUser: Record<string, boolean> = { u1: false };

const rosteredPlayerIds = new Set(Object.values(rosters).flat());
export const availablePlayers: Player[] = players.filter((p) => !rosteredPlayerIds.has(p.id));

export const pods = assignPods(
  users.map((u) => u.id),
  6,
);
export const yourPod = pods.find((pod) => pod.userIds.includes(CURRENT_USER_ID))!;

export const yourPodDraftOrder = snakeDraftOrder(yourPod.userIds, 3);

function pairMatchups(podUserIds: string[]) {
  const pairs: [string, string][] = [];
  for (let i = 0; i < podUserIds.length; i += 2) {
    pairs.push([podUserIds[i], podUserIds[i + 1]]);
  }
  return pairs.map(([a, b]) => resolveMatchup(a, weeklyPoints(a), b, weeklyPoints(b)));
}

export const podMatchups = pods.map((pod) => ({
  podNumber: pod.podNumber,
  results: pairMatchups(pod.userIds),
}));

export const yourPodMatchups = podMatchups.find((m) => m.podNumber === yourPod.podNumber)!.results;
export const yourPodEliminated = eliminatedUserIds(yourPodMatchups);

export function displayName(userId: string): string {
  return users.find((u) => u.id === userId)?.displayName ?? userId;
}

export const standings = users
  .map((u) => ({
    userId: u.id,
    displayName: u.displayName,
    cumulativePoints: weeklyPoints(u.id),
  }))
  .sort((a, b) => b.cumulativePoints - a.cumulativePoints);

export function gladiatorPreview(playerId: string) {
  const stats = statLines[playerId];
  const base = stats ? scoreStatLine(stats) : 0;
  return { base, withMultiplier: applyGladiatorMultiplier(base, GLADIATOR_MULTIPLIER) };
}
