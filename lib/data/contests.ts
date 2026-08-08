import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import type { Contest, Player, User } from "@/lib/types";

export async function getSessionUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, email, display_name, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    return {
      id: user.id,
      email: user.email ?? "",
      displayName: user.email?.split("@")[0] ?? "Player",
      createdAt: new Date().toISOString(),
    };
  }

  const row = data as {
    id: string;
    email: string;
    display_name: string;
    created_at: string;
  };

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

export async function getCreditBalance(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 1000;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("user_credit_balance", {
    p_user_id: userId,
  });
  if (error) return 0;
  return Number(data ?? 0);
}

function mapContest(row: Record<string, unknown>): Contest {
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

export async function listOpenContests(): Promise<
  Array<Contest & { entrantCount: number }>
> {
  if (!isSupabaseConfigured()) {
    return [
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
  }

  const supabase = createClient();
  const { data: contests, error } = await supabase
    .from("contests")
    .select("*")
    .in("status", ["open", "drafting", "active", "phase2"])
    .order("name");

  if (error || !contests) return [];

  const rows = contests as Record<string, unknown>[];
  const result: Array<Contest & { entrantCount: number }> = [];

  for (const row of rows) {
    const { count } = await supabase
      .from("contest_entries")
      .select("*", { count: "exact", head: true })
      .eq("contest_id", row.id);
    result.push({ ...mapContest(row), entrantCount: count ?? 0 });
  }

  return result;
}

export async function getContest(contestId: string): Promise<Contest | null> {
  if (!isSupabaseConfigured()) {
    const all = await listOpenContests();
    return all.find((c) => c.id === contestId) ?? null;
  }
  const supabase = createClient();
  const { data } = await supabase
    .from("contests")
    .select("*")
    .eq("id", contestId)
    .maybeSingle();
  if (!data) return null;
  return mapContest(data as Record<string, unknown>);
}

export async function listPlayers(): Promise<Player[]> {
  if (!isSupabaseConfigured()) {
    const { players } = await import("@/lib/mock/league");
    return players;
  }
  const supabase = createClient();
  const { data } = await supabase
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
}

export async function getUserEntry(
  contestId: string,
  userId: string,
): Promise<{ entryId: string; rosterId: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data: entry } = await supabase
    .from("contest_entries")
    .select("id")
    .eq("contest_id", contestId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!entry) return null;

  const { data: roster } = await supabase
    .from("rosters")
    .select("id")
    .eq("contest_id", contestId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!roster) return null;
  return {
    entryId: String((entry as { id: string }).id),
    rosterId: String((roster as { id: string }).id),
  };
}
