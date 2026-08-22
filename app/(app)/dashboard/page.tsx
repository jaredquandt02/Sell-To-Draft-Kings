import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getSessionUser } from "@/lib/data/contests";
import { getDashboardData, type DashboardContest } from "@/lib/data/game";
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

  const { contests, todos } = await getDashboardData(user.id);
  const featured =
    contests.find((c) => c.status === "drafting") ??
    contests.find((c) => (c.status === "active" || c.status === "phase2") && !c.eliminatedAtWeek) ??
    contests.find((c) => c.status === "active" || c.status === "phase2") ??
    contests[0] ??
    null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.displayName}</h1>
        <p className="text-sm text-gray-500">
          {contests.length} contest{contests.length === 1 ? "" : "s"}
          {featured ? ` · week ${featured.currentWeek}` : ""}
        </p>
      </div>

      {todos.length > 0 ? (
        <Card className="border-yellow-300 bg-yellow-50">
          <p className="mb-2 text-sm font-medium text-yellow-800">Needs your attention</p>
          <ul className="flex flex-col gap-2">
            {todos.map((item) => (
              <li key={item.href} className="flex items-center justify-between gap-4">
                <span className="text-sm text-yellow-900">{item.label}</span>
                <Link
                  href={item.href}
                  className="shrink-0 rounded-md bg-black px-3 py-1 text-xs font-medium text-white"
                >
                  {item.cta}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {featured ? <FeaturedContest card={featured} userId={user.id} /> : null}

      {contests.length === 0 ? (
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
          {contests.map((c) => (
            <ContestRow key={c.id} card={c} userId={user.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedContest({ card, userId }: { card: DashboardContest; userId: string }) {
  const q = `?contestId=${card.id}`;
  return (
    <Card className="border-black">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">This week</p>
          <h2 className="text-lg font-semibold">{card.name}</h2>
          <p className="text-sm text-gray-600">
            {card.gameMode === "gladiator" ? "Gladiator" : "Classic"} · {card.status} · week{" "}
            {card.currentWeek}
            {card.rank ? ` · #${card.rank}` : ""}
          </p>
        </div>
        <Link
          href={`/contest/${card.id}`}
          className="rounded-md bg-black px-3 py-1.5 text-sm text-white"
        >
          Open contest
        </Link>
      </div>

      {card.matchup ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">You</p>
            <p className="text-3xl font-semibold tabular-nums">
              {card.matchup.yourPoints != null ? card.matchup.yourPoints.toFixed(1) : "—"}
            </p>
          </div>
          <p className="text-sm text-gray-400">vs</p>
          <div>
            <p className="text-xs text-gray-500">{card.matchup.opponentName}</p>
            <p className="text-3xl font-semibold tabular-nums">
              {card.matchup.opponentPoints != null
                ? card.matchup.opponentPoints.toFixed(1)
                : "—"}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          {card.status === "drafting"
            ? "Draft is live for your pod."
            : card.status === "open"
              ? "Waiting for this field to lock and pod."
              : "No matchup posted for this week yet."}
        </p>
      )}

      <p className="mt-3 text-center text-sm text-gray-600">
        {resultLabel(card, userId)}
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link className="text-blue-600 underline" href={`/matchup${q}`}>
          Matchup
        </Link>
        <Link className="text-blue-600 underline" href={`/team${q}`}>
          Roster
        </Link>
        {card.status === "drafting" ? (
          <Link className="text-blue-600 underline" href={`/draft/${card.id}`}>
            Draft
          </Link>
        ) : null}
        {card.gameMode === "gladiator" ? (
          <Link
            className="text-blue-600 underline"
            href={`/gladiator-pick/${card.currentWeek}${q}`}
          >
            Gladiator pick
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

function ContestRow({ card, userId }: { card: DashboardContest; userId: string }) {
  const q = `?contestId=${card.id}`;
  const cta = rowCta(card);

  return (
    <Card className={card.eliminatedAtWeek ? "opacity-80" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {card.gameMode === "gladiator" ? "Gladiator" : "Classic"} · {card.status} · week{" "}
            {card.currentWeek}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{card.name}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {card.podNumber ? `Pod ${card.podNumber}` : "Awaiting pods"}
            {card.rank ? ` · #${card.rank}` : ""}
            {card.weekPoints != null ? ` · ${card.weekPoints.toFixed(1)} pts this week` : ""}
            {card.eliminatedAtWeek ? ` · eliminated week ${card.eliminatedAtWeek}` : ""}
          </p>
          {card.matchup ? (
            <p className="mt-1 text-sm text-gray-700">
              vs {card.matchup.opponentName}{" "}
              <span className="tabular-nums text-gray-500">
                {card.matchup.yourPoints != null ? card.matchup.yourPoints.toFixed(1) : "—"}–
                {card.matchup.opponentPoints != null
                  ? card.matchup.opponentPoints.toFixed(1)
                  : "—"}
              </span>
              {resultLabel(card, userId) !== "Not finalized" ? (
                <span className="text-gray-500"> · {resultLabel(card, userId)}</span>
              ) : null}
            </p>
          ) : null}
          {card.injuredStarterName && !card.eliminatedAtWeek ? (
            <p className="mt-1 text-xs text-red-600">
              {card.injuredStarterName} injured
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link
            href={cta.href}
            className="rounded-md bg-black px-3 py-1.5 text-sm text-white"
          >
            {cta.label}
          </Link>
          <Link
            href={`/contest/${card.id}`}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            Hub
          </Link>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link className="text-blue-600 underline" href={`/matchup${q}`}>
          Matchup
        </Link>
        <Link className="text-blue-600 underline" href={`/team${q}`}>
          Roster
        </Link>
        <Link className="text-blue-600 underline" href={`/leaderboard${q}`}>
          Standings
        </Link>
        {card.podId ? (
          <Link className="text-blue-600 underline" href={`/pod/${card.podId}`}>
            Pod
          </Link>
        ) : null}
        {card.gameMode === "gladiator" ? (
          <Link
            className="text-blue-600 underline"
            href={`/gladiator-pick/${card.currentWeek}${q}`}
          >
            Gladiator pick
            {card.hasGladPick ? " ✓" : ""}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

function rowCta(card: DashboardContest) {
  if (card.status === "drafting") return { href: `/draft/${card.id}`, label: "Draft" };
  if (card.eliminatedAtWeek) {
    return { href: `/leaderboard?contestId=${card.id}`, label: "Standings" };
  }
  if (card.gameMode === "gladiator" && !card.hasGladPick && card.status !== "open") {
    return {
      href: `/gladiator-pick/${card.currentWeek}?contestId=${card.id}`,
      label: "Pick",
    };
  }
  if (card.matchup) return { href: `/matchup?contestId=${card.id}`, label: "Matchup" };
  return { href: `/contest/${card.id}`, label: "Open" };
}

function resultLabel(card: DashboardContest, userId: string) {
  if (card.eliminatedAtWeek) return `Eliminated week ${card.eliminatedAtWeek}`;
  if (!card.matchup?.winnerId) return "Not finalized";
  if (card.matchup.winnerId === userId) {
    return card.gameMode === "gladiator" ? "You advance" : "You won";
  }
  return card.gameMode === "gladiator" ? "Eliminated this week" : "You lost";
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
          <p className="mb-2 text-sm font-medium text-yellow-800">Needs your attention</p>
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
                  {getPlayer(starterByUser[CURRENT_USER_ID]).name} injured — Medic Card
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
