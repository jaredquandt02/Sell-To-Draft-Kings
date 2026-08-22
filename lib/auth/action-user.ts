import { createClient } from "@/lib/supabase/server";

/** Local JWT only — no Auth network round trip. */
export async function requireActionUser() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  return { supabase, user };
}
