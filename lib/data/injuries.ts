/**
 * Deterministic injury overlay for UI testing until a live injury feed
 * is wired. External ids match lib/data/nfl-players.ts.
 */
const ALWAYS_OUT = new Set([
  "nfl-2", // Josh Allen
  "nfl-25", // Christian McCaffrey (first RB after 24 QBs)
  "nfl-26",
  "nfl-40",
  "nfl-55",
  "nfl-70",
  "nfl-85",
]);

export function isInjuredExternalId(externalId: string): boolean {
  if (ALWAYS_OUT.has(externalId)) return true;
  let h = 0;
  for (let i = 0; i < externalId.length; i++) {
    h = (h * 31 + externalId.charCodeAt(i)) >>> 0;
  }
  return h % 11 === 0;
}
