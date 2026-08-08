import { createAdminClient } from "@/lib/supabase/admin";
import type { ContestJobType } from "@/lib/types";

export async function startJob(input: {
  contestId: string | null;
  jobType: ContestJobType;
  week?: number;
  idempotencyKey: string;
}): Promise<{ id: string; skipped: boolean }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("contest_jobs")
    .select("id, status")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; status: string };
    if (row.status === "succeeded" || row.status === "running") {
      return { id: row.id, skipped: true };
    }
  }

  const { data, error } = await admin
    .from("contest_jobs")
    .insert({
      contest_id: input.contestId,
      job_type: input.jobType,
      week: input.week ?? null,
      status: "running",
      idempotency_key: input.idempotencyKey,
    })
    .select("id")
    .single();

  if (error) {
    // Unique race — treat as skipped
    if (error.code === "23505") {
      return { id: "duplicate", skipped: true };
    }
    throw error;
  }

  return { id: String((data as { id: string }).id), skipped: false };
}

export async function finishJob(
  jobId: string,
  result: { rowsAffected: number; error?: string },
) {
  if (jobId === "duplicate") return;
  const admin = createAdminClient();
  await admin
    .from("contest_jobs")
    .update({
      status: result.error ? "failed" : "succeeded",
      finished_at: new Date().toISOString(),
      rows_affected: result.rowsAffected,
      error: result.error ?? null,
    })
    .eq("id", jobId);
}
