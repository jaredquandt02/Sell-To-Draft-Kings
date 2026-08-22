/**
 * Extra UI fixtures on top of seed-test-db.ts:
 *  - week 2 scores + matchups on the 120-person fields
 *  - live draft lab (Jared on the clock)
 *  - open lobby contests with partial entries
 *  - phase-2 gladiator showcase
 *  - medic card uses + more waivers
 *
 *   npx tsx scripts/seed-ui-fixtures.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq);
    if (!process.env[k]) process.env[k] = t.slice(eq + 1);
  }
}
loadEnvLocal();

const SEASON_ID = "00000000-0000-0000-0000-000000000001";
const CLASSIC_120 = "00000000-0000-0000-0000-000000000010";
const GLADIATOR_120 = "00000000-0000-0000-0000-000000000011";
const OPEN_CLASSIC = "00000000-0000-0000-0000-000000000002";
const OPEN_GLADIATOR = "00000000-0000-0000-0000-000000000003";
const DRAFT_LAB = "00000000-0000-0000-0000-000000000020";
const PHASE2_ID = "00000000-0000-0000-0000-000000000022";
const JARED_EMAIL = "jared@gladiator.test";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

function deterministicShuffle(ids: string[], seed: string): string[] {
  const arr = [...ids];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = arr.length - 1; i > 0; i--) {
    h ^= i;
    h = Math.imul(h, 16777619);
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function podContest(admin: Admin, contestId: string) {
  const { assignPods, snakeDraftOrder } = await import("../lib/game-engine/pods");
  const { data: contest } = await admin.from("contests").select("*").eq("id", contestId).single();
  const c = contest as Record<string, unknown>;
  const { data: entries } = await admin
    .from("contest_entries")
    .select("user_id")
    .eq("contest_id", contestId)
    .order("entered_at");
  const userIds = ((entries ?? []) as Array<{ user_id: string }>).map((e) => e.user_id);
  const pods = assignPods(deterministicShuffle(userIds, contestId), Number(c.pod_size));
  const draftRounds = Number(c.draft_rounds ?? 5);
  for (const pod of pods) {
    const { data: podRow, error } = await admin
      .from("pods")
      .insert({ contest_id: contestId, pod_number: pod.podNumber })
      .select("id")
      .single();
    if (error) throw error;
    const podId = String((podRow as { id: string }).id);
    for (const userId of pod.userIds) {
      const { data: roster } = await admin
        .from("rosters")
        .select("id")
        .eq("contest_id", contestId)
        .eq("user_id", userId)
        .single();
      await admin.from("pod_members").insert({
        pod_id: podId,
        user_id: userId,
        roster_id: String((roster as { id: string }).id),
      });
    }
    await admin.from("draft_picks").insert(
      snakeDraftOrder(pod.userIds, draftRounds).map((userId, idx) => ({
        contest_id: contestId,
        pod_id: podId,
        pick_number: idx + 1,
        user_id: userId,
        player_id: null,
      })),
    );
    for (let i = 0; i < pod.userIds.length; i += 2) {
      if (!pod.userIds[i + 1]) break;
      await admin.from("matchups").insert({
        pod_id: podId,
        week: 1,
        user_id_a: pod.userIds[i],
        user_id_b: pod.userIds[i + 1],
      });
    }
  }
  await admin.from("contests").update({ status: "drafting" }).eq("id", contestId);
}

async function completeDrafts(admin: Admin, contestId: string, stopAfterPick?: number) {
  const { data: pods } = await admin.from("pods").select("id").eq("contest_id", contestId);
  const { data: allPlayers } = await admin.from("players").select("id").order("external_id");
  const pool = ((allPlayers ?? []) as Array<{ id: string }>).map((p) => p.id);

  for (const pod of (pods ?? []) as Array<{ id: string }>) {
    const { data: picks } = await admin
      .from("draft_picks")
      .select("id, user_id, pick_number, player_id")
      .eq("pod_id", pod.id)
      .order("pick_number");
    const remaining = [...pool];
    const rosterIds = new Map<string, string>();
    const userIds = [
      ...new Set(((picks ?? []) as Array<{ user_id: string }>).map((p) => p.user_id)),
    ];
    const { data: rosters } = await admin
      .from("rosters")
      .select("id, user_id")
      .eq("contest_id", contestId)
      .in("user_id", userIds);
    for (const r of (rosters ?? []) as Array<{ id: string; user_id: string }>) {
      rosterIds.set(r.user_id, r.id);
    }
    const counts = new Map<string, number>();
    const toInsert: Array<Record<string, unknown>> = [];

    for (const pick of (picks ?? []) as Array<{
      id: string;
      user_id: string;
      pick_number: number;
      player_id: string | null;
    }>) {
      if (stopAfterPick && pick.pick_number > stopAfterPick) break;
      if (pick.player_id) {
        const idx = remaining.indexOf(pick.player_id);
        if (idx >= 0) remaining.splice(idx, 1);
        continue;
      }
      const next = remaining.shift();
      if (!next) break;
      await admin
        .from("draft_picks")
        .update({ player_id: next, picked_at: new Date().toISOString() })
        .eq("id", pick.id);
      const rosterId = rosterIds.get(pick.user_id);
      if (!rosterId) continue;
      const count = counts.get(pick.user_id) ?? 0;
      counts.set(pick.user_id, count + 1);
      toInsert.push({
        roster_id: rosterId,
        player_id: next,
        added_week: 1,
        is_starter: count < 5,
        slot_order: count,
      });
    }
    if (toInsert.length) {
      await admin.from("roster_players").upsert(toInsert, { onConflict: "roster_id,player_id" });
    }
  }
}

async function scoreWeek(admin: Admin, contestId: string, week: number) {
  const { scoreStatLine, applyGladiatorMultiplier } = await import("../lib/game-engine/scoring");
  const { resolveMatchup, eliminatedUserIds } = await import("../lib/game-engine/elimination");
  const { mockProvider } = await import("../lib/stats-provider/mock");

  const { data: contest } = await admin.from("contests").select("*").eq("id", contestId).single();
  const gameMode = String((contest as { game_mode: string }).game_mode);
  const weeklyStats = await mockProvider.getWeeklyStats(week, 2026);
  const statsByExternal = new Map(weeklyStats.map((s) => [s.playerExternalId, s]));
  const { data: players } = await admin.from("players").select("id, external_id");
  const externalById = new Map(
    ((players ?? []) as Array<{ id: string; external_id: string }>).map((p) => [p.id, p.external_id]),
  );
  const { data: rosters } = await admin.from("rosters").select("id, user_id").eq("contest_id", contestId);
  const { data: gladPicks } = await admin
    .from("gladiator_picks")
    .select("user_id, roster_player_id, multiplier_applied")
    .eq("contest_id", contestId)
    .eq("week", week);
  const gladByUser = new Map(
    ((gladPicks ?? []) as Array<{
      user_id: string;
      roster_player_id: string;
      multiplier_applied: number;
    }>).map((g) => [g.user_id, g]),
  );

  const userPoints = new Map<string, number>();
  let scored = 0;
  for (const roster of (rosters ?? []) as Array<{ id: string; user_id: string }>) {
    const { data: rps } = await admin
      .from("roster_players")
      .select("id, player_id")
      .eq("roster_id", roster.id)
      .eq("is_starter", true);
    let points = 0;
    const glad = gladByUser.get(roster.user_id);
    for (const rp of (rps ?? []) as Array<{ id: string; player_id: string }>) {
      const ext = externalById.get(rp.player_id);
      const raw = ext ? statsByExternal.get(ext) : undefined;
      let playerScore = scoreStatLine(raw ?? {});
      if (gameMode === "gladiator" && glad?.roster_player_id === rp.id) {
        playerScore = applyGladiatorMultiplier(playerScore, Number(glad.multiplier_applied));
      }
      points += playerScore;
    }
    points = +points.toFixed(2);
    userPoints.set(roster.user_id, points);
    const { data: prev } = await admin
      .from("weekly_scores")
      .select("cumulative_points")
      .eq("contest_id", contestId)
      .eq("user_id", roster.user_id)
      .eq("week", week - 1)
      .maybeSingle();
    const prevCum = prev ? Number((prev as { cumulative_points: number }).cumulative_points) : 0;
    await admin.from("weekly_scores").upsert(
      {
        contest_id: contestId,
        user_id: roster.user_id,
        week,
        points,
        cumulative_points: +(prevCum + points).toFixed(2),
      },
      { onConflict: "contest_id,user_id,week" },
    );
    scored += 1;
  }

  const { data: pods } = await admin.from("pods").select("id").eq("contest_id", contestId);
  const matchupResults = [];
  for (const pod of (pods ?? []) as Array<{ id: string }>) {
    const { data: matchups } = await admin
      .from("matchups")
      .select("*")
      .eq("pod_id", pod.id)
      .eq("week", week);
    for (const m of (matchups ?? []) as Array<{ id: string; user_id_a: string; user_id_b: string }>) {
      const result = resolveMatchup(
        m.user_id_a,
        userPoints.get(m.user_id_a) ?? 0,
        m.user_id_b,
        userPoints.get(m.user_id_b) ?? 0,
      );
      matchupResults.push(result);
      await admin.from("matchups").update({ winner_id: result.winnerId }).eq("id", m.id);
    }
  }

  if (gameMode === "gladiator") {
    const eliminated = eliminatedUserIds(matchupResults);
    for (const userId of eliminated) {
      const { data: members } = await admin
        .from("pod_members")
        .select("pod_id")
        .eq("user_id", userId)
        .is("eliminated_at_week", null);
      for (const mem of (members ?? []) as Array<{ pod_id: string }>) {
        const { data: pod } = await admin
          .from("pods")
          .select("id")
          .eq("id", mem.pod_id)
          .eq("contest_id", contestId)
          .maybeSingle();
        if (!pod) continue;
        await admin
          .from("pod_members")
          .update({ eliminated_at_week: week })
          .eq("pod_id", mem.pod_id)
          .eq("user_id", userId);
      }
    }
  }

  await admin.from("contests").update({ current_week: week, status: "active" }).eq("id", contestId);
  return { scored };
}

async function ensureBenches(admin: Admin, contestId: string, extra = 2) {
  const { data: allPlayers } = await admin.from("players").select("id").order("external_id");
  const pool = ((allPlayers ?? []) as Array<{ id: string }>).map((p) => p.id);
  const { data: pods } = await admin.from("pods").select("id").eq("contest_id", contestId);
  let added = 0;

  for (const pod of (pods ?? []) as Array<{ id: string }>) {
    const { data: members } = await admin
      .from("pod_members")
      .select("roster_id")
      .eq("pod_id", pod.id);
    const { data: drafted } = await admin
      .from("draft_picks")
      .select("player_id")
      .eq("pod_id", pod.id)
      .not("player_id", "is", null);
    const taken = new Set(
      ((drafted ?? []) as Array<{ player_id: string }>).map((d) => d.player_id),
    );
    const leftover = pool.filter((id) => !taken.has(id));
    let cursor = 0;

    for (const mem of (members ?? []) as Array<{ roster_id: string }>) {
      const { data: existing } = await admin
        .from("roster_players")
        .select("player_id, is_starter")
        .eq("roster_id", mem.roster_id);
      const onRoster = new Set(
        ((existing ?? []) as Array<{ player_id: string }>).map((r) => r.player_id),
      );
      const benchCount = ((existing ?? []) as Array<{ is_starter: boolean }>).filter(
        (r) => !r.is_starter,
      ).length;
      const need = Math.max(0, extra - benchCount);
      const toInsert: Array<Record<string, unknown>> = [];
      while (toInsert.length < need && cursor < leftover.length) {
        const playerId = leftover[cursor++];
        if (onRoster.has(playerId)) continue;
        toInsert.push({
          roster_id: mem.roster_id,
          player_id: playerId,
          added_week: 1,
          is_starter: false,
          slot_order: (existing?.length ?? 0) + toInsert.length,
        });
      }
      if (toInsert.length) {
        const { error } = await admin.from("roster_players").upsert(toInsert, {
          onConflict: "roster_id,player_id",
        });
        if (!error) added += toInsert.length;
      }
    }
  }
  return added;
}

async function ensureInjuredStarter(
  admin: Admin,
  contestId: string,
  userId: string,
  externalId: string,
) {
  const { data: player } = await admin
    .from("players")
    .select("id")
    .eq("external_id", externalId)
    .single();
  if (!player) return false;
  const injuredId = String((player as { id: string }).id);

  const { data: roster } = await admin
    .from("rosters")
    .select("id")
    .eq("contest_id", contestId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!roster) return false;
  const rosterId = String((roster as { id: string }).id);

  const { data: rps } = await admin
    .from("roster_players")
    .select("id, player_id, is_starter")
    .eq("roster_id", rosterId);
  const rows = (rps ?? []) as Array<{ id: string; player_id: string; is_starter: boolean }>;
  const already = rows.find((r) => r.player_id === injuredId);
  if (already) {
    if (!already.is_starter) {
      await admin.from("roster_players").update({ is_starter: true }).eq("id", already.id);
    }
    return true;
  }

  const swap = rows.find((r) => r.is_starter) ?? rows[0];
  if (!swap) return false;
  await admin.from("roster_players").update({ player_id: injuredId }).eq("id", swap.id);
  return true;
}

async function advanceDraftUntilUser(admin: Admin, contestId: string, userId: string) {
  const { data: picks } = await admin
    .from("draft_picks")
    .select("pick_number, user_id, player_id")
    .eq("contest_id", contestId)
    .order("pick_number");
  const jaredOpen = ((picks ?? []) as Array<{
    pick_number: number;
    user_id: string;
    player_id: string | null;
  }>).find((p) => p.user_id === userId && !p.player_id);
  if (!jaredOpen) return;
  await completeDrafts(admin, contestId, jaredOpen.pick_number - 1);
}

async function ensureEntries(admin: Admin, contestId: string, userIds: string[], fee: number) {
  for (const userId of userIds) {
    await admin.from("rosters").upsert(
      { user_id: userId, contest_id: contestId },
      { onConflict: "user_id,contest_id" },
    );
    const { data: existing } = await admin
      .from("contest_entries")
      .select("id")
      .eq("contest_id", contestId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) continue;
    await admin.from("transactions").insert({
      user_id: userId,
      type: "credit_grant",
      credits: 5000,
    });
    await admin.from("contest_entries").insert({ contest_id: contestId, user_id: userId });
    if (fee > 0) {
      await admin.from("transactions").insert({
        user_id: userId,
        type: "entry_fee",
        credits: -fee,
      });
    }
  }
}

async function addWeekMatchups(
  admin: Admin,
  contestId: string,
  week: number,
  aliveOnly: boolean,
) {
  const { data: existing } = await admin
    .from("matchups")
    .select("id, pods!inner(contest_id)")
    .eq("week", week)
    .eq("pods.contest_id", contestId)
    .limit(1);
  if (existing?.length) return;

  const { data: pods } = await admin.from("pods").select("id").eq("contest_id", contestId);
  for (const pod of (pods ?? []) as Array<{ id: string }>) {
    const { data: members } = await admin
      .from("pod_members")
      .select("user_id, eliminated_at_week")
      .eq("pod_id", pod.id);
    const ids = ((members ?? []) as Array<{ user_id: string; eliminated_at_week: number | null }>)
      .filter((m) => !aliveOnly || m.eliminated_at_week == null)
      .map((m) => m.user_id);
    for (let i = 0; i < ids.length; i += 2) {
      if (!ids[i + 1]) break;
      await admin.from("matchups").insert({
        pod_id: pod.id,
        week,
        user_id_a: ids[i],
        user_id_b: ids[i + 1],
      });
    }
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing Supabase env");
  const { createClient } = await import("@supabase/supabase-js");
  const { usersCutByMedian } = await import("../lib/game-engine/phase2-cuts");
  const { GLADIATOR_MULTIPLIER } = await import("../lib/config");
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: jaredRow } = await admin.from("users").select("id").eq("email", JARED_EMAIL).maybeSingle();
  if (!jaredRow) throw new Error(`Missing ${JARED_EMAIL}`);
  const jaredId = String((jaredRow as { id: string }).id);

  const { data: bots } = await admin
    .from("users")
    .select("id, email")
    .like("email", "bot-%@gladiator.test")
    .order("email");
  const botIds = ((bots ?? []) as Array<{ id: string }>).map((b) => b.id);
  if (botIds.length < 23) throw new Error(`Need bots from seed-test-db first (have ${botIds.length})`);

  console.log("Filling open lobby contests…");
  await ensureEntries(admin, OPEN_CLASSIC, botIds.slice(0, 7), 100);
  await ensureEntries(admin, OPEN_GLADIATOR, botIds.slice(0, 19), 250);

  console.log("Week 2 classic 120…");
  await addWeekMatchups(admin, CLASSIC_120, 2, false);
  console.log(await scoreWeek(admin, CLASSIC_120, 2));

  console.log("Week 2 gladiator 120 (survivors)…");
  await addWeekMatchups(admin, GLADIATOR_120, 2, true);
  const { data: gladRosters } = await admin.from("rosters").select("id, user_id").eq("contest_id", GLADIATOR_120);
  let extraPicks = 0;
  for (const [i, roster] of ((gladRosters ?? []) as Array<{ id: string; user_id: string }>).entries()) {
    if (i % 4 !== 1) continue;
    const { data: existing } = await admin
      .from("gladiator_picks")
      .select("id")
      .eq("contest_id", GLADIATOR_120)
      .eq("user_id", roster.user_id)
      .eq("week", 2)
      .maybeSingle();
    if (existing) continue;
    const { data: rps } = await admin
      .from("roster_players")
      .select("id, used_as_gladiator_week")
      .eq("roster_id", roster.id)
      .eq("is_starter", true);
    const unused = ((rps ?? []) as Array<{ id: string; used_as_gladiator_week: number | null }>).find(
      (r) => r.used_as_gladiator_week == null,
    );
    if (!unused) continue;
    const { error } = await admin.from("gladiator_picks").insert({
      contest_id: GLADIATOR_120,
      roster_player_id: unused.id,
      user_id: roster.user_id,
      week: 2,
      score: 0,
      multiplier_applied: GLADIATOR_MULTIPLIER,
    });
    if (!error) extraPicks += 1;
  }
  console.log(`  week-2 gladiator picks: ${extraPicks}`);
  console.log(await scoreWeek(admin, GLADIATOR_120, 2));

  console.log("Benches + injured starter for Medic UI…");
  console.log(`  classic benches: ${await ensureBenches(admin, CLASSIC_120)}`);
  console.log(`  gladiator benches: ${await ensureBenches(admin, GLADIATOR_120)}`);
  console.log(
    `  jared injured starter: ${await ensureInjuredStarter(admin, GLADIATOR_120, jaredId, "nfl-2")}`,
  );

  console.log("Medic card uses…");
  let medicCount = 0;
  for (const userId of botIds.slice(0, 12)) {
    if (userId === jaredId) continue;
    const { data: roster } = await admin
      .from("rosters")
      .select("id")
      .eq("contest_id", GLADIATOR_120)
      .eq("user_id", userId)
      .maybeSingle();
    if (!roster) continue;
    const { data: bench } = await admin
      .from("roster_players")
      .select("player_id")
      .eq("roster_id", (roster as { id: string }).id)
      .eq("is_starter", false)
      .limit(1);
    const backup = (bench ?? [])[0] as { player_id: string } | undefined;
    if (!backup) continue;
    const { error } = await admin.from("medic_card_uses").upsert(
      {
        contest_id: GLADIATOR_120,
        user_id: userId,
        triggered_week: 2,
        backup_player_id: backup.player_id,
      },
      { onConflict: "contest_id,user_id" },
    );
    if (error) console.warn(`  medic upsert failed: ${error.message}`);
    else medicCount += 1;
  }
  console.log(`  medic uses: ${medicCount}`);

  console.log("More waiver claims…");
  const { data: players } = await admin.from("players").select("id").order("external_id");
  const playerIds = ((players ?? []) as Array<{ id: string }>).map((p) => p.id);
  let waiverCount = 0;
  for (let i = 0; i < 20; i++) {
    const { error } = await admin.from("waiver_claims").insert({
      contest_id: i < 12 ? CLASSIC_120 : GLADIATOR_120,
      user_id: botIds[i + 12],
      add_player_id: playerIds[(i * 3 + 10) % playerIds.length],
      drop_player_id: null,
      status: i % 5 === 0 ? "fulfilled" : "pending",
    });
    if (!error) waiverCount += 1;
  }
  console.log(`  waivers: ${waiverCount}`);

  console.log("Draft lab (Jared on the clock)…");
  await admin.from("contests").upsert({
    id: DRAFT_LAB,
    season_id: SEASON_ID,
    name: "Live Draft Lab",
    entry_fee_credits: 0,
    max_entrants: 6,
    pod_size: 6,
    game_mode: "classic",
    status: "open",
    current_week: 1,
    draft_rounds: 5,
  });
  const draftUsers = [jaredId, ...botIds.slice(50, 55)];
  await ensureEntries(admin, DRAFT_LAB, draftUsers, 0);
  const { count: draftPods } = await admin
    .from("pods")
    .select("*", { count: "exact", head: true })
    .eq("contest_id", DRAFT_LAB);
  if ((draftPods ?? 0) === 0) {
    await admin.from("contests").update({ status: "open" }).eq("id", DRAFT_LAB);
    await podContest(admin, DRAFT_LAB);
  }
  await completeDrafts(admin, DRAFT_LAB, 12);
  await advanceDraftUntilUser(admin, DRAFT_LAB, jaredId);
  await admin.from("contests").update({ status: "drafting" }).eq("id", DRAFT_LAB);

  console.log("Phase 2 showcase…");
  await admin.from("contests").upsert({
    id: PHASE2_ID,
    season_id: SEASON_ID,
    name: "Phase 2 Showcase",
    entry_fee_credits: 100,
    max_entrants: 24,
    pod_size: 6,
    game_mode: "gladiator",
    status: "open",
    current_week: 1,
    draft_rounds: 5,
  });
  const phase2Users = [jaredId, ...botIds.slice(0, 23)];
  await ensureEntries(admin, PHASE2_ID, phase2Users, 100);
  const { count: p2pods } = await admin
    .from("pods")
    .select("*", { count: "exact", head: true })
    .eq("contest_id", PHASE2_ID);
  if ((p2pods ?? 0) === 0) {
    await admin.from("contests").update({ status: "open" }).eq("id", PHASE2_ID);
    await podContest(admin, PHASE2_ID);
    await completeDrafts(admin, PHASE2_ID);
    console.log("  scoring phase2 week 1", await scoreWeek(admin, PHASE2_ID, 1));
    await addWeekMatchups(admin, PHASE2_ID, 2, true);
    console.log("  scoring phase2 week 2", await scoreWeek(admin, PHASE2_ID, 2));
  }

  const { data: p2scores } = await admin
    .from("weekly_scores")
    .select("user_id, cumulative_points")
    .eq("contest_id", PHASE2_ID)
    .eq("week", 2);
  const cutIds = usersCutByMedian(
    ((p2scores ?? []) as Array<{ user_id: string; cumulative_points: number }>).map((s) => ({
      userId: s.user_id,
      cumulativePoints: Number(s.cumulative_points),
    })),
  );
  const { data: p2podRows } = await admin.from("pods").select("id").eq("contest_id", PHASE2_ID);
  const p2podSet = new Set(((p2podRows ?? []) as Array<{ id: string }>).map((p) => p.id));
  for (const userId of cutIds) {
    const { data: members } = await admin
      .from("pod_members")
      .select("pod_id")
      .eq("user_id", userId)
      .is("eliminated_at_week", null);
    for (const m of (members ?? []) as Array<{ pod_id: string }>) {
      if (!p2podSet.has(m.pod_id)) continue;
      await admin
        .from("pod_members")
        .update({ eliminated_at_week: 2 })
        .eq("pod_id", m.pod_id)
        .eq("user_id", userId);
    }
  }
  await admin.from("contests").update({ status: "phase2", current_week: 2 }).eq("id", PHASE2_ID);
  console.log(`  phase2 cuts: ${cutIds.length}`);
  console.log(`  phase2 benches: ${await ensureBenches(admin, PHASE2_ID)}`);

  const summary = {
    openClassic: OPEN_CLASSIC,
    openGladiator: OPEN_GLADIATOR,
    classic120: CLASSIC_120,
    gladiator120: GLADIATOR_120,
    draftLab: DRAFT_LAB,
    phase2: PHASE2_ID,
    login: { email: JARED_EMAIL, password: "Gladiator1!" },
  };
  console.log("\n=== UI fixtures ready ===");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
