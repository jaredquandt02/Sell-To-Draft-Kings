import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getSessionUser } from "@/lib/data/contests";
import {
  getUserContests,
  resolveContestForUser,
  getPodDetail,
} from "@/lib/data/game";
import { ContestSwitcher } from "@/components/app/ContestSwitcher";
import { isSupabaseConfigured } from "@/lib/config";
import {
  CURRENT_USER_ID,
  POD_ID,
  displayName,
  weeklyPoints,
  yourPodMatchups,
} from "@/lib/mock/league";

export default async function MatchupPage({
  searchParams,
}: {
  searchParams: { contestId?: string };
}) {
  const user = await getSessionUser();

  if (!isSupabaseConfigured() || !user) {
    const m = yourPodMatchups.find(
      (x) => x.userIdA === CURRENT_USER_ID || x.userIdB === CURRENT_USER_ID,
    )!;
    const opp = m.userIdA === CURRENT_USER_ID ? m.userIdB : m.userIdA;
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Matchup</h1>
        <Card>
          <p className="text-lg font-medium">
            You {weeklyPoints(CURRENT_USER_ID)} — {weeklyPoints(opp)}{" "}
            {displayName(opp)}
          </p>
          <Link href={`/pod/${POD_ID}`} className="mt-2 inline-block text-sm text-blue-600 underline">
            Full pod
          </Link>
        </Card>
      </div>
    );
  }

  const mine = await getUserContests(user.id);
  const contest = await resolveContestForUser(user.id, searchParams.contestId);
  if (!contest) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Matchup</h1>
        <p className="text-sm text-gray-600">
          <Link href="/lobby" className="underline">
            Enter a contest
          </Link>{" "}
          to see matchups.
        </p>
      </div>
    );
  }

  const detail = contest.podId ? await getPodDetail(contest.podId) : null;
  const matchup = detail?.matchups.find(
    (m) => m.userIdA === user.id || m.userIdB === user.id,
  );
  const data = detail
    ? {
        pod: contest.podId
          ? {
              podId: contest.podId,
              podNumber: contest.podNumber ?? 0,
              eliminatedAtWeek: contest.eliminatedAtWeek,
            }
          : null,
        detail,
        matchup,
      }
    : null;
  const oppId =
    data?.matchup &&
    (data.matchup.userIdA === user.id
      ? data.matchup.userIdB
      : data.matchup.userIdA);
  const oppName = oppId
    ? data?.detail.members.find((m) => m.userId === oppId)?.displayName
    : null;
  const yourPts =
    data?.matchup && data.matchup.userIdA === user.id
      ? data.matchup.pointsA
      : data?.matchup?.pointsB;
  const oppPts =
    data?.matchup && data.matchup.userIdA === user.id
      ? data.matchup.pointsB
      : data?.matchup?.pointsA;
  const youWon = data?.matchup?.winnerId === user.id;
  const theyWon = data?.matchup?.winnerId && data.matchup.winnerId !== user.id;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Matchup</h1>
        <p className="text-sm text-gray-500">
          {contest.name} · week {contest.currentWeek} ·{" "}
          {contest.gameMode === "gladiator" ? "elimination" : "classic H2H"}
        </p>
      </div>
      <ContestSwitcher contests={mine} currentId={contest.id} basePath="/matchup" />

      {!data?.matchup ? (
        <Card>
          <p className="text-sm text-gray-600">
            {data?.pod
              ? `No matchup posted for week ${contest.currentWeek} yet.`
              : "Waiting for pods to lock."}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">You</p>
              <p className="text-3xl font-semibold tabular-nums">
                {yourPts != null ? yourPts.toFixed(1) : "—"}
              </p>
            </div>
            <p className="text-sm text-gray-400">vs</p>
            <div>
              <p className="text-xs text-gray-500">{oppName ?? "Opponent"}</p>
              <p className="text-3xl font-semibold tabular-nums">
                {oppPts != null ? oppPts.toFixed(1) : "—"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">
            {!data.matchup.winnerId
              ? "Not finalized"
              : youWon
                ? contest.gameMode === "gladiator"
                  ? "You advance"
                  : "You won"
                : theyWon
                  ? contest.gameMode === "gladiator"
                    ? "Eliminated this week"
                    : "You lost"
                  : "Tie — both advance"}
          </p>
          {data.pod ? (
            <p className="mt-3 text-center">
              <Link href={`/pod/${data.pod.podId}`} className="text-sm text-blue-600 underline">
                Full pod {data.pod.podNumber}
              </Link>
            </p>
          ) : null}
        </Card>
      )}

      {data?.detail ? (
        <Card>
          <p className="mb-2 text-sm font-medium text-gray-500">Your starters</p>
          <p className="text-sm text-gray-700">
            {data.detail.members.find((m) => m.userId === user.id)?.starterNames.join(" · ") ||
              "None set"}
          </p>
          <Link href={`/team?contestId=${contest.id}`} className="mt-2 inline-block text-sm text-blue-600 underline">
            Edit lineup
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
