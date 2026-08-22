import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config";
import type { Contest, Player, User } from "@/lib/types";

export const getSessionUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const metaName = typeof meta?.display_name === "string" ? meta.display_name : null;

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: metaName || user.email?.split("@")[0] || "Player",
    createdAt: user.created_at ?? new Date().toISOString(),
  };
});

export const getCreditBalance = cache(async (userId: string): Promise<number> => {
  if (!isSupabaseConfigured()) return 1000;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("user_credit_balance", {
    p_user_id: userId,
  });
  if (error) return 0;
  return Number(data ?? 0);
});

export function mapContest(row: Record<string, unknown>): Contest {
  return {
    id: String(row.id),
    seasonId: String(row.season_id),
    name: String(row.name ?? "Contest"),
    entryFeeCredits: Number(row.entry_fee_credits ?? 0),
    maxEntrants: Number(row.max_entrants ?? 12),
    podSize: Number(row.pod_size ?? 6),
    gameMode: row.game_mode === "gladiator" ? "gladiator" : "classic",
    status: row.status as Contest["status"],
    currentWeek: Number(row.current_week ?? 1),
    lockAt: row.lock_at ? String(row.lock_at) : null,
    draftRounds: Number(row.draft_rounds ?? 5),
  };
}

const DEMO_CONTESTS: Array<Contest & { entrantCount: number }> = [
  {
    id: "demo-classic",
    seasonId: "demo-season",
    name: "Week 1 Public Classic (demo)",
    entryFeeCredits: 100,
    maxEntrants: 12,
    podSize: 6,
    gameMode: "classic",
    status: "open",
    currentWeek: 1,
    lockAt: null,
    draftRounds: 5,
    entrantCount: 3,
  },
  {
    id: "demo-gladiator",
    seasonId: "demo-season",
    name: "Gladiator Open Field (demo)",
    entryFeeCredits: 250,
    maxEntrants: 48,
    podSize: 6,
    gameMode: "gladiator",
    status: "open",
    currentWeek: 1,
    lockAt: null,
    draftRounds: 5,
    entrantCount: 0,
  },
];

const fetchOpenContestsCached = unstable_cache(
  async (): Promise<Array<Contest & { entrantCount: number }>> => {
    const admin = createAdminClient();
    const { data: contests, error } = await admin
      .from("contests")
      .select("*")
      .in("status", ["open", "drafting", "active", "phase2"])
      .order("name");
    if (error || !contests) return [];
    const rows = contests as Record<string, unknown>[];
    const ids = rows.map((row) => String(row.id));
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: entries } = await admin.from("contest_entries").select("contest_id").in("contest_id", ids);
      for (const entry of (entries ?? []) as Array<{ contest_id: string }>) {
        counts.set(entry.contest_id, (counts.get(entry.contest_id) ?? 0) + 1);
      }
    }
    return rows.map((row) => ({
      ...mapContest(row),
      entrantCount: counts.get(String(row.id)) ?? 0,
    }));
  },
  ["open-contests-v1"],
  { revalidate: 20 },
);

export const listOpenContests = cache(async (): Promise<Array<Contest & { entrantCount: number }>> => {
  if (!isSupabaseConfigured()) return DEMO_CONTESTS;
  return fetchOpenContestsCached();
});

const fetchContestCached = unstable_cache(
  async (contestId: string): Promise<Contest | null> => {
    const admin = createAdminClient();
    const { data } = await admin.from("contests").select("*").eq("id", contestId).maybeSingle();
    if (!data) return null;
    return mapContest(data as Record<string, unknown>);
  },
  ["contest-by-id-v1"],
  { revalidate: 30 },
);

export const getContest = cache(async (contestId: string): Promise<Contest | null> => {
  if (!isSupabaseConfigured()) {
    return (await listOpenContests()).find((c) => c.id === contestId) ?? null;
  }
  return fetchContestCached(contestId);
});

export const listEnteredContestIds = cache(async (userId: string): Promise<string[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data } = await supabase.from("rosters").select("contest_id").eq("user_id", userId);
  return ((data ?? []) as Array<{ contest_id: string }>).map((row) => row.contest_id);
});

const fetchPlayersCached = unstable_cache(
  async (): Promise<Player[]> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("players")
      .select("id, external_id, name, position, nfl_team")
      .order("name");
    if (!data) return [];
    return (data as Record<string, unknown>[]).map((p) => ({
      id: String(p.id),
      externalId: String(p.external_id),
      name: String(p.name),
      position: p.position as Player["position"],
      nflTeam: String(p.nfl_team),
    }));
  },
  ["nfl-players-v1"],
  { revalidate: 300 },
);

export async function listPlayers(): Promise<Player[]> {
  if (!isSupabaseConfigured()) {
    const { players } = await import("@/lib/mock/league");
    return players;
  }
  return fetchPlayersCached();
}

export const getUserEntry = cache(async (
  contestId: string,
  userId: string,
): Promise<{ entryId: string; rosterId: string } | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data: roster } = await supabase
    .from("rosters")
    .select("id")
    .eq("contest_id", contestId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!roster) return null;
  const id = String((roster as { id: string }).id);
  return { entryId: id, rosterId: id };
});
