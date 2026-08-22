import { getContest, getSessionUser, listPlayers } from "@/lib/data/contests";
import { getDisplayNames, getPodMembership } from "@/lib/data/game";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { DraftBoardDemo } from "@/components/draft/DraftBoardDemo";
import { LiveDraftBoard } from "@/components/draft/LiveDraftBoard";
import { players as mockPlayers, LEAGUE_ID } from "@/lib/mock/league";
import type { DraftPick } from "@/lib/types";
import Link from "next/link";

export default async function DraftPage({
  params,
}: {
  params: { leagueId: string };
}) {
  const contestId = params.leagueId === LEAGUE_ID ? params.leagueId : params.leagueId;
  const [contest, user, players] = await Promise.all([
    getContest(contestId),
    getSessionUser(),
    listPlayers(),
  ]);

  if (!isSupabaseConfigured() || !user || !contest) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Draft board</h1>
        <p className="text-sm text-gray-600">
          Demo draft — connect Supabase and enter a contest for a live pod draft.
        </p>
        <DraftBoardDemo initialAvailable={mockPlayers} />
      </div>
    );
  }

  const pod = await getPodMembership(contestId, user.id);
  if (!pod) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{contest.name} — Draft</h1>
        <p className="text-sm text-gray-600">
          Pods are not assigned yet. When the contest locks, drafts open per pod.
        </p>
        <Link href={`/contest/${contestId}`} className="text-sm underline">
          Back to contest
        </Link>
      </div>
    );
  }

  const supabase = createClient();
  const { data: pickRows } = await supabase
    .from("draft_picks")
    .select("*")
    .eq("pod_id", pod.podId)
    .order("pick_number");

  const picks: DraftPick[] = ((pickRows ?? []) as Record<string, unknown>[]).map(
    (r) => ({
      id: String(r.id),
      contestId: String(r.contest_id),
      podId: String(r.pod_id),
      pickNumber: Number(r.pick_number),
      userId: String(r.user_id),
      playerId: r.player_id ? String(r.player_id) : null,
      pickedAt: r.picked_at ? String(r.picked_at) : null,
    }),
  );

  const names = await getDisplayNames([...new Set(picks.map((p) => p.userId))]);
  const remaining = picks.filter((p) => !p.playerId).length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          {contest.gameMode === "gladiator" ? "Gladiator" : "Classic"} · {contest.status}
        </p>
        <h1 className="text-2xl font-bold">{contest.name} — Draft</h1>
        <p className="text-sm text-gray-600">
          Pod {pod.podNumber} · snake · {contest.draftRounds} rounds ·{" "}
          {remaining === 0 ? "complete" : `${remaining} picks left`}
        </p>
        <Link href={`/contest/${contestId}`} className="text-sm text-blue-600 underline">
          Back to contest
        </Link>
      </div>
      <LiveDraftBoard
        contestId={contestId}
        podId={pod.podId}
        picks={picks}
        players={players}
        currentUserId={user.id}
        displayNames={Object.fromEntries(names)}
        draftRounds={contest.draftRounds}
        podNumber={pod.podNumber}
      />
    </div>
  );
}
