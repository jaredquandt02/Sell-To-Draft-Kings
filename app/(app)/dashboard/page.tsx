import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getSessionUser } from "@/lib/data/contests";
import { getUserContests } from "@/lib/data/game";
import { isSupabaseConfigured } from "@/lib/config";
import {
  CURRENT_USER_ID,
  POD_ID,
  WEEK,
  displayName,
  getPlayer,
  hasMadeGladiatorPickByUser,
  hasUsedMedicCardByUser,
  isInjured,
  standings,
  starterByUser,
  weeklyPoints,
  yourPod,
  yourPodMatchups,
  LEAGUE_ID,
} from "@/lib/mock/league";

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!isSupabaseConfigured() || !user) {
    return <DemoDashboard />;
  }

  const mine = await getUserContests(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.displayName}</h1>
        <p className="text-sm text-gray-500">
          {mine.length} contest{mine.length === 1 ? "" : "s"} · week view
        </p>
      </div>

      {mine.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-600">
            No entries yet.{" "}
            <Link href="/lobby" className="underline">
              Browse the lobby
            </Link>
            .
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {mine.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {c.gameMode} · {c.status} · week {c.currentWeek}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{c.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {c.podNumber ? `Pod ${c.podNumber}` : "Awaiting pods"}
                    {c.rank ? ` · #${c.rank}` : ""}
                    {c.weekPoints != null ? ` · ${c.weekPoints.toFixed(1)} pts this week` : ""}
                    {c.eliminatedAtWeek
                      ? ` · eliminated week ${c.eliminatedAtWeek}`
                      : ""}
                  </p>
                </div>
                <Link
                  href={`/contest/${c.id}`}
                  className="rounded-md bg-black px-3 py-1.5 text-sm text-white"
                >
                  Open contest
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link className="text-blue-600 underline" href={`/matchup?contestId=${c.id}`}>
                  Matchup
                </Link>
                <Link className="text-blue-600 underline" href={`/team?contestId=${c.id}`}>
                  Roster
                </Link>
                <Link className="text-blue-600 underline" href={`/leaderboard?contestId=${c.id}`}>
                  Standings
                </Link>
                {c.podId ? (
                  <Link className="text-blue-600 underline" href={`/pod/${c.podId}`}>
                    Pod
                  </Link>
                ) : null}
                {c.gameMode === "gladiator" ? (
                  <Link
                    className="text-blue-600 underline"
                    href={`/gladiator-pick/${c.currentWeek}?contestId=${c.id}`}
                  >
                    Gladiator pick
                  </Link>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DemoDashboard() {
  const yourMatchup = yourPodMatchups.find(
    (m) => m.userIdA === CURRENT_USER_ID || m.userIdB === CURRENT_USER_ID,
  )!;
  const opponentId =
    yourMatchup.userIdA === CURRENT_USER_ID
      ? yourMatchup.userIdB
      : yourMatchup.userIdA;
  const yourScore = weeklyPoints(CURRENT_USER_ID);
  const yourRank = standings.findIndex((s) => s.userId === CURRENT_USER_ID) + 1;
  const yourStarterInjured = isInjured(starterByUser[CURRENT_USER_ID]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {displayName(CURRENT_USER_ID)}
        </h1>
        <p className="text-sm text-gray-500">
          Week {WEEK} — Pod {yourPod.podNumber} (demo)
        </p>
      </div>
      {(!hasMadeGladiatorPickByUser[CURRENT_USER_ID] ||
        (yourStarterInjured && !hasUsedMedicCardByUser[CURRENT_USER_ID])) && (
        <Card className="border-yellow-300 bg-yellow-50">
          <p className="mb-2 text-sm font-medium text-yellow-800">
            Needs your attention
          </p>
          <ul className="flex flex-col gap-2 text-sm">
            {!hasMadeGladiatorPickByUser[CURRENT_USER_ID] ? (
              <li>
                <Link href={`/gladiator-pick/${WEEK}`} className="underline">
                  Make Gladiator Pick
                </Link>
              </li>
            ) : null}
            {yourStarterInjured && !hasUsedMedicCardByUser[CURRENT_USER_ID] ? (
              <li>
                <Link href="/team" className="underline">
                  {getPlayer(starterByUser[CURRENT_USER_ID]).name} injured — Medic
                  Card
                </Link>
              </li>
            ) : null}
          </ul>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-gray-500">This week&apos;s matchup</p>
          <p className="mt-1 text-lg font-medium">vs {displayName(opponentId)}</p>
          <p className="mt-1 text-sm">{yourScore} pts (proj)</p>
          <Link
            href={`/pod/${POD_ID}`}
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            View matchup
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Standing</p>
          <p className="mt-1 text-lg font-medium">
            #{yourRank} of {standings.length}
          </p>
          <Link
            href="/leaderboard"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            Leaderboard
          </Link>
        </Card>
      </div>
      <div className="flex gap-3 text-sm">
        <Link href="/lobby" className="text-blue-600 hover:underline">
          Lobby
        </Link>
        <Link href="/team" className="text-blue-600 hover:underline">
          My team
        </Link>
        <Link href={`/draft/${LEAGUE_ID}`} className="text-blue-600 hover:underline">
          Draft
        </Link>
      </div>
    </div>
  );
}
