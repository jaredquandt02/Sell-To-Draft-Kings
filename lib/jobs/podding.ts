import { createAdminClient } from "@/lib/supabase/admin";
import { assignPods, snakeDraftOrder } from "@/lib/game-engine/pods";
import { startJob, finishJob } from "./observability";

/**
 * Locks an open contest, assigns entrants into pods, seeds draft pick slots,
 * and pairs week-1 matchups. Deterministic shuffle seeded by contest id.
 */
export async function lockAndPodContest(contestId: string): Promise<{
  podsCreated: number;
  skipped: boolean;
}> {
  const admin = createAdminClient();
  const job = await startJob({
    contestId,
    jobType: "podding",
    idempotencyKey: `podding:${contestId}`,
  });
  if (job.skipped) return { podsCreated: 0, skipped: true };

  try {
    const { data: contest, error } = await admin
      .from("contests")
      .select("*")
      .eq("id", contestId)
      .single();
    if (error || !contest) throw error ?? new Error("contest not found");

    const c = contest as Record<string, unknown>;
    if (c.status !== "open") {
      await finishJob(job.id, { rowsAffected: 0, error: "not open" });
      return { podsCreated: 0, skipped: true };
    }

    const { data: entries } = await admin
      .from("contest_entries")
      .select("user_id")
      .eq("contest_id", contestId)
      .order("entered_at");

    const userIds = ((entries ?? []) as Array<{ user_id: string }>).map(
      (e) => e.user_id,
    );
    const podSize = Number(c.pod_size);
    if (userIds.length === 0 || userIds.length % podSize !== 0) {
      throw new Error(
        `Need a multiple of ${podSize} entrants; have ${userIds.length}`,
      );
    }

    const seeded = deterministicShuffle(userIds, contestId);
    const pods = assignPods(seeded, podSize);
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
      const draftRows = order.map((userId, idx) => ({
        contest_id: contestId,
        pod_id: podId,
        pick_number: idx + 1,
        user_id: userId,
        player_id: null,
      }));
      const { error: draftError } = await admin
        .from("draft_picks")
        .insert(draftRows);
      if (draftError) throw draftError;

      // Pair adjacent members for week 1 matchups
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

    await admin
      .from("contests")
      .update({ status: "drafting" })
      .eq("id", contestId);

    await finishJob(job.id, { rowsAffected: created });
    return { podsCreated: created, skipped: false };
  } catch (err) {
    await finishJob(job.id, {
      rowsAffected: 0,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** FNV-1a inspired deterministic shuffle for auditability. */
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
