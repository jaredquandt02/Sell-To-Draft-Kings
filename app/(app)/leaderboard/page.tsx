import Link from "next/link";
import { getSessionUser } from "@/lib/data/contests";
import {
  getUserContests,
  resolveContestForUser,
  getStandings,
} from "@/lib/data/game";
import { ContestSwitcher } from "@/components/app/ContestSwitcher";
import { isSupabaseConfigured } from "@/lib/config";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { standings as mockStandings } from "@/lib/mock/league";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { contestId?: string };
}) {
  const user = await getSessionUser();

  if (!isSupabaseConfigured() || !user) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Standings</h1>
        <LeaderboardTable rows={mockStandings} />
      </div>
    );
  }

  const mine = await getUserContests(user.id);
  const contest = await resolveContestForUser(user.id, searchParams.contestId);
  if (!contest) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Standings</h1>
        <p className="text-sm text-gray-600">
          <Link href="/lobby" className="underline">
            Enter a contest
          </Link>{" "}
          to see standings.
        </p>
      </div>
    );
  }

  const rows = await getStandings(contest.id, contest.currentWeek);
  const alive = rows.filter((r) => !r.eliminatedAtWeek).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Standings</h1>
        <p className="text-sm text-gray-500">
          {contest.name} · week {contest.currentWeek} · {rows.length} scored
          {contest.gameMode === "gladiator" ? ` · ${alive} still alive` : ""}
        </p>
      </div>
      <ContestSwitcher contests={mine} currentId={contest.id} basePath="/leaderboard" />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Manager</th>
              <th className="py-2 pr-2">Week</th>
              <th className="py-2 pr-2">Total</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const you = row.userId === user.id;
              return (
                <tr
                  key={row.userId}
                  className={`border-b border-gray-100 ${you ? "bg-yellow-50 font-medium" : ""}`}
                >
                  <td className="py-2 pr-2 tabular-nums">{row.rank}</td>
                  <td className="py-2 pr-2">
                    {row.displayName}
                    {you ? " (you)" : ""}
                  </td>
                  <td className="py-2 pr-2 tabular-nums">{row.points.toFixed(1)}</td>
                  <td className="py-2 pr-2 tabular-nums">
                    {row.cumulativePoints.toFixed(1)}
                  </td>
                  <td className="py-2 text-xs">
                    {row.eliminatedAtWeek ? (
                      <span className="text-red-600">Out W{row.eliminatedAtWeek}</span>
                    ) : (
                      <span className="text-gray-500">Active</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
