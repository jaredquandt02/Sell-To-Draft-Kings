import Link from "next/link";
import {
  getContest,
  getSessionUser,
  getUserEntry,
} from "@/lib/data/contests";
import { isSupabaseConfigured } from "@/lib/config";
import { EnterContestButton } from "@/components/lobby/ContestCard";
import { Card } from "@/components/ui/Card";
import {
  getPodMembership,
  getStandings,
  getUserStanding,
} from "@/lib/data/game";
import { createClient } from "@/lib/supabase/server";

export default async function ContestPage({
  params,
}: {
  params: { contestId: string };
}) {
  const contest = await getContest(params.contestId);
  const user = await getSessionUser();

  if (!contest) {
    return <p className="text-sm text-gray-600">Contest not found.</p>;
  }

  const entry =
    user && isSupabaseConfigured()
      ? await getUserEntry(contest.id, user.id)
      : null;

  const pod =
    user && entry
      ? await getPodMembership(contest.id, user.id)
      : null;
  const standing =
    user && entry
      ? await getUserStanding(contest.id, user.id, contest.currentWeek)
      : null;
  const top = await getStandings(contest.id, contest.currentWeek);

  let entrantCount = 0;
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { count } = await supabase
      .from("contest_entries")
      .select("*", { count: "exact", head: true })
      .eq("contest_id", contest.id);
    entrantCount = count ?? 0;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          {contest.gameMode === "gladiator" ? "Gladiator elimination" : "Classic H2H"}{" "}
          · {contest.status}
        </p>
        <h1 className="text-2xl font-bold">{contest.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {contest.entryFeeCredits} credits · {entrantCount}/{contest.maxEntrants}{" "}
          entered · pods of {contest.podSize} · week {contest.currentWeek}
        </p>
      </div>

      {!entry && contest.status === "open" && user ? (
        <EnterContestButton contestId={contest.id} />
      ) : null}

      {entry ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs text-gray-500">Your rank</p>
            <p className="mt-1 text-2xl font-semibold">
              {standing ? `#${standing.rank}` : "—"}
            </p>
            <p className="text-sm text-gray-600">
              {standing
                ? `${standing.cumulativePoints.toFixed(1)} total`
                : "Awaiting scores"}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">This week</p>
            <p className="mt-1 text-2xl font-semibold">
              {standing ? standing.points.toFixed(1) : "—"}
            </p>
            <p className="text-sm text-gray-600">
              {pod ? `Pod ${pod.podNumber}` : "No pod yet"}
              {pod?.eliminatedAtWeek
                ? ` · out week ${pod.eliminatedAtWeek}`
                : ""}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">Field</p>
            <p className="mt-1 text-2xl font-semibold">
              {entrantCount.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">
              {Math.floor(entrantCount / contest.podSize)} pods
            </p>
          </Card>
        </div>
      ) : null}

      {entry ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50" href={`/draft/${contest.id}`}>
            <p className="font-medium">Draft board</p>
            <p className="text-sm text-gray-600">Snake draft for your pod</p>
          </Link>
          <Link className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50" href={`/team?contestId=${contest.id}`}>
            <p className="font-medium">My team</p>
            <p className="text-sm text-gray-600">Set starters{contest.gameMode === "gladiator" ? " · Medic Card" : ""}</p>
          </Link>
          <Link className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50" href={`/matchup?contestId=${contest.id}`}>
            <p className="font-medium">Matchup</p>
            <p className="text-sm text-gray-600">This week&apos;s 1v1</p>
          </Link>
          <Link className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50" href={`/leaderboard?contestId=${contest.id}`}>
            <p className="font-medium">Standings</p>
            <p className="text-sm text-gray-600">Full contest leaderboard</p>
          </Link>
          {pod ? (
            <Link className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50" href={`/pod/${pod.podId}`}>
              <p className="font-medium">Pod {pod.podNumber}</p>
              <p className="text-sm text-gray-600">Members and results</p>
            </Link>
          ) : null}
          <Link className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50" href={`/waivers?contestId=${contest.id}`}>
            <p className="font-medium">Waivers</p>
            <p className="text-sm text-gray-600">Free-agent claims</p>
          </Link>
          {contest.gameMode === "gladiator" ? (
            <Link
              className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
              href={`/gladiator-pick/${contest.currentWeek}?contestId=${contest.id}`}
            >
              <p className="font-medium">Gladiator pick</p>
              <p className="text-sm text-gray-600">1.5× one-time multiplier</p>
            </Link>
          ) : null}
        </div>
      ) : null}

      {top.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Top 10
          </h2>
          <ol className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {top.slice(0, 10).map((row) => (
              <li
                key={row.userId}
                className={`flex items-center justify-between px-4 py-2 text-sm ${
                  user && row.userId === user.id ? "bg-yellow-50 font-medium" : ""
                }`}
              >
                <span>
                  #{row.rank} {row.displayName}
                  {row.eliminatedAtWeek ? (
                    <span className="ml-2 text-xs text-red-600">out</span>
                  ) : null}
                </span>
                <span className="tabular-nums">
                  {row.cumulativePoints.toFixed(1)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
