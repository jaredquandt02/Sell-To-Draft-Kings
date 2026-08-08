/**
 * Seed a large hosted test database: players, bot users, two 120-person
 * contests (classic + gladiator), pods, completed drafts, week-1 scores.
 *
 * Usage (from repo root, with .env.local pointing at hosted Supabase):
 *   npx tsx scripts/seed-test-db.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();
process.env.STATS_PROVIDER = process.env.STATS_PROVIDER || "mock";

const SEASON_ID = "00000000-0000-0000-0000-000000000001";
const CLASSIC_ID = "00000000-0000-0000-0000-000000000010";
const GLADIATOR_ID = "00000000-0000-0000-0000-000000000011";
const FIELD_SIZE = 120;
const POD_SIZE = 6;
const DRAFT_ROUNDS = 5;
const JARED_EMAIL = "jared@gladiator.test";
const BOT_PASSWORD = "Gladiator1!";
const BOT_COUNT = FIELD_SIZE - 1;

const FIRST = [
  "Alex", "Blair", "Casey", "Drew", "Eden", "Fin", "Gray", "Harper", "Indigo",
  "Jules", "Kai", "Lane", "Morgan", "Noel", "Oak", "Parker", "Quinn", "Remy",
  "Sage", "Tatum", "Uma", "Val", "Wren", "Xan", "Yael", "Zion",
];
const LAST = [
  "Adler", "Brooks", "Chen", "Diaz", "Ellis", "Ford", "Gupta", "Hayes", "Ito",
  "Jung", "Khan", "Lopez", "Meyer", "Nguyen", "Ortiz", "Patel", "Quinn",
  "Reed", "Singh", "Tran", "Usher", "Vega", "Walsh", "Xu", "Young", "Zane",
];

function botName(i: number) {
  return `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]} ${i + 1}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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

// Untyped on purpose — seed script talks to hosted schema without generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

async function podContest(admin: Admin, contestId: string) {
  const { assignPods, snakeDraftOrder } = await import("../lib/game-engine/pods");
  const { data: contest, error } = await admin
    .from("contests")
    .select("*")
    .eq("id", contestId)
    .single();
  if (error || !contest) throw error ?? new Error("contest not found");
  const c = contest as Record<string, unknown>;
  const { data: entries } = await admin
    .from("contest_entries")
    .select("user_id")
    .eq("contest_id", contestId)
    .order("entered_at");
  const userIds = ((entries ?? []) as Array<{ user_id: string }>).map((e) => e.user_id);
  const podSize = Number(c.pod_size);
  const pods = assignPods(deterministicShuffle(userIds, contestId), podSize);
  const draftRounds = Number(c.draft_rounds ?? 5);
  let created = 0;
  for (const pod of pods) {
    const { data: podRow, error: podError } = await admin
      .from("pods")
      .insert({ contest_id: contestId, pod_number: pod.podNumber })
      .select("id")
      .single();
    if (podError || !podRow) throw podError;
    const podId = String((podRow as { id: string }).id);
    created += 1;
    for (const userId of pod.userIds) {
      const { data: roster } = await admin
        .from("rosters")
        .select("id")
        .eq("contest_id", contestId)
        .eq("user_id", userId)
        .single();
      if (!roster) throw new Error(`missing roster for ${userId}`);
      await admin.from("pod_members").insert({
        pod_id: podId,
        user_id: userId,
        roster_id: String((roster as { id: string }).id),
      });
    }
    const order = snakeDraftOrder(pod.userIds, draftRounds);
    const { error: draftError } = await admin.from("draft_picks").insert(
      order.map((userId, idx) => ({
        contest_id: contestId,
        pod_id: podId,
        pick_number: idx + 1,
        user_id: userId,
        player_id: null,
      })),
    );
    if (draftError) throw draftError;
    for (let i = 0; i < pod.userIds.length; i += 2) {
      if (i + 1 >= pod.userIds.length) break;
      await admin.from("matchups").insert({
        pod_id: podId,
        week: 1,
        user_id_a: pod.userIds[i],
        user_id_b: pod.userIds[i + 1],
      });
    }
  }
  await admin.from("contests").update({ status: "drafting" }).eq("id", contestId);
  return { podsCreated: created };
}

async function scoreWeek(admin: Admin, contestId: string, week: number) {
  const { scoreStatLine, applyGladiatorMultiplier } = await import(
    "../lib/game-engine/scoring"
  );
  const { resolveMatchup, eliminatedUserIds } = await import(
    "../lib/game-engine/elimination"
  );
  const { mockProvider } = await import("../lib/stats-provider/mock");

  const { data: contest } = await admin
    .from("contests")
    .select("*")
    .eq("id", contestId)
    .single();
  if (!contest) throw new Error("contest not found");
  const gameMode = String((contest as { game_mode: string }).game_mode);
  const weeklyStats = await mockProvider.getWeeklyStats(week, 2026);
  const statsByExternal = new Map(weeklyStats.map((s) => [s.playerExternalId, s]));
  const { data: players } = await admin.from("players").select("id, external_id");
  const externalById = new Map(
    ((players ?? []) as Array<{ id: string; external_id: string }>).map((p) => [
      p.id,
      p.external_id,
    ]),
  );
  const { data: rosters } = await admin
    .from("rosters")
    .select("id, user_id")
    .eq("contest_id", contestId);
  const { data: gladPicks } = await admin
    .from("gladiator_picks")
    .select("user_id, roster_player_id, multiplier_applied")
    .eq("contest_id", contestId)
    .eq("week", week);
  const gladByUser = new Map(
    (
      (gladPicks ?? []) as Array<{
        user_id: string;
        roster_player_id: string;
        multiplier_applied: number;
      }>
    ).map((g) => [g.user_id, g]),
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
      if (gameMode === "gladiator" && glad && glad.roster_player_id === rp.id) {
        playerScore = applyGladiatorMultiplier(
          playerScore,
          Number(glad.multiplier_applied),
        );
      }
      points += playerScore;
    }
    points = +points.toFixed(2);
    userPoints.set(roster.user_id, points);
    await admin.from("weekly_scores").upsert(
      {
        contest_id: contestId,
        user_id: roster.user_id,
        week,
        points,
        cumulative_points: points,
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
    for (const m of (matchups ?? []) as Array<{
      id: string;
      user_id_a: string;
      user_id_b: string;
    }>) {
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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const { NFL_PLAYER_SEEDS } = await import("../lib/data/nfl-players");
  const { GLADIATOR_MULTIPLIER } = await import("../lib/config");

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Seeding ${NFL_PLAYER_SEEDS.length} players…`);
  for (const group of chunk(NFL_PLAYER_SEEDS, 50)) {
    const { error } = await admin.from("players").upsert(
      group.map((p) => ({
        external_id: p.externalId,
        name: p.name,
        position: p.position,
        nfl_team: p.nflTeam,
      })),
      { onConflict: "external_id" },
    );
    if (error) throw error;
  }

  await admin.from("seasons").upsert({
    id: SEASON_ID,
    name: "2026 Season",
    start_week: 1,
    end_week: 17,
    status: "active",
  });

  await admin.from("contests").upsert({
    id: CLASSIC_ID,
    season_id: SEASON_ID,
    name: "Test Classic Field (120)",
    entry_fee_credits: 100,
    max_entrants: FIELD_SIZE,
    pod_size: POD_SIZE,
    game_mode: "classic",
    status: "open",
    current_week: 1,
    draft_rounds: DRAFT_ROUNDS,
  });

  await admin.from("contests").upsert({
    id: GLADIATOR_ID,
    season_id: SEASON_ID,
    name: "Test Gladiator Field (120)",
    entry_fee_credits: 250,
    max_entrants: FIELD_SIZE,
    pod_size: POD_SIZE,
    game_mode: "gladiator",
    status: "open",
    current_week: 1,
    draft_rounds: DRAFT_ROUNDS,
  });

  // Keep the small public contest open for manual entry testing.
  await admin
    .from("contests")
    .update({ status: "open", max_entrants: 12 })
    .eq("id", "00000000-0000-0000-0000-000000000002");

  console.log("Creating bot users…");
  const botIds: string[] = [];
  for (let i = 0; i < BOT_COUNT; i++) {
    const email = `bot-${String(i + 1).padStart(3, "0")}@gladiator.test`;
    const displayName = botName(i);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: BOT_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error?.message?.toLowerCase().includes("rate")) {
      console.warn("  auth rate limit — waiting 3s");
      await new Promise((r) => setTimeout(r, 3000));
      i -= 1;
      continue;
    }
    if (error) {
      const { data: existing } = await admin
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existing) {
        botIds.push(String((existing as { id: string }).id));
        if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${BOT_COUNT}`);
        continue;
      }
      console.warn(`  skip ${email}: ${error.message}`);
      continue;
    }
    if (data.user) {
      botIds.push(data.user.id);
      await admin
        .from("users")
        .update({ display_name: displayName })
        .eq("id", data.user.id);
    }
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${BOT_COUNT}`);
  }

  const { data: jaredRow } = await admin
    .from("users")
    .select("id")
    .eq("email", JARED_EMAIL)
    .maybeSingle();
  if (!jaredRow) throw new Error(`Could not find ${JARED_EMAIL} — sign in once first`);
  const jaredId = String((jaredRow as { id: string }).id);

  if (botIds.length < BOT_COUNT) {
    console.warn(
      `Only ${botIds.length}/${BOT_COUNT} bots ready. Field may not divide evenly.`,
    );
  }

  const field = Math.min(
    FIELD_SIZE,
    Math.floor((1 + botIds.length) / POD_SIZE) * POD_SIZE,
  );
  if (field < POD_SIZE) {
    throw new Error(`Not enough users to fill a pod (need ${POD_SIZE})`);
  }
  const classicEntrants = [jaredId, ...botIds].slice(0, field);
  const gladEntrants = [jaredId, ...botIds].slice(0, field);
  console.log(`Using field size ${field}`);

  async function ensureEntries(contestId: string, userIds: string[], fee: number) {
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
      if (!existing) {
        await admin.from("transactions").insert({
          user_id: userId,
          type: "credit_grant",
          credits: 5000,
        });
        await admin.from("contest_entries").insert({
          contest_id: contestId,
          user_id: userId,
        });
        if (fee > 0) {
          await admin.from("transactions").insert({
            user_id: userId,
            type: "entry_fee",
            credits: -fee,
          });
        }
      }
    }
  }

  console.log("Entering classic field…");
  await ensureEntries(CLASSIC_ID, classicEntrants, 100);
  console.log("Entering gladiator field…");
  await ensureEntries(GLADIATOR_ID, gladEntrants, 250);

  async function podIfNeeded(contestId: string) {
    const { count } = await admin
      .from("pods")
      .select("*", { count: "exact", head: true })
      .eq("contest_id", contestId);
    if ((count ?? 0) > 0) {
      console.log(`  pods already exist for ${contestId}`);
      await admin.from("contests").update({ status: "drafting" }).eq("id", contestId);
      return;
    }
    await admin.from("contests").update({ status: "open" }).eq("id", contestId);
    const result = await podContest(admin, contestId);
    console.log(`  podding`, result);
  }

  console.log("Podding…");
  await podIfNeeded(CLASSIC_ID);
  await podIfNeeded(GLADIATOR_ID);

  const { data: allPlayers } = await admin
    .from("players")
    .select("id, position")
    .order("external_id");
  const playerPool = (allPlayers ?? []) as Array<{ id: string; position: string }>;
  if (playerPool.length < POD_SIZE * DRAFT_ROUNDS) {
    throw new Error(`Need at least ${POD_SIZE * DRAFT_ROUNDS} players, have ${playerPool.length}`);
  }

  async function completeDrafts(contestId: string) {
    const { data: pods } = await admin
      .from("pods")
      .select("id")
      .eq("contest_id", contestId)
      .order("pod_number");
    for (const pod of (pods ?? []) as Array<{ id: string }>) {
      const { data: picks } = await admin
        .from("draft_picks")
        .select("id, user_id, pick_number, player_id")
        .eq("pod_id", pod.id)
        .order("pick_number");
      const remaining = [...playerPool];
      const rosterCounts = new Map<string, number>();
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

      const rosterPlayers: Array<Record<string, unknown>> = [];
      for (const pick of (picks ?? []) as Array<{
        id: string;
        user_id: string;
        pick_number: number;
        player_id: string | null;
      }>) {
        if (pick.player_id) {
          remaining.splice(
            remaining.findIndex((p) => p.id === pick.player_id),
            1,
          );
          continue;
        }
        const next = remaining.shift();
        if (!next) break;
        await admin
          .from("draft_picks")
          .update({
            player_id: next.id,
            picked_at: new Date().toISOString(),
          })
          .eq("id", pick.id);

        const rosterId = rosterIds.get(pick.user_id);
        if (!rosterId) continue;
        const count = rosterCounts.get(pick.user_id) ?? 0;
        rosterCounts.set(pick.user_id, count + 1);
        rosterPlayers.push({
          roster_id: rosterId,
          player_id: next.id,
          added_week: 1,
          is_starter: count < 5,
          slot_order: count,
        });
      }

      if (rosterPlayers.length) {
        await admin.from("roster_players").upsert(rosterPlayers, {
          onConflict: "roster_id,player_id",
        });
      }
    }

    await admin.from("contests").update({ status: "active" }).eq("id", contestId);
  }

  console.log("Completing classic drafts…");
  await completeDrafts(CLASSIC_ID);
  console.log("Completing gladiator drafts…");
  await completeDrafts(GLADIATOR_ID);

  console.log("Seeding gladiator picks…");
  const { data: gladRosters } = await admin
    .from("rosters")
    .select("id, user_id")
    .eq("contest_id", GLADIATOR_ID);
  let gladPickCount = 0;
  for (const [i, roster] of (
    (gladRosters ?? []) as Array<{ id: string; user_id: string }>
  ).entries()) {
    if (i % 3 !== 0) continue;
    const { data: rps } = await admin
      .from("roster_players")
      .select("id")
      .eq("roster_id", roster.id)
      .eq("is_starter", true)
      .limit(1);
    const rp = (rps ?? [])[0] as { id: string } | undefined;
    if (!rp) continue;
    const { error } = await admin.from("gladiator_picks").upsert(
      {
        contest_id: GLADIATOR_ID,
        roster_player_id: rp.id,
        user_id: roster.user_id,
        week: 1,
        score: 0,
        multiplier_applied: GLADIATOR_MULTIPLIER,
      },
      { onConflict: "contest_id,user_id,week" },
    );
    if (!error) gladPickCount += 1;
  }
  console.log(`  ${gladPickCount} gladiator picks`);

  console.log("Scoring week 1 classic…");
  console.log(await scoreWeek(admin, CLASSIC_ID, 1));
  console.log("Scoring week 1 gladiator…");
  console.log(await scoreWeek(admin, GLADIATOR_ID, 1));

  console.log("Seeding sample waiver claims…");
  const { data: unusedPlayers } = await admin
    .from("players")
    .select("id")
    .like("external_id", "nfl-%")
    .limit(20);
  const unused = ((unusedPlayers ?? []) as Array<{ id: string }>).map((p) => p.id);
  for (let i = 0; i < 8 && i < botIds.length && unused[i]; i++) {
    await admin.from("waiver_claims").insert({
      contest_id: CLASSIC_ID,
      user_id: botIds[i],
      add_player_id: unused[i],
      drop_player_id: null,
      status: "pending",
    });
  }

  const { count: classicEntries } = await admin
    .from("contest_entries")
    .select("*", { count: "exact", head: true })
    .eq("contest_id", CLASSIC_ID);
  const { count: gladEntries } = await admin
    .from("contest_entries")
    .select("*", { count: "exact", head: true })
    .eq("contest_id", GLADIATOR_ID);
  const { count: classicPods } = await admin
    .from("pods")
    .select("*", { count: "exact", head: true })
    .eq("contest_id", CLASSIC_ID);
  const { count: gladPods } = await admin
    .from("pods")
    .select("*", { count: "exact", head: true })
    .eq("contest_id", GLADIATOR_ID);

  const { data: jaredPod } = await admin
    .from("pod_members")
    .select("pod_id, pods!inner(pod_number, contest_id)")
    .eq("user_id", jaredId)
    .eq("pods.contest_id", CLASSIC_ID)
    .maybeSingle();

  console.log("\n=== Seed complete ===");
  console.log(
    JSON.stringify(
      {
        players: NFL_PLAYER_SEEDS.length,
        bots: botIds.length,
        classic: { id: CLASSIC_ID, entries: classicEntries, pods: classicPods },
        gladiator: { id: GLADIATOR_ID, entries: gladEntries, pods: gladPods },
        jared: {
          id: jaredId,
          classicPod: jaredPod,
        },
        login: { email: JARED_EMAIL, password: "Gladiator1!" },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
