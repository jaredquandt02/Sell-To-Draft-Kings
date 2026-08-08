"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";

export async function enterContestAction(
  contestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/");
  redirect("/");
}
