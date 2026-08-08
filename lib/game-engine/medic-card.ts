/**
 * Injury substitution logic (Medic Card). Pure functions — no I/O.
 */

export interface RosterSlot {
  playerId: string;
  isInjured: boolean;
}

/**
 * Whether a user may trigger their Medic Card this week: they haven't used
 * it yet this season and at least one starter is injured.
 */
export function canTriggerMedicCard(
  hasUsedMedicCard: boolean,
  starters: RosterSlot[],
): boolean {
  return !hasUsedMedicCard && starters.some((s) => s.isInjured);
}

/** Swaps an injured starter for a backup from the bench. */
export function applyMedicCard(
  starters: RosterSlot[],
  injuredPlayerId: string,
  backupPlayerId: string,
): RosterSlot[] {
  const target = starters.find((s) => s.playerId === injuredPlayerId);
  if (!target) {
    throw new Error(`${injuredPlayerId} is not a current starter`);
  }
  if (!target.isInjured) {
    throw new Error(`${injuredPlayerId} is not marked injured`);
  }

  return starters.map((s) =>
    s.playerId === injuredPlayerId
      ? { playerId: backupPlayerId, isInjured: false }
      : s,
  );
}
