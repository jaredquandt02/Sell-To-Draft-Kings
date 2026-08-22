import Link from "next/link";
import { getSessionUser } from "@/lib/data/contests";
import { EnterContestButton } from "@/components/lobby/ContestCard";
import { Card } from "@/components/ui/Card";
import { getContestHubData } from "@/lib/data/game";

export default async function ContestPage({
  params,
}: {
  params: { contestId: string };
}) {
  const user = await getSessionUser();
  const hub = await getContestHubData(params.contestId, user?.id ?? null);

  if (!hub) {
    return <p className="text-sm text-gray-600">Contest not found.</p>;
  }

  const { contest, entered: entry, pod, standing, matchup, top, entrantCount } = hub;

  const q = `?contestId=${contest.id}`;
  const primary = primaryAction({
    status: contest.status,
    gameMode: contest.gameMode,
    entered: Boolean(entry),
    drafting: contest.status === "drafting",
    eliminated: Boolean(pod?.eliminatedAtWeek),
    contestId: contest.id,
    week: contest.currentWeek,
  });

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
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Join this field</p>
            <p className="text-sm text-gray-600">
              {contest.entryFeeCredits} credits · draft in pods of {contest.podSize}
            </p>
          </div>
          <EnterContestButton contestId={contest.id} />
        </Card>
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

      {entry && primary ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-black">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Next action</p>
            <p className="font-medium">{primary.label}</p>
            <p className="text-sm text-gray-600">{primary.detail}</p>
          </div>
          <Link
            href={primary.href}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            {primary.cta}
          </Link>
        </Card>
      ) : null}

      {entry && matchup ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Week {contest.currentWeek} matchup · Pod {matchup.podNumber}
            </p>
            <Link href={`/matchup${q}`} className="text-sm text-blue-600 underline">
              Full matchup
            </Link>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">You</p>
              <p className="text-3xl font-semibold tabular-nums">
                {matchup.yourPoints != null ? matchup.yourPoints.toFixed(1) : "—"}
              </p>
            </div>
            <p className="text-sm text-gray-400">vs</p>
            <div>
              <p className="text-xs text-gray-500">{matchup.opponentName}</p>
              <p className="text-3xl font-semibold tabular-nums">
                {matchup.opponentPoints != null
                  ? matchup.opponentPoints.toFixed(1)
                  : "—"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-sm text-gray-600">
            {matchupResultLabel(
              contest.gameMode,
              user?.id ?? "",
              matchup.winnerId,
              matchup.eliminatedAtWeek,
            )}
          </p>
        </Card>
      ) : null}

      {entry ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link className="text-blue-600 underline" href={`/draft/${contest.id}`}>
            Draft board
          </Link>
          <Link className="text-blue-600 underline" href={`/team${q}`}>
            My team
          </Link>
          <Link className="text-blue-600 underline" href={`/matchup${q}`}>
            Matchup
          </Link>
          <Link className="text-blue-600 underline" href={`/leaderboard${q}`}>
            Standings
          </Link>
          {pod ? (
            <Link className="text-blue-600 underline" href={`/pod/${pod.podId}`}>
              Pod {pod.podNumber}
            </Link>
          ) : null}
          <Link className="text-blue-600 underline" href={`/waivers${q}`}>
            Waivers
          </Link>
          {contest.gameMode === "gladiator" ? (
            <Link
              className="text-blue-600 underline"
              href={`/gladiator-pick/${contest.currentWeek}${q}`}
            >
              Gladiator pick
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
            {top.map((row) => (
              <li
                key={row.userId}
                className={`flex items-center justify-between px-4 py-2 text-sm ${
                  user && row.userId === user.id ? "bg-yellow-50 font-medium" : ""
                }`}
              >
                <span>
                  #{row.rank} {row.displayName}
                  {user && row.userId === user.id ? " (you)" : ""}
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

function primaryAction(input: {
  status: string;
  gameMode: string;
  entered: boolean;
  drafting: boolean;
  eliminated: boolean;
  contestId: string;
  week: number;
}): { label: string; detail: string; href: string; cta: string } | null {
  if (!input.entered) return null;
  if (input.drafting) {
    return {
      label: "Draft is live",
      detail: "Your pod is on the clock — pick before the board fills.",
      href: `/draft/${input.contestId}`,
      cta: "Open draft",
    };
  }
  if (input.eliminated) {
    return {
      label: "You're out of this field",
      detail: "Review standings or jump into another contest.",
      href: `/leaderboard?contestId=${input.contestId}`,
      cta: "Standings",
    };
  }
  if (input.status === "open") {
    return {
      label: "Waiting for lock",
      detail: "Pods and the draft open when this field fills.",
      href: `/lobby`,
      cta: "Back to lobby",
    };
  }
  if (input.gameMode === "gladiator") {
    return {
      label: "This week's Gladiator pick",
      detail: "Lock a one-time 1.5× multiplier before scores finalize.",
      href: `/gladiator-pick/${input.week}?contestId=${input.contestId}`,
      cta: "Make pick",
    };
  }
  return {
    label: "This week's matchup",
    detail: "Set your lineup, then check the box score.",
    href: `/matchup?contestId=${input.contestId}`,
    cta: "Open matchup",
  };
}

function matchupResultLabel(
  gameMode: string,
  userId: string,
  winnerId: string | null,
  eliminatedAtWeek: number | null,
) {
  if (eliminatedAtWeek) return `Eliminated week ${eliminatedAtWeek}`;
  if (!winnerId) return "Not finalized";
  if (winnerId === userId) {
    return gameMode === "gladiator" ? "You advance" : "You won";
  }
  return gameMode === "gladiator" ? "Eliminated this week" : "You lost";
}
