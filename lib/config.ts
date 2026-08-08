import type { GameMode } from "@/lib/types";

/** Default game mode for new contests / feature flag fallback. */
export function getDefaultGameMode(): GameMode {
  const mode = process.env.GAME_MODE;
  return mode === "gladiator" ? "gladiator" : "classic";
}

export function isGladiatorMode(mode: GameMode): boolean {
  return mode === "gladiator";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const GLADIATOR_MULTIPLIER = 1.5;
