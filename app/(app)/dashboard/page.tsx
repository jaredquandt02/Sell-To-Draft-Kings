import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  CURRENT_USER_ID,
  LEAGUE_ID,
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
} from "@/lib/mock/league";

interface ActionItem {
  label: string;
  href: string;
  cta: string;
}

export default function DashboardPage() {
  const yourMatchup = yourPodMatchups.find(
    (m) => m.userIdA === CURRENT_USER_ID || m.userIdB === CURRENT_USER_ID,
  )!;
  const opponentId =
    yourMatchup.userIdA === CURRENT_USER_ID ? yourMatchup.userIdB : yourMatchup.userIdA;
  const yourScore = weeklyPoints(CURRENT_USER_ID);
  const opponentScore = weeklyPoints(opponentId);
  const yourRank = standings.findIndex((s) => s.userId === CURRENT_USER_ID) + 1;
  const yourStarterInjured = isInjured(starterByUser[CURRENT_USER_ID]);

  const actionItems: ActionItem[] = [];
  if (!hasMadeGladiatorPickByUser[CURRENT_USER_ID]) {
    actionItems.push({
      label: "You haven't made this week's Gladiator Pick yet",
      href: `/gladiator-pick/${WEEK}`,
      cta: "Make pick",
    });
  }
  if (yourStarterInjured && !hasUsedMedicCardByUser[CURRENT_USER_ID]) {
    actionItems.push({
      label: `${getPlayer(starterByUser[CURRENT_USER_ID]).name} is injured — Medic Card available`,
      href: "/team",
      cta: "Review team",
    });
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {displayName(CURRENT_USER_ID)}</h1>
        <p className="text-sm text-gray-500">
          Week {WEEK} — Pod {yourPod.podNumber}
        </p>
      </div>

      {actionItems.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <p className="mb-2 text-sm font-medium text-yellow-800">Needs your attention</p>
          <ul className="flex flex-col gap-2">
            {actionItems.map((item) => (
              <li key={item.href} className="flex items-center justify-between gap-4">
                <span className="text-sm text-yellow-900">{item.label}</span>
                <Link
                  href={item.href}
                  className="shrink-0 rounded-md bg-black px-3 py-1 text-xs font-medium text-white hover:bg-gray-800"
                >
                  {item.cta}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
          <Link href={`/pod/${POD_ID}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            View full matchup
          </Link>
        </Card>

        <Card>
          <p className="text-sm text-gray-500">League standing</p>
          <p className="mt-1 text-lg font-medium">
            #{yourRank} of {standings.length}
          </p>
          <p className="mt-1 text-sm text-gray-600">{yourScore} cumulative points</p>
          <Link href="/leaderboard" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            View full leaderboard
          </Link>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link href="/team" className="text-sm text-blue-600 hover:underline">
          Manage my team
        </Link>
        <Link href={`/draft/${LEAGUE_ID}`} className="text-sm text-blue-600 hover:underline">
          Go to draft
        </Link>
      </div>
    </div>
  );
}
