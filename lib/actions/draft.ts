"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config";

export async function makeDraftPickAction(input: {
  pickId: string;
  playerId: string;
  contestId: string;
  podId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: pick, error: pickError } = await supabase
    .from("draft_picks")
    .select("*")
    .eq("id", input.pickId)
    .maybeSingle();

  if (pickError || !pick) return { ok: false, error: "Pick not found" };

  const row = pick as Record<string, unknown>;
  if (String(row.user_id) !== user.id) {
    return { ok: false, error: "Not your turn" };
  }
  if (row.player_id) return { ok: false, error: "Already picked" };

  // Ensure no earlier unpicked slot exists
  const { data: earlier } = await supabase
    .from("draft_picks")
    .select("id")
    .eq("pod_id", input.podId)
    .is("player_id", null)
    .lt("pick_number", row.pick_number)
    .limit(1);

  if (earlier && earlier.length > 0) {
    return { ok: false, error: "Wait for earlier picks" };
  }

  const { data: taken } = await supabase
    .from("draft_picks")
    .select("id")
    .eq("pod_id", input.podId)
    .eq("player_id", input.playerId)
    .limit(1);

  if (taken && taken.length > 0) {
    return { ok: false, error: "Player already drafted" };
  }

  const { error: updateError } = await supabase
    .from("draft_picks")
    .update({
      player_id: input.playerId,
      picked_at: new Date().toISOString(),
    })
    .eq("id", input.pickId)
    .eq("user_id", user.id);

  if (updateError) return { ok: false, error: updateError.message };

  const { data: roster } = await supabase
    .from("rosters")
    .select("id")
    .eq("contest_id", input.contestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (roster) {
    const rosterId = String((roster as { id: string }).id);
    const { count } = await supabase
      .from("roster_players")
      .select("*", { count: "exact", head: true })
      .eq("roster_id", rosterId);

    await supabase.from("roster_players").insert({
      roster_id: rosterId,
      player_id: input.playerId,
      added_week: 1,
      is_starter: (count ?? 0) < 5,
      slot_order: count ?? 0,
    });
  }

  // If draft complete for pod, mark contest active when all pods done
  const { count: remaining } = await supabase
    .from("draft_picks")
    .select("*", { count: "exact", head: true })
    .eq("contest_id", input.contestId)
    .is("player_id", null);

  if (remaining === 0) {
    const admin = createAdminClient();
    await admin
      .from("contests")
      .update({ status: "active" })
      .eq("id", input.contestId)
      .eq("status", "drafting");
  }

  revalidatePath(`/draft/${input.contestId}`);
  revalidatePath("/team");
  return { ok: true };
}
