import { NextResponse } from "next/server";
import { getSessionUser, getCreditBalance } from "@/lib/data/contests";
import { getNavContests } from "@/lib/data/game";
import { isSupabaseConfigured } from "@/lib/config";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ user: null, credits: null, contests: [] });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null, credits: null, contests: [] });
  }
  const [credits, contests] = await Promise.all([
    getCreditBalance(user.id),
    getNavContests(user.id),
  ]);
  return NextResponse.json({
    user: { id: user.id, displayName: user.displayName },
    credits,
    contests,
  });
}
