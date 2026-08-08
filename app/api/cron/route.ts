import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config";
import { lockAndPodContest } from "@/lib/jobs/podding";
import {
  scoreContestWeek,
  runPhase2Cuts,
  processWaivers,
} from "@/lib/jobs/scoring";

/**
 * Vercel Cron / manual admin entry for weekly jobs.
 * Auth: Bearer CRON_SECRET (or x-cron-secret header).
 *
 * Query params:
 *   job=podding|scoring|phase2_cuts|waivers|all
 *   contestId=uuid (optional — runs all active contests when omitted)
 *   week=number (scoring)
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const ok =
    !secret ||
    auth === `Bearer ${secret}` ||
    headerSecret === secret;

  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "supabase not configured",
    });
  }

  const { searchParams } = new URL(request.url);
  const job = searchParams.get("job") ?? "all";
  const week = Number(searchParams.get("week") ?? "1");
  const contestIdParam = searchParams.get("contestId");

  const admin = createAdminClient();
  let contestIds: string[] = [];

  if (contestIdParam) {
    contestIds = [contestIdParam];
  } else {
    const { data } = await admin
      .from("contests")
      .select("id, status")
      .in("status", ["open", "drafting", "active", "phase2"]);
    contestIds = ((data ?? []) as Array<{ id: string }>).map((c) => c.id);
  }

  const results: unknown[] = [];

  for (const contestId of contestIds) {
    const { data: contest } = await admin
      .from("contests")
      .select("status, game_mode, current_week")
      .eq("id", contestId)
      .single();
    if (!contest) continue;
    const status = String((contest as { status: string }).status);
    const gameMode = String((contest as { game_mode: string }).game_mode);

    try {
      if (
        (job === "podding" || job === "all") &&
        status === "open"
      ) {
        results.push({
          contestId,
          job: "podding",
          ...(await lockAndPodContest(contestId)),
        });
      }

      if (
        (job === "scoring" || job === "all") &&
        (status === "active" || status === "phase2")
      ) {
        results.push({
          contestId,
          job: "scoring",
          ...(await scoreContestWeek(contestId, week)),
        });
      }

      if (
        (job === "phase2_cuts" || job === "all") &&
        gameMode === "gladiator" &&
        status === "active"
      ) {
        // Caller may trigger explicitly; "all" only when ?phase2=1
        if (job === "phase2_cuts" || searchParams.get("phase2") === "1") {
          results.push({
            contestId,
            job: "phase2_cuts",
            ...(await runPhase2Cuts(contestId)),
          });
        }
      }

      if (job === "waivers" || (job === "all" && searchParams.get("waivers") === "1")) {
        results.push({
          contestId,
          job: "waivers",
          ...(await processWaivers(contestId)),
        });
      }
    } catch (err) {
      results.push({
        contestId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
