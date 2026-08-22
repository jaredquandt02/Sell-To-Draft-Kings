"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { requireActionUser } from "@/lib/auth/action-user";

export async function enterContestAction(
  contestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.rpc("enter_contest", {
    p_contest_id: contestId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/lobby");
  revalidatePath("/dashboard");
  revalidatePath(`/contest/${contestId}`);
  return { ok: true };
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const { supabase } = await requireActionUser();
    await supabase.auth.signOut();
  }
  revalidatePath("/");
  redirect("/");
}
