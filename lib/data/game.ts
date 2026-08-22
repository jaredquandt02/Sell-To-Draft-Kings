import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config";
import { getContest, getSessionUser, mapContest } from "@/lib/data/contests";
import { isInjuredExternalId } from "@/lib/data/injuries";
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

export interface NavContest {
  id: string;
  name: string;
  currentWeek: number;
  gameMode: Contest["gameMode"];
  status: Contest["status"];
  podId: string | null;
}

/** Tiny payload for the header — no scores, no ranks. */
export const getNavContests = cache(async (userId: string): Promise<NavContest[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const [{ data: rosters }, { data: members }] = await Promise.all([
    supabase
      .from("rosters")
      .select(
        "contest_id, contests(id, name, status, current_week, game_mode, season_id, entry_fee_credits, max_entrants, pod_size, lock_at, draft_rounds)",
      )
      .eq("user_id", userId),
    supabase
      .from("pod_members")
      .select("pod_id, pods!inner(contest_id)")
      .eq("user_id", userId),
  ]);

  const podByContest = new Map<string, string>();
  for (const mem of (members ?? []) as Array<{
    pod_id: string;
    pods: { contest_id: string } | { contest_id: string }[];
  }>) {
    const pod = Array.isArray(mem.pods) ? mem.pods[0] : mem.pods;
    if (pod) podByContest.set(pod.contest_id, mem.pod_id);
  }

  const out: NavContest[] = [];
  for (const row of (rosters ?? []) as Array<{
    contest_id: string;
    contests: Record<string, unknown> | Record<string, unknown>[] | null;
  }>) {
    const raw = Array.isArray(row.contests) ? row.contests[0] : row.contests;
    if (!raw) continue;
    const contest = mapContest({ ...raw, id: raw.id ?? row.contest_id });
    out.push({
      id: contest.id,
      name: contest.name,
      currentWeek: contest.currentWeek,
      gameMode: contest.gameMode,
      status: contest.status,
      podId: podByContest.get(contest.id) ?? null,
    });
  }
  return out;
});

export const getUserContests = cache(async (userId: string): Promise<UserContest[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();

  const [{ data: rosters }, { data: members }, { data: scores }] = await Promise.all([
    supabase.from("rosters").select("id, contest_id, contests(*)").eq("user_id", userId),
    supabase
      .from("pod_members")
      .select("pod_id, eliminated_at_week, pods!inner(id, pod_number, contest_id)")
      .eq("user_id", userId),
    supabase
      .from("weekly_scores")
      .select("contest_id, week, points, cumulative_points")
      .eq("user_id", userId),
  ]);

  const rosterRows = (rosters ?? []) as Array<{
    id: string;
    contest_id: string;
    contests: Record<string, unknown> | Record<string, unknown>[] | null;
  }>;
  const contestIds = rosterRows.map((r) => r.contest_id);

  const rosterByContest = new Map(rosterRows.map((r) => [r.contest_id, r.id]));
  const contestById = new Map<string, Record<string, unknown>>();
  for (const row of rosterRows) {
    const raw = Array.isArray(row.contests) ? row.contests[0] : row.contests;
    if (raw) contestById.set(row.contest_id, { ...raw, id: raw.id ?? row.contest_id });
  }

  const podByContest = new Map<
    string,
    { podId: string; podNumber: number; eliminatedAtWeek: number | null }
  >();
  for (const mem of (members ?? []) as Array<{
    pod_id: string;
    eliminated_at_week: number | null;
    pods: { contest_id: string; pod_number: number } | { contest_id: string; pod_number: number }[];
  }>) {
    const pod = Array.isArray(mem.pods) ? mem.pods[0] : mem.pods;
    if (!pod || !contestIds.includes(pod.contest_id)) continue;
    podByContest.set(pod.contest_id, {
      podId: mem.pod_id,
      podNumber: Number(pod.pod_number),
      eliminatedAtWeek: mem.eliminated_at_week,
    });
  }

  const scoreRows = (scores ?? []) as Array<{
    contest_id: string;
    week: number;
    points: number;
    cumulative_points: number;
  }>;

  const out: UserContest[] = [];
  for (const row of rosterRows) {
    const raw = contestById.get(row.contest_id);
    if (!raw) continue;
    const contest = mapContest(raw);
    const rosterId = rosterByContest.get(contest.id);
    if (!rosterId) continue;
    const pod = podByContest.get(contest.id);
    const yours = scoreRows.find(
      (s) => s.contest_id === contest.id && s.week === contest.currentWeek,
    );
    out.push({
      ...contest,
      rosterId,
      podId: pod?.podId ?? null,
      podNumber: pod?.podNumber ?? null,
      eliminatedAtWeek: pod?.eliminatedAtWeek ?? null,
      rank: null,
      weekPoints: yours ? Number(yours.points) : null,
      cumulativePoints: yours ? Number(yours.cumulative_points) : null,
    });
  }

  out.sort((a, b) => {
    const order = { drafting: 0, active: 1, phase2: 2, open: 3, complete: 4 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.name.localeCompare(b.name);
  });
  return out;
});

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

export const getPodMembership = cache(async (
  contestId: string,
  userId: string,
): Promise<{
  podId: string;
  podNumber: number;
  eliminatedAtWeek: number | null;
} | null> => {
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
});

export interface StandingRow {
  userId: string;
  displayName: string;
  points: number;
  cumulativePoints: number;
  rank: number;
  eliminatedAtWeek: number | null;
}

export const getStandings = cache(async (
  contestId: string,
  week: number,
): Promise<StandingRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const scoresPromise = supabase
    .from("weekly_scores")
    .select("user_id, points, cumulative_points")
    .eq("contest_id", contestId)
    .eq("week", week)
    .order("cumulative_points", { ascending: false });
  const membersPromise = supabase
    .from("pod_members")
    .select("user_id, eliminated_at_week, pods!inner(contest_id)")
    .eq("pods.contest_id", contestId);

  const { data: scores } = await scoresPromise;
  const ids = ((scores ?? []) as Array<{ user_id: string }>).map((s) => s.user_id);
  const [names, { data: members }] = await Promise.all([
    getDisplayNames(ids),
    membersPromise,
  ]);

  const elim = new Map<string, number | null>();
  for (const m of (members ?? []) as Array<{
    user_id: string;
    eliminated_at_week: number | null;
  }>) {
    elim.set(m.user_id, m.eliminated_at_week);
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
});

export const getUserStanding = cache(async (
  contestId: string,
  userId: string,
  week: number,
): Promise<StandingRow | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data: scores } = await supabase
    .from("weekly_scores")
    .select("user_id, points, cumulative_points")
    .eq("contest_id", contestId)
    .eq("week", week)
    .order("cumulative_points", { ascending: false });

  const rows = (scores ?? []) as Array<{
    user_id: string;
    points: number;
    cumulative_points: number;
  }>;
  const idx = rows.findIndex((s) => s.user_id === userId);
  if (idx < 0) return null;

  const [names, pod] = await Promise.all([
    getDisplayNames([userId]),
    getPodMembership(contestId, userId),
  ]);
  const yours = rows[idx];
  return {
    userId,
    displayName: names.get(userId) ?? userId.slice(0, 8),
    points: Number(yours.points),
    cumulativePoints: Number(yours.cumulative_points),
    rank: idx + 1,
    eliminatedAtWeek: pod?.eliminatedAtWeek ?? null,
  };
});

export async function getTopStandings(
  contestId: string,
  week: number,
  limit = 10,
  highlightUserId?: string,
): Promise<StandingRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data: scores } = await supabase
    .from("weekly_scores")
    .select("user_id, points, cumulative_points")
    .eq("contest_id", contestId)
    .eq("week", week)
    .order("cumulative_points", { ascending: false });

  const all = (scores ?? []) as Array<{
    user_id: string;
    points: number;
    cumulative_points: number;
  }>;
  const picked = all.slice(0, limit);
  if (highlightUserId && !picked.some((s) => s.user_id === highlightUserId)) {
    const you = all.find((s) => s.user_id === highlightUserId);
    if (you) picked.push(you);
  }

  const ids = picked.map((s) => s.user_id);
  const names = await getDisplayNames(ids);
  const elim = new Map<string, number | null>();
  if (ids.length) {
    const { data: pods } = await supabase.from("pods").select("id").eq("contest_id", contestId);
    const podIds = ((pods ?? []) as Array<{ id: string }>).map((p) => p.id);
    if (podIds.length) {
      const { data: members } = await supabase
        .from("pod_members")
        .select("user_id, eliminated_at_week")
        .in("pod_id", podIds)
        .in("user_id", ids);
      for (const m of (members ?? []) as Array<{
        user_id: string;
        eliminated_at_week: number | null;
      }>) {
        elim.set(m.user_id, m.eliminated_at_week);
      }
    }
  }

  const rankByUser = new Map(all.map((s, i) => [s.user_id, i + 1]));
  return picked.map((s) => ({
    userId: s.user_id,
    displayName: names.get(s.user_id) ?? s.user_id.slice(0, 8),
    points: Number(s.points),
    cumulativePoints: Number(s.cumulative_points),
    rank: rankByUser.get(s.user_id) ?? 0,
    eliminatedAtWeek: elim.get(s.user_id) ?? null,
  }));
}

export interface WeekMatchup {
  podId: string;
  podNumber: number;
  opponentId: string;
  opponentName: string;
  yourPoints: number | null;
  opponentPoints: number | null;
  winnerId: string | null;
  eliminatedAtWeek: number | null;
}

export async function getWeekMatchup(
  contestId: string,
  userId: string,
  week: number,
): Promise<WeekMatchup | null> {
  const pod = await getPodMembership(contestId, userId);
  if (!pod || !isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data: matchup } = await supabase
    .from("matchups")
    .select("user_id_a, user_id_b, winner_id")
    .eq("pod_id", pod.podId)
    .eq("week", week)
    .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`)
    .maybeSingle();
  if (!matchup) return null;

  const m = matchup as {
    user_id_a: string;
    user_id_b: string;
    winner_id: string | null;
  };
  const opponentId = m.user_id_a === userId ? m.user_id_b : m.user_id_a;
  const [names, scoresRes] = await Promise.all([
    getDisplayNames([opponentId]),
    supabase
      .from("weekly_scores")
      .select("user_id, points")
      .eq("contest_id", contestId)
      .eq("week", week)
      .in("user_id", [userId, opponentId]),
  ]);
  const pts = new Map(
    ((scoresRes.data ?? []) as Array<{ user_id: string; points: number }>).map((s) => [
      s.user_id,
      Number(s.points),
    ]),
  );
  return {
    podId: pod.podId,
    podNumber: pod.podNumber,
    opponentId,
    opponentName: names.get(opponentId) ?? opponentId.slice(0, 8),
    yourPoints: pts.get(userId) ?? null,
    opponentPoints: pts.get(opponentId) ?? null,
    winnerId: m.winner_id,
    eliminatedAtWeek: pod.eliminatedAtWeek,
  };
}

export const getContestHubData = cache(async (contestId: string, userId: string | null) => {
  const contest = await getContest(contestId);
  if (!contest) return null;
  if (!isSupabaseConfigured()) {
    return {
      contest,
      entered: false,
      pod: null as Awaited<ReturnType<typeof getPodMembership>>,
      standing: null as { rank: number; points: number; cumulativePoints: number } | null,
      matchup: null as WeekMatchup | null,
      top: [] as StandingRow[],
      entrantCount: 0,
    };
  }

  const supabase = createClient();
  const [{ data: roster }, { data: podRow }, { data: scores }, countRes, { data: matchupRow }] =
    await Promise.all([
      userId
        ? supabase
            .from("rosters")
            .select("id")
            .eq("contest_id", contestId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      userId
        ? supabase
            .from("pod_members")
            .select("pod_id, eliminated_at_week, pods!inner(id, pod_number, contest_id)")
            .eq("user_id", userId)
            .eq("pods.contest_id", contestId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("weekly_scores")
        .select("user_id, points, cumulative_points")
        .eq("contest_id", contestId)
        .eq("week", contest.currentWeek)
        .order("cumulative_points", { ascending: false }),
      supabase
        .from("contest_entries")
        .select("*", { count: "exact", head: true })
        .eq("contest_id", contestId),
      userId
        ? supabase
            .from("matchups")
            .select("user_id_a, user_id_b, winner_id, pods!inner(contest_id)")
            .eq("week", contest.currentWeek)
            .eq("pods.contest_id", contestId)
            .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const scoreRows = (scores ?? []) as Array<{
    user_id: string;
    points: number;
    cumulative_points: number;
  }>;
  const podRaw = podRow as {
    pod_id: string;
    eliminated_at_week: number | null;
    pods: { pod_number: number } | { pod_number: number }[];
  } | null;
  const podObj = podRaw ? (Array.isArray(podRaw.pods) ? podRaw.pods[0] : podRaw.pods) : null;
  const pod = podRaw
    ? {
        podId: podRaw.pod_id,
        podNumber: Number(podObj?.pod_number ?? 0),
        eliminatedAtWeek: podRaw.eliminated_at_week,
      }
    : null;

  const m = matchupRow as {
    user_id_a: string;
    user_id_b: string;
    winner_id: string | null;
  } | null;
  const opponentId =
    m && userId ? (m.user_id_a === userId ? m.user_id_b : m.user_id_a) : null;

  const topSlice = scoreRows.slice(0, 10);
  const highlight =
    userId && !topSlice.some((s) => s.user_id === userId)
      ? scoreRows.find((s) => s.user_id === userId)
      : null;
  const topRows = highlight ? [...topSlice, highlight] : topSlice;
  const nameIds = [...topRows.map((s) => s.user_id), ...(opponentId ? [opponentId] : [])];

  const [names, elimMembers] = await Promise.all([
    getDisplayNames(nameIds),
    topRows.length && pod
      ? supabase
          .from("pod_members")
          .select("user_id, eliminated_at_week")
          .eq("pod_id", pod.podId)
          .in("user_id", topRows.map((s) => s.user_id))
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const elim = new Map<string, number | null>();
  for (const row of (elimMembers.data ?? []) as Array<{
    user_id: string;
    eliminated_at_week: number | null;
  }>) {
    elim.set(row.user_id, row.eliminated_at_week);
  }
  if (pod?.eliminatedAtWeek && userId) elim.set(userId, pod.eliminatedAtWeek);

  const yours = userId ? scoreRows.find((s) => s.user_id === userId) : undefined;
  const opp = opponentId ? scoreRows.find((s) => s.user_id === opponentId) : undefined;
  const matchup: WeekMatchup | null =
    m && userId && pod && opponentId
      ? {
          podId: pod.podId,
          podNumber: pod.podNumber,
          opponentId,
          opponentName: names.get(opponentId) ?? opponentId.slice(0, 8),
          yourPoints: yours ? Number(yours.points) : null,
          opponentPoints: opp ? Number(opp.points) : null,
          winnerId: m.winner_id,
          eliminatedAtWeek: pod.eliminatedAtWeek,
        }
      : null;

  const rankByUser = new Map(scoreRows.map((s, i) => [s.user_id, i + 1]));
  const yourIdx = userId ? scoreRows.findIndex((s) => s.user_id === userId) : -1;

  return {
    contest,
    entered: Boolean(roster),
    pod,
    standing:
      yourIdx >= 0
        ? {
            rank: yourIdx + 1,
            points: Number(scoreRows[yourIdx].points),
            cumulativePoints: Number(scoreRows[yourIdx].cumulative_points),
          }
        : null,
    matchup,
    top: topRows.map((s) => ({
      userId: s.user_id,
      displayName: names.get(s.user_id) ?? s.user_id.slice(0, 8),
      points: Number(s.points),
      cumulativePoints: Number(s.cumulative_points),
      rank: rankByUser.get(s.user_id) ?? 0,
      eliminatedAtWeek: elim.get(s.user_id) ?? null,
    })),
    entrantCount: countRes.count ?? 0,
  };
});

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

export const getPodDetail = cache(async (podId: string): Promise<PodDetail | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data: pod } = await supabase
    .from("pods")
    .select(
      "id, pod_number, contest_id, contests(name, current_week, game_mode), pod_members(user_id, roster_id, eliminated_at_week)",
    )
    .eq("id", podId)
    .maybeSingle();
  if (!pod) return null;
  const p = pod as {
    id: string;
    pod_number: number;
    contest_id: string;
    contests:
      | { name: string; current_week: number; game_mode: string }
      | { name: string; current_week: number; game_mode: string }[]
      | null;
    pod_members: Array<{
      user_id: string;
      roster_id: string;
      eliminated_at_week: number | null;
    }> | null;
  };
  const embedded = Array.isArray(p.contests) ? p.contests[0] : p.contests;
  const contest: {
    name: string;
    currentWeek: number;
    gameMode: Contest["gameMode"];
  } | null = embedded
    ? {
        name: embedded.name,
        currentWeek: Number(embedded.current_week ?? 1),
        gameMode: embedded.game_mode === "gladiator" ? "gladiator" : "classic",
      }
    : await getContest(p.contest_id);
  if (!contest) return null;

  const memberRows = p.pod_members ?? [];
  const userIds = memberRows.map((m) => m.user_id);
  const rosterIds = memberRows.map((m) => m.roster_id).filter(Boolean);

  const [names, scoresRes, startersRes, matchupsRes] = await Promise.all([
    getDisplayNames(userIds),
    supabase
      .from("weekly_scores")
      .select("user_id, points")
      .eq("contest_id", p.contest_id)
      .eq("week", contest.currentWeek)
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
    rosterIds.length
      ? supabase
          .from("roster_players")
          .select("roster_id, players(name)")
          .in("roster_id", rosterIds)
          .eq("is_starter", true)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("matchups")
      .select("id, user_id_a, user_id_b, winner_id")
      .eq("pod_id", podId)
      .eq("week", contest.currentWeek),
  ]);

  const pts = new Map(
    ((scoresRes.data ?? []) as Array<{ user_id: string; points: number }>).map((s) => [
      s.user_id,
      Number(s.points),
    ]),
  );
  const startersByRoster = new Map<string, string[]>();
  for (const r of (startersRes.data ?? []) as Array<{
    roster_id: string;
    players: { name: string } | { name: string }[];
  }>) {
    const pl = Array.isArray(r.players) ? r.players[0] : r.players;
    const list = startersByRoster.get(r.roster_id) ?? [];
    if (pl?.name) list.push(pl.name);
    startersByRoster.set(r.roster_id, list);
  }

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
      starterNames: startersByRoster.get(m.roster_id) ?? [],
    })),
    matchups: (
      (matchupsRes.data ?? []) as Array<{
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
});

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

export const getRosterRows = cache(async (rosterId: string) => {
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
      isInjured: isInjuredExternalId(player.externalId),
    };
  });
});

export const getPendingWaivers = cache(async (contestId: string) => {
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
});

const fetchDisplayNamesCached = unstable_cache(
  async (key: string): Promise<Array<{ id: string; display_name: string }>> => {
    const ids = key.split(",").filter(Boolean);
    if (!ids.length) return [];
    const admin = createAdminClient();
    const { data } = await admin.from("users").select("id, display_name").in("id", ids);
    return (data ?? []) as Array<{ id: string; display_name: string }>;
  },
  ["display-names-v1"],
  { revalidate: 120 },
);

export async function getDisplayNames(userIds: string[]) {
  const map = new Map<string, string>();
  if (!userIds.length || !isSupabaseConfigured()) return map;
  const unique = [...new Set(userIds)].filter(Boolean).sort();
  const rows = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? await fetchDisplayNamesCached(unique.join(","))
    : await (async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("users")
          .select("id, display_name")
          .in("id", unique);
        return (data ?? []) as Array<{ id: string; display_name: string }>;
      })();
  for (const u of rows) map.set(u.id, u.display_name);
  return map;
}

export interface DashboardTodo {
  label: string;
  href: string;
  cta: string;
}

export interface DashboardContest extends UserContest {
  matchup: WeekMatchup | null;
  hasGladPick: boolean;
  injuredStarterName: string | null;
}

export const getDashboardData = cache(async (userId: string): Promise<{
  contests: DashboardContest[];
  todos: DashboardTodo[];
}> => {
  const contests = await getUserContests(userId);
  if (!contests.length || !isSupabaseConfigured()) {
    return { contests: [], todos: [] };
  }

  const supabase = createClient();
  const contestIds = contests.map((c) => c.id);
  const rosterIds = contests.map((c) => c.rosterId);
  const podIds = contests.map((c) => c.podId).filter((id): id is string => Boolean(id));

  const [picksRes, medicRes, rosterRes, matchupsRes] = await Promise.all([
    supabase
      .from("gladiator_picks")
      .select("contest_id, week")
      .eq("user_id", userId)
      .in("contest_id", contestIds),
    supabase
      .from("medic_card_uses")
      .select("contest_id")
      .eq("user_id", userId)
      .in("contest_id", contestIds),
    supabase
      .from("roster_players")
      .select("roster_id, is_starter, players(name, external_id)")
      .in("roster_id", rosterIds)
      .eq("is_starter", true),
    podIds.length
      ? supabase
          .from("matchups")
          .select("pod_id, week, user_id_a, user_id_b, winner_id")
          .in("pod_id", podIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const gladKeys = new Set(
    ((picksRes.data ?? []) as Array<{ contest_id: string; week: number }>).map(
      (p) => `${p.contest_id}:${p.week}`,
    ),
  );
  const medicSet = new Set(
    ((medicRes.data ?? []) as Array<{ contest_id: string }>).map((m) => m.contest_id),
  );

  const injuredByRoster = new Map<string, string>();
  for (const row of (rosterRes.data ?? []) as Array<{
    roster_id: string;
    is_starter: boolean;
    players: { name: string; external_id: string } | { name: string; external_id: string }[];
  }>) {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!player || !row.is_starter) continue;
    if (isInjuredExternalId(player.external_id) && !injuredByRoster.has(row.roster_id)) {
      injuredByRoster.set(row.roster_id, player.name);
    }
  }

  const opponentIds: string[] = [];
  const matchupByPodWeek = new Map<
    string,
    { opponentId: string; winnerId: string | null }
  >();
  for (const m of (matchupsRes.data ?? []) as Array<{
    pod_id: string;
    week: number;
    user_id_a: string;
    user_id_b: string;
    winner_id: string | null;
  }>) {
    if (m.user_id_a !== userId && m.user_id_b !== userId) continue;
    const opponentId = m.user_id_a === userId ? m.user_id_b : m.user_id_a;
    opponentIds.push(opponentId);
    matchupByPodWeek.set(`${m.pod_id}:${m.week}`, { opponentId, winnerId: m.winner_id });
  }

  const [names, oppScoresRes] = await Promise.all([
    getDisplayNames(opponentIds),
    opponentIds.length
      ? supabase
          .from("weekly_scores")
          .select("contest_id, user_id, week, points")
          .in("contest_id", contestIds)
          .in("user_id", opponentIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const oppScores = oppScoresRes.data;
  const oppPts = new Map(
    ((oppScores ?? []) as Array<{
      contest_id: string;
      user_id: string;
      week: number;
      points: number;
    }>).map((s) => [`${s.contest_id}:${s.user_id}:${s.week}`, Number(s.points)]),
  );

  const todos: DashboardTodo[] = [];
  const rows: DashboardContest[] = contests.map((c) => {
    const rawMatchup =
      c.podId ? matchupByPodWeek.get(`${c.podId}:${c.currentWeek}`) : undefined;
    const matchup: WeekMatchup | null =
      c.podId && rawMatchup
        ? {
            podId: c.podId,
            podNumber: c.podNumber ?? 0,
            opponentId: rawMatchup.opponentId,
            opponentName: names.get(rawMatchup.opponentId) ?? rawMatchup.opponentId.slice(0, 8),
            yourPoints: c.weekPoints,
            opponentPoints:
              oppPts.get(`${c.id}:${rawMatchup.opponentId}:${c.currentWeek}`) ?? null,
            winnerId: rawMatchup.winnerId,
            eliminatedAtWeek: c.eliminatedAtWeek,
          }
        : null;
    const hasGladPick = gladKeys.has(`${c.id}:${c.currentWeek}`);
    const injuredStarterName = injuredByRoster.get(c.rosterId) ?? null;
    const hasMedic = medicSet.has(c.id);

    if (c.status === "drafting") {
      todos.push({
        label: `${c.name} draft is live`,
        href: `/draft/${c.id}`,
        cta: "Draft",
      });
    }
    if (c.gameMode === "gladiator" && !c.eliminatedAtWeek && c.status !== "open") {
      if (!hasGladPick && (c.status === "active" || c.status === "phase2")) {
        todos.push({
          label: `${c.name}: no Gladiator Pick for week ${c.currentWeek}`,
          href: `/gladiator-pick/${c.currentWeek}?contestId=${c.id}`,
          cta: "Pick",
        });
      }
      if (injuredStarterName && !hasMedic) {
        todos.push({
          label: `${injuredStarterName} is injured in ${c.name}`,
          href: `/team?contestId=${c.id}`,
          cta: "Medic Card",
        });
      }
    }

    return { ...c, matchup, hasGladPick, injuredStarterName };
  });

  return { contests: rows, todos };
});

export async function requireSession() {
  return getSessionUser();
}
