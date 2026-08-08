import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { standings } from "@/lib/mock/league";

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <LeaderboardTable rows={standings} />
    </div>
  );
}
