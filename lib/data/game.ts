import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import {
  getContest,
  getSessionUser,
  getUserEntry,
  listOpenContests,
} from "@/lib/data/contests";
import type { Contest, Player } from "@/lib/types";

export interface UserContest extends Contest {
  rosterId: string;
  podId: string | null;
  podNumber: number | null;
  eliminatedAtWeek: number | null;
  rank: number | null;
  weekPoints: number | null;
  cumulativePoints: number | null;
}

export async function getUserContests(userId: string): Promise<UserContest[]> {
  const contests = await listOpenContests();
  const out: UserContest[] = [];
  for (const c of contests) {
    const entry = await getUserEntry(c.id, userId);
    if (!entry) continue;
    const pod = await getPodMembership(c.id, userId);
    const standing = await getUserStanding(c.id, userId, c.currentWeek);
    out.push({
      ...c,
      rosterId: entry.rosterId,
      podId: pod?.podId ?? null,
      podNumber: pod?.podNumber ?? null,
      eliminatedAtWeek: pod?.eliminatedAtWeek ?? null,
      rank: standing?.rank ?? null,
      weekPoints: standing?.points ?? null,
      cumulativePoints: standing?.cumulativePoints ?? null,
    });
  }
  return out;
}

export async function resolveContestForUser(
  userId: string,
  contestIdParam?: string,
): Promise<UserContest | null> {
  const mine = await getUserContests(userId);
  if (mine.length === 0) return null;
  if (contestIdParam) {
    return mine.find((c) => c.id === contestIdParam) ?? mine[0];
  }
  return (
    mine.find((c) => c.status === "active" || c.status === "phase2") ?? mine[0]
  );
}

export async function getPodMembership(
  contestId: string,
  userId: string,
): Promise<{
  podId: string;
  podNumber: number;
  eliminatedAtWeek: number | null;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("pod_members")
    .select("pod_id, eliminated_at_week, pods!inner(id, pod_number, contest_id)")
    .eq("user_id", userId)
    .eq("pods.contest_id", contestId)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    pod_id: string;
    eliminated_at_week: number | null;
    pods: { pod_number: number } | { pod_number: number }[];
  };
  const pod = Array.isArray(row.pods) ? row.pods[0] : row.pods;
  return {
    podId: row.pod_id,
    podNumber: Number(pod?.pod_number ?? 0),
    eliminatedAtWeek: row.eliminated_at_week,
  };
}

export interface StandingRow {
  userId: string;
  displayName: string;
  points: number;
  cumulativePoints: number;
  rank: number;
  eliminatedAtWeek: number | null;
}

export async function getStandings(
  contestId: string,
  week: number,
): Promise<StandingRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data: scores } = await supabase
    .from("weekly_scores")
    .select("user_id, points, cumulative_points")
    .eq("contest_id", contestId)
    .eq("week", week)
    .order("cumulative_points", { ascending: false });

  const ids = ((scores ?? []) as Array<{ user_id: string }>).map((s) => s.user_id);
  const names = await getDisplayNames(ids);

  const { data: pods } = await supabase
    .from("pods")
    .select("id")
    .eq("contest_id", contestId);
  const podIds = ((pods ?? []) as Array<{ id: string }>).map((p) => p.id);
  const elim = new Map<string, number | null>();
  if (podIds.length) {
    const { data: members } = await supabase
      .from("pod_members")
      .select("user_id, eliminated_at_week")
      .in("pod_id", podIds);
    for (const m of (members ?? []) as Array<{
      user_id: string;
      eliminated_at_week: number | null;
    }>) {
      elim.set(m.user_id, m.eliminated_at_week);
    }
  }

  return ((scores ?? []) as Array<{
    user_id: string;
    points: number;
    cumulative_points: number;
  }>).map((s, i) => ({
    userId: s.user_id,
    displayName: names.get(s.user_id) ?? s.user_id.slice(0, 8),
    points: Number(s.points),
    cumulativePoints: Number(s.cumulative_points),
    rank: i + 1,
    eliminatedAtWeek: elim.get(s.user_id) ?? null,
  }));
}

export async function getUserStanding(
  contestId: string,
  userId: string,
  week: number,
): Promise<StandingRow | null> {
  const rows = await getStandings(contestId, week);
  return rows.find((r) => r.userId === userId) ?? null;
}

export interface PodDetail {
  podId: string;
  podNumber: number;
  contestId: string;
  contestName: string;
  week: number;
  gameMode: Contest["gameMode"];
  members: Array<{
    userId: string;
    displayName: string;
    eliminatedAtWeek: number | null;
    weekPoints: number | null;
    starterNames: string[];
  }>;
  matchups: Array<{
    id: string;
    userIdA: string;
    userIdB: string;
    winnerId: string | null;
    pointsA: number | null;
    pointsB: number | null;
  }>;
}

export async function getPodDetail(podId: string): Promise<PodDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data: pod } = await supabase
    .from("pods")
    .select("id, pod_number, contest_id")
    .eq("id", podId)
    .maybeSingle();
  if (!pod) return null;
  const p = pod as { id: string; pod_number: number; contest_id: string };
  const contest = await getContest(p.contest_id);
  if (!contest) return null;

  const { data: members } = await supabase
    .from("pod_members")
    .select("user_id, roster_id, eliminated_at_week")
    .eq("pod_id", podId);

  const memberRows = (members ?? []) as Array<{
    user_id: string;
    roster_id: string;
    eliminated_at_week: number | null;
  }>;
  const userIds = memberRows.map((m) => m.user_id);
  const names = await getDisplayNames(userIds);

  const { data: scores } = await supabase
    .from("weekly_scores")
    .select("user_id, points")
    .eq("contest_id", p.contest_id)
    .eq("week", contest.currentWeek)
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const pts = new Map(
    ((scores ?? []) as Array<{ user_id: string; points: number }>).map((s) => [
      s.user_id,
      Number(s.points),
    ]),
  );

  const startersByUser = new Map<string, string[]>();
  for (const m of memberRows) {
    const { data: rps } = await supabase
      .from("roster_players")
      .select("is_starter, players(name)")
      .eq("roster_id", m.roster_id)
      .eq("is_starter", true);
    startersByUser.set(
      m.user_id,
      ((rps ?? []) as Array<{ players: { name: string } | { name: string }[] }>).map(
        (r) => {
          const pl = Array.isArray(r.players) ? r.players[0] : r.players;
          return pl?.name ?? "";
        },
      ),
    );
  }

  const { data: matchups } = await supabase
    .from("matchups")
    .select("id, user_id_a, user_id_b, winner_id")
    .eq("pod_id", podId)
    .eq("week", contest.currentWeek);

  return {
    podId: p.id,
    podNumber: p.pod_number,
    contestId: p.contest_id,
    contestName: contest.name,
    week: contest.currentWeek,
    gameMode: contest.gameMode,
    members: memberRows.map((m) => ({
      userId: m.user_id,
      displayName: names.get(m.user_id) ?? m.user_id.slice(0, 8),
      eliminatedAtWeek: m.eliminated_at_week,
      weekPoints: pts.get(m.user_id) ?? null,
      starterNames: startersByUser.get(m.user_id) ?? [],
    })),
    matchups: (
      (matchups ?? []) as Array<{
        id: string;
        user_id_a: string;
        user_id_b: string;
        winner_id: string | null;
      }>
    ).map((m) => ({
      id: m.id,
      userIdA: m.user_id_a,
      userIdB: m.user_id_b,
      winnerId: m.winner_id,
      pointsA: pts.get(m.user_id_a) ?? null,
      pointsB: pts.get(m.user_id_b) ?? null,
    })),
  };
}

export async function getMatchupDetail(
  contestId: string,
  userId: string,
  _week: number,
) {
  const pod = await getPodMembership(contestId, userId);
  if (!pod) return null;
  const detail = await getPodDetail(pod.podId);
  if (!detail) return null;
  const matchup = detail.matchups.find(
    (m) => m.userIdA === userId || m.userIdB === userId,
  );
  return { pod, detail, matchup };
}

export async function getRosterRows(rosterId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data: rps } = await supabase
    .from("roster_players")
    .select(
      "id, player_id, is_starter, used_as_gladiator_week, slot_order, players(id, external_id, name, position, nfl_team)",
    )
    .eq("roster_id", rosterId)
    .order("slot_order");

  return ((rps ?? []) as Array<Record<string, unknown>>).map((r) => {
    const p = (Array.isArray(r.players) ? r.players[0] : r.players) as Record<
      string,
      unknown
    >;
    const player: Player = {
      id: String(p.id),
      externalId: String(p.external_id),
      name: String(p.name),
      position: p.position as Player["position"],
      nflTeam: String(p.nfl_team),
    };
    return {
      rosterPlayerId: String(r.id),
      player,
      isStarter: Boolean(r.is_starter),
      usedAsGladiatorWeek: r.used_as_gladiator_week
        ? Number(r.used_as_gladiator_week)
        : null,
    };
  });
}

export async function getPendingWaivers(contestId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("waiver_claims")
    .select(
      "id, user_id, add_player_id, drop_player_id, status, created_at, users(display_name)",
    )
    .eq("contest_id", contestId)
    .eq("status", "pending")
    .order("created_at");
  return data ?? [];
}

export async function getDisplayNames(userIds: string[]) {
  const map = new Map<string, string>();
  if (!userIds.length || !isSupabaseConfigured()) return map;
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("id, display_name")
    .in("id", userIds);
  for (const u of (data ?? []) as Array<{ id: string; display_name: string }>) {
    map.set(u.id, u.display_name);
  }
  return map;
}

export async function requireSession() {
  return getSessionUser();
}
