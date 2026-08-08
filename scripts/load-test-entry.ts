/**
 * Load-test helper for contest entry + podding throughput.
 *
 * Usage (with Supabase service role configured):
 *   npx tsx scripts/load-test-entry.ts --contest <uuid> --users 1000
 *
 * Creates synthetic auth users (or reuses emails), grants credits, enters
 * the contest, then runs lockAndPodContest. Prints timing summary.
 *
 * Safe for staging only — never point at production without a dry-run.
 */
import { createClient } from "@supabase/supabase-js";
import { assignPods } from "../lib/game-engine/pods";

function arg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  if (fallback != null) return fallback;
  throw new Error(`Missing --${name}`);
}

async function main() {
  const contestId = arg("contest", "00000000-0000-0000-0000-000000000002");
  const userCount = Number(arg("users", "48"));
  const dryRun = process.argv.includes("--dry-run");
  const podSizeArg = process.argv.includes("--pod-size")
    ? Number(arg("pod-size"))
    : 6;

  if (dryRun) {
    if (userCount % podSizeArg !== 0) {
      console.error(
        `users (${userCount}) must be divisible by pod_size (${podSizeArg})`,
      );
      process.exit(1);
    }
    console.log(
      JSON.stringify(
        {
          contestId,
          userCount,
          podSize: podSizeArg,
          dryRun: true,
          expectedPods: userCount / podSizeArg,
        },
        null,
        2,
      ),
    );
    const fakeIds = Array.from({ length: userCount }, (_, i) => `u${i}`);
    const t0 = performance.now();
    const pods = assignPods(fakeIds, podSizeArg);
    console.log(
      `dry-run podding: ${pods.length} pods in ${(performance.now() - t0).toFixed(1)}ms`,
    );
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: contest, error: contestError } = await admin
    .from("contests")
    .select("*")
    .eq("id", contestId)
    .single();

  if (contestError || !contest) {
    console.error("Contest not found", contestError);
    process.exit(1);
  }

  const podSize = Number(contest.pod_size);
  if (userCount % podSize !== 0) {
    console.error(`users (${userCount}) must be divisible by pod_size (${podSize})`);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        contestId,
        userCount,
        podSize,
        dryRun: false,
        expectedPods: userCount / podSize,
      },
      null,
      2,
    ),
  );

  const tEntry = performance.now();
  const userIds: string[] = [];

  for (let i = 0; i < userCount; i++) {
    const email = `loadtest+${contestId.slice(0, 8)}-${i}@example.com`;
    const password = "loadtest-password-123";

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: `Load ${i}` },
      });

    let userId = created?.user?.id;
    if (createError || !userId) {
      // Likely already exists — look up
      const { data: list } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const found = list?.users.find((u) => u.email === email);
      if (!found) {
        console.error("Failed to create/find user", email, createError);
        continue;
      }
      userId = found.id;
    }

    userIds.push(userId);

    // Ensure credits
    await admin.from("transactions").insert({
      user_id: userId,
      type: "credit_grant",
      credits: 5000,
    });

    // Enter via direct insert mirroring enter_contest (service role)
    const { data: existing } = await admin
      .from("contest_entries")
      .select("id")
      .eq("contest_id", contestId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      await admin.from("rosters").upsert(
        { user_id: userId, contest_id: contestId },
        { onConflict: "user_id,contest_id" },
      );
      await admin.from("contest_entries").insert({
        contest_id: contestId,
        user_id: userId,
      });
      const fee = Number(contest.entry_fee_credits);
      if (fee > 0) {
        await admin.from("transactions").insert({
          user_id: userId,
          type: "entry_fee",
          credits: -fee,
        });
      }
    }
  }

  const entryMs = performance.now() - tEntry;
  console.log(`Entered ${userIds.length} users in ${entryMs.toFixed(0)}ms`);

  // Podding in-process (mirrors lib/jobs/podding deterministic path)
  const { lockAndPodContest } = await import("../lib/jobs/podding");
  const tPod = performance.now();
  const result = await lockAndPodContest(contestId);
  console.log(
    `Podding result`,
    result,
    `in ${(performance.now() - tPod).toFixed(0)}ms`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
