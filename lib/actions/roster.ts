"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured, GLADIATOR_MULTIPLIER } from "@/lib/config";
import { canTriggerMedicCard } from "@/lib/game-engine/medic-card";
import { requireActionUser } from "@/lib/auth/action-user";

export async function setLineupAction(input: {
  rosterId: string;
  starterPlayerIds: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: roster } = await supabase
    .from("rosters")
    .select("id, user_id")
    .eq("id", input.rosterId)
    .maybeSingle();

  if (!roster || String((roster as { user_id: string }).user_id) !== user.id) {
    return { ok: false, error: "Roster not found" };
  }

  await supabase
    .from("roster_players")
    .update({ is_starter: false })
    .eq("roster_id", input.rosterId);

  if (input.starterPlayerIds.length) {
    await supabase
      .from("roster_players")
      .update({ is_starter: true })
      .eq("roster_id", input.rosterId)
      .in("player_id", input.starterPlayerIds);
  }

  revalidatePath("/team");
  return { ok: true };
}

export async function submitWaiverClaimAction(input: {
  contestId: string;
  addPlayerId: string;
  dropPlayerId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("waiver_claims").insert({
    contest_id: input.contestId,
    user_id: user.id,
    add_player_id: input.addPlayerId,
    drop_player_id: input.dropPlayerId,
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/waivers");
  return { ok: true };
}

export async function submitGladiatorPickAction(input: {
  contestId: string;
  rosterPlayerId: string;
  week: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: rp } = await supabase
    .from("roster_players")
    .select("id, used_as_gladiator_week, roster_id")
    .eq("id", input.rosterPlayerId)
    .maybeSingle();

  if (!rp) return { ok: false, error: "Player not on roster" };
  const rpRow = rp as Record<string, unknown>;
  if (rpRow.used_as_gladiator_week != null) {
    return { ok: false, error: "Already used as gladiator" };
  }

  const { error } = await supabase.from("gladiator_picks").insert({
    contest_id: input.contestId,
    roster_player_id: input.rosterPlayerId,
    user_id: user.id,
    week: input.week,
    score: 0,
    multiplier_applied: GLADIATOR_MULTIPLIER,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/gladiator-pick/${input.week}`);
  return { ok: true };
}

export async function useMedicCardAction(input: {
  contestId: string;
  week: number;
  injuredPlayerId: string;
  backupPlayerId: string;
  rosterId: string;
  injuredStatuses: Array<{ playerId: string; isInjured: boolean }>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: existing } = await supabase
    .from("medic_card_uses")
    .select("id")
    .eq("contest_id", input.contestId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { ok: false, error: "Medic Card already used" };

  if (
    !canTriggerMedicCard(
      false,
      input.injuredStatuses.map((s) => ({
        playerId: s.playerId,
        isInjured: s.isInjured,
      })),
    )
  ) {
    return { ok: false, error: "No injured starter" };
  }

  const { error } = await supabase.from("medic_card_uses").insert({
    contest_id: input.contestId,
    user_id: user.id,
    triggered_week: input.week,
    backup_player_id: input.backupPlayerId,
  });

  if (error) return { ok: false, error: error.message };

  await supabase
    .from("roster_players")
    .update({ is_starter: false })
    .eq("roster_id", input.rosterId)
    .eq("player_id", input.injuredPlayerId);

  await supabase
    .from("roster_players")
    .update({ is_starter: true })
    .eq("roster_id", input.rosterId)
    .eq("player_id", input.backupPlayerId);

  revalidatePath("/team");
  return { ok: true };
}
