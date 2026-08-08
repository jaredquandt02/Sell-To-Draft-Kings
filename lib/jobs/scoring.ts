import { createAdminClient } from "@/lib/supabase/admin";
import { statsProvider } from "@/lib/stats-provider";
import {
  scoreStatLine,
  applyGladiatorMultiplier,
  type StatLine,
} from "@/lib/game-engine/scoring";
import { resolveMatchup, eliminatedUserIds } from "@/lib/game-engine/elimination";
import { usersCutByMedian } from "@/lib/game-engine/phase2-cuts";
import { waiverOrder } from "@/lib/game-engine/redraft";
import { isGladiatorMode } from "@/lib/config";
import { startJob, finishJob } from "./observability";
import type { GameMode } from "@/lib/types";

/**
 * Fetch week stats once, score every roster in the contest in batches,
 * write weekly_scores, and resolve matchups. In gladiator mode, mark
 * eliminations.
 */
export async function scoreContestWeek(
  contestId: string,
  week: number,
  seasonYear = 2026,
): Promise<{ scored: number; skipped: boolean }> {
  const admin = createAdminClient();
  const job = await startJob({
    contestId,
    jobType: "scoring",
    week,
    idempotencyKey: `scoring:${contestId}:${week}`,
  });
  if (job.skipped) return { scored: 0, skipped: true };

  try {
    const { data: contest } = await admin
      .from("contests")
      .select("*")
      .eq("id", contestId)
      .single();
    if (!contest) throw new Error("contest not found");
    const c = contest as Record<string, unknown>;
    const gameMode = (c.game_mode as GameMode) ?? "classic";

    const weeklyStats = await statsProvider.getWeeklyStats(week, seasonYear);
    const statsByExternal = new Map(
      weeklyStats.map((s) => [s.playerExternalId, s]),
    );

    const { data: players } = await admin
      .from("players")
      .select("id, external_id");
    const externalById = new Map(
      ((players ?? []) as Array<{ id: string; external_id: string }>).map(
        (p) => [p.id, p.external_id],
      ),
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

    let scored = 0;
    const userPoints = new Map<string, number>();

    for (const roster of (rosters ?? []) as Array<{
      id: string;
      user_id: string;
    }>) {
      const { data: rps } = await admin
        .from("roster_players")
        .select("id, player_id, is_starter")
        .eq("roster_id", roster.id)
        .eq("is_starter", true);

      let points = 0;
      const glad = gladByUser.get(roster.user_id);

      for (const rp of (rps ?? []) as Array<{
        id: string;
        player_id: string;
        is_starter: boolean;
      }>) {
        const ext = externalById.get(rp.player_id);
        const raw = ext ? statsByExternal.get(ext) : undefined;
        const line: StatLine = raw
          ? {
              passYards: raw.passYards,
              passTouchdowns: raw.passTouchdowns,
              interceptions: raw.interceptions,
              rushYards: raw.rushYards,
              rushTouchdowns: raw.rushTouchdowns,
              receptions: raw.receptions,
              receivingYards: raw.receivingYards,
              receivingTouchdowns: raw.receivingTouchdowns,
              fumblesLost: raw.fumblesLost,
            }
          : {};
        let playerScore = scoreStatLine(line);
        if (
          isGladiatorMode(gameMode) &&
          glad &&
          glad.roster_player_id === rp.id
        ) {
          playerScore = applyGladiatorMultiplier(
            playerScore,
            Number(glad.multiplier_applied),
          );
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

      const prevCum = prev
        ? Number((prev as { cumulative_points: number }).cumulative_points)
        : 0;

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

    // Resolve matchups for this week
    const { data: pods } = await admin
      .from("pods")
      .select("id")
      .eq("contest_id", contestId);

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
        await admin
          .from("matchups")
          .update({ winner_id: result.winnerId })
          .eq("id", m.id);
      }
    }

    if (isGladiatorMode(gameMode)) {
      const elimJob = await startJob({
        contestId,
        jobType: "elimination",
        week,
        idempotencyKey: `elimination:${contestId}:${week}`,
      });
      if (!elimJob.skipped) {
        const eliminated = eliminatedUserIds(matchupResults);
        let rows = 0;
        for (const userId of eliminated) {
          const { data: member } = await admin
            .from("pod_members")
            .select("pod_id")
            .eq("user_id", userId)
            .is("eliminated_at_week", null);
          for (const mem of (member ?? []) as Array<{ pod_id: string }>) {
            // Verify pod belongs to this contest
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
            rows += 1;
          }
        }
        await finishJob(elimJob.id, { rowsAffected: rows });
      }
    }

    await admin
      .from("contests")
      .update({ current_week: week })
      .eq("id", contestId);

    await finishJob(job.id, { rowsAffected: scored });
    return { scored, skipped: false };
  } catch (err) {
    await finishJob(job.id, {
      rowsAffected: 0,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function runPhase2Cuts(contestId: string): Promise<{
  cut: number;
  skipped: boolean;
}> {
  const admin = createAdminClient();
  const job = await startJob({
    contestId,
    jobType: "phase2_cuts",
    idempotencyKey: `phase2_cuts:${contestId}`,
  });
  if (job.skipped) return { cut: 0, skipped: true };

  try {
    const { data: contest } = await admin
      .from("contests")
      .select("current_week, game_mode")
      .eq("id", contestId)
      .single();
    if (!contest) throw new Error("contest not found");
    const week = Number((contest as { current_week: number }).current_week);

    const { data: scores } = await admin
      .from("weekly_scores")
      .select("user_id, cumulative_points")
      .eq("contest_id", contestId)
      .eq("week", week);

    const standings = (
      (scores ?? []) as Array<{ user_id: string; cumulative_points: number }>
    ).map((s) => ({
      userId: s.user_id,
      cumulativePoints: Number(s.cumulative_points),
    }));

    const cutIds = usersCutByMedian(standings);
    // Mark cut users as eliminated at current week across their pods
    let rows = 0;
    const { data: pods } = await admin
      .from("pods")
      .select("id")
      .eq("contest_id", contestId);
    const podIds = new Set(
      ((pods ?? []) as Array<{ id: string }>).map((p) => p.id),
    );

    for (const userId of cutIds) {
      const { data: members } = await admin
        .from("pod_members")
        .select("pod_id")
        .eq("user_id", userId)
        .is("eliminated_at_week", null);
      for (const m of (members ?? []) as Array<{ pod_id: string }>) {
        if (!podIds.has(m.pod_id)) continue;
        await admin
          .from("pod_members")
          .update({ eliminated_at_week: week })
          .eq("pod_id", m.pod_id)
          .eq("user_id", userId);
        rows += 1;
      }
    }

    await admin
      .from("contests")
      .update({ status: "phase2" })
      .eq("id", contestId);

    await finishJob(job.id, { rowsAffected: rows });
    return { cut: rows, skipped: false };
  } catch (err) {
    await finishJob(job.id, {
      rowsAffected: 0,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function processWaivers(contestId: string): Promise<{
  fulfilled: number;
  skipped: boolean;
}> {
  const admin = createAdminClient();
  const job = await startJob({
    contestId,
    jobType: "waivers",
    idempotencyKey: `waivers:${contestId}:${Date.now()}`,
  });
  // Use date-bucketed key for daily runs would be better — for idempotent
  // daily: callers should pass a stable key. Here we allow re-run of pending.

  try {
    const { data: claims } = await admin
      .from("waiver_claims")
      .select("*")
      .eq("contest_id", contestId)
      .eq("status", "pending")
      .order("created_at");

    const { data: scores } = await admin
      .from("weekly_scores")
      .select("user_id, points, cumulative_points, week")
      .eq("contest_id", contestId);

    // Approximate wins from matchups
    const { data: pods } = await admin
      .from("pods")
      .select("id")
      .eq("contest_id", contestId);
    const podIds = ((pods ?? []) as Array<{ id: string }>).map((p) => p.id);
    const wins = new Map<string, number>();
    if (podIds.length) {
      const { data: matchups } = await admin
        .from("matchups")
        .select("winner_id, pod_id")
        .in("pod_id", podIds);
      for (const m of (matchups ?? []) as Array<{
        winner_id: string | null;
      }>) {
        if (!m.winner_id) continue;
        wins.set(m.winner_id, (wins.get(m.winner_id) ?? 0) + 1);
      }
    }

    const latestByUser = new Map<
      string,
      { cumulativePoints: number; wins: number }
    >();
    for (const s of (scores ?? []) as Array<{
      user_id: string;
      cumulative_points: number;
    }>) {
      latestByUser.set(s.user_id, {
        cumulativePoints: Number(s.cumulative_points),
        wins: wins.get(s.user_id) ?? 0,
      });
    }

    const order = waiverOrder(
      [...latestByUser.entries()].map(([userId, v]) => ({
        userId,
        wins: v.wins,
        cumulativePoints: v.cumulativePoints,
      })),
    );
    const priority = new Map(order.map((id, i) => [id, i]));

    const sortedClaims = [
      ...((claims ?? []) as Array<Record<string, unknown>>),
    ].sort(
      (a, b) =>
        (priority.get(String(a.user_id)) ?? 999) -
        (priority.get(String(b.user_id)) ?? 999),
    );

    const takenPlayers = new Set<string>();
    let fulfilled = 0;

    for (const claim of sortedClaims) {
      const addId = String(claim.add_player_id);
      if (takenPlayers.has(addId)) {
        await admin
          .from("waiver_claims")
          .update({ status: "cancelled" })
          .eq("id", claim.id);
        continue;
      }

      const { data: roster } = await admin
        .from("rosters")
        .select("id")
        .eq("contest_id", contestId)
        .eq("user_id", claim.user_id)
        .maybeSingle();
      if (!roster) continue;

      const rosterId = String((roster as { id: string }).id);
      if (claim.drop_player_id) {
        await admin
          .from("roster_players")
          .delete()
          .eq("roster_id", rosterId)
          .eq("player_id", claim.drop_player_id);
      }

      await admin.from("roster_players").insert({
        roster_id: rosterId,
        player_id: addId,
        added_week: 1,
        is_starter: false,
        slot_order: 99,
      });

      takenPlayers.add(addId);
      await admin
        .from("waiver_claims")
        .update({ status: "fulfilled" })
        .eq("id", claim.id);
      fulfilled += 1;
    }

    await finishJob(job.id, { rowsAffected: fulfilled });
    return { fulfilled, skipped: false };
  } catch (err) {
    await finishJob(job.id, {
      rowsAffected: 0,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
