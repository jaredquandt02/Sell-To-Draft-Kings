import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  CURRENT_USER_ID,
  LEAGUE_ID,
  POD_ID,
  WEEK,
  displayName,
  getPlayer,
  standings,
  starterByUser,
  weeklyPoints,
  yourPod,
  yourPodMatchups,
} from "@/lib/mock/league";

export default function DashboardPage() {
  const yourMatchup = yourPodMatchups.find(
    (m) => m.userIdA === CURRENT_USER_ID || m.userIdB === CURRENT_USER_ID,
  )!;
  const opponentId =
    yourMatchup.userIdA === CURRENT_USER_ID ? yourMatchup.userIdB : yourMatchup.userIdA;
  const yourScore = weeklyPoints(CURRENT_USER_ID);
  const opponentScore = weeklyPoints(opponentId);
  const yourRank = standings.findIndex((s) => s.userId === CURRENT_USER_ID) + 1;

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {displayName(CURRENT_USER_ID)}</h1>
        <p className="text-sm text-gray-500">Week {WEEK} — Pod {yourPod.podNumber}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-sm text-gray-500">This week's matchup</p>
          <p className="mt-1 text-lg font-medium">
            {displayName(CURRENT_USER_ID)} vs {displayName(opponentId)}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {getPlayer(starterByUser[CURRENT_USER_ID]).name} projects for{" "}
            <span className="font-medium text-black">{yourScore}</span> pts, opponent{" "}
            <span className="font-medium text-black">{opponentScore}</span> pts
          </p>
          {yourMatchup.isTie ? (
            <p className="mt-2 text-sm text-gray-500">Currently tied</p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              Currently {yourMatchup.winnerId === CURRENT_USER_ID ? "winning" : "losing"}
            </p>
          )}
        </Card>

        <Card>
          <p className="text-sm text-gray-500">League standing</p>
          <p className="mt-1 text-lg font-medium">#{yourRank} of {standings.length}</p>
          <p className="mt-1 text-sm text-gray-600">{yourScore} cumulative points</p>
          <Link href="/leaderboard" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            View full leaderboard
          </Link>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link href={`/draft/${LEAGUE_ID}`} className="text-sm text-blue-600 hover:underline">
          Go to draft
        </Link>
        <Link href={`/pod/${POD_ID}`} className="text-sm text-blue-600 hover:underline">
          View your pod
        </Link>
        <Link href={`/gladiator-pick/${WEEK}`} className="text-sm text-blue-600 hover:underline">
          Make your gladiator pick
        </Link>
      </div>
    </div>
  );
}
