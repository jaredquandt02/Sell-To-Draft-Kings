import Link from "next/link";
import { getSessionUser } from "@/lib/data/contests";
import {
  getUserContests,
  resolveContestForUser,
  getRosterRows,
} from "@/lib/data/game";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { TeamDemo } from "@/components/team/TeamDemo";
import { TeamManager } from "@/components/team/TeamManager";
import { ContestSwitcher } from "@/components/app/ContestSwitcher";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { contestId?: string };
}) {
  const user = await getSessionUser();

  if (!isSupabaseConfigured() || !user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My team</h1>
        <TeamDemo />
      </div>
    );
  }

  const mine = await getUserContests(user.id);
  const contest = await resolveContestForUser(user.id, searchParams.contestId);
  if (!contest) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My team</h1>
        <p className="text-sm text-gray-600">
          Enter a contest from the{" "}
          <Link href="/lobby" className="underline">
            lobby
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const { data: medic } = await supabase
    .from("medic_card_uses")
    .select("id")
    .eq("contest_id", contest.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const rows = await getRosterRows(contest.rosterId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My team</h1>
        <p className="text-sm text-gray-500">
          {contest.name} · week {contest.currentWeek}
          {contest.podNumber ? ` · pod ${contest.podNumber}` : ""}
        </p>
      </div>
      <ContestSwitcher contests={mine} currentId={contest.id} basePath="/team" />
      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">
          No players yet — finish the{" "}
          <Link href={`/draft/${contest.id}`} className="underline">
            draft
          </Link>
          .
        </p>
      ) : (
        <TeamManager
          contestId={contest.id}
          rosterId={contest.rosterId}
          week={contest.currentWeek}
          rows={rows}
          hasUsedMedic={Boolean(medic)}
          gameMode={contest.gameMode}
        />
      )}
    </div>
  );
}
