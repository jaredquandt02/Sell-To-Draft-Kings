import Link from "next/link";
import { getSessionUser, listPlayers } from "@/lib/data/contests";
import {
  getUserContests,
  resolveContestForUser,
  getRosterRows,
  getPendingWaivers,
  getDisplayNames,
} from "@/lib/data/game";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { WaiverForm } from "@/components/waivers/WaiverForm";
import { ContestSwitcher } from "@/components/app/ContestSwitcher";
import { Card } from "@/components/ui/Card";

export default async function WaiversPage({
  searchParams,
}: {
  searchParams: { contestId?: string };
}) {
  const user = await getSessionUser();

  if (!isSupabaseConfigured() || !user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Waivers</h1>
        <p className="text-sm text-gray-600">Sign in and enter a contest to claim free agents.</p>
      </div>
    );
  }

  const mine = await getUserContests(user.id);
  const contest = await resolveContestForUser(user.id, searchParams.contestId);
  if (!contest) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Waivers</h1>
        <p className="text-sm text-gray-600">
          <Link href="/lobby" className="underline">Enter a contest</Link> first.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const allPlayers = await listPlayers();
  const onRoster = (await getRosterRows(contest.rosterId)).map((r) => r.player);

  const draftedIds = new Set<string>();
  const { data: drafted } = await supabase
    .from("draft_picks")
    .select("player_id")
    .eq("contest_id", contest.id)
    .not("player_id", "is", null);
  for (const d of (drafted ?? []) as Array<{ player_id: string }>) draftedIds.add(d.player_id);

  const { data: allRosteredInContest } = await supabase
    .from("roster_players")
    .select("player_id, rosters!inner(contest_id)")
    .eq("rosters.contest_id", contest.id);
  for (const r of (allRosteredInContest ?? []) as Array<{ player_id: string }>) {
    draftedIds.add(r.player_id);
  }

  const freeAgents = allPlayers.filter((p) => !draftedIds.has(p.id));
  const pending = (await getPendingWaivers(contest.id)) as Array<Record<string, unknown>>;
  const claimerIds = pending.map((p) => String(p.user_id));
  const names = await getDisplayNames(claimerIds);
  const playerById = new Map(allPlayers.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Waivers</h1>
        <p className="text-sm text-gray-500">
          {contest.name} · {freeAgents.length} free agents · worst-record-first
        </p>
      </div>
      <ContestSwitcher contests={mine} currentId={contest.id} basePath="/waivers" />
      <WaiverForm
        contestId={contest.id}
        freeAgents={freeAgents}
        rosterPlayers={onRoster}
      />
      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">Pending claims</p>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">None queued.</p>
        ) : (
          <ul className="divide-y divide-gray-200 text-sm">
            {pending.map((c) => {
              const add = playerById.get(String(c.add_player_id));
              return (
                <li key={String(c.id)} className="flex justify-between py-2">
                  <span>
                    {names.get(String(c.user_id)) ?? "Manager"} wants{" "}
                    {add ? `${add.name} (${add.position})` : "a player"}
                  </span>
                  <span className="text-xs text-gray-400">pending</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
