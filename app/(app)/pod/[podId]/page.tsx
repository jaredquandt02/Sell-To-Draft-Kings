import { Card } from "@/components/ui/Card";
import {
  displayName,
  getPlayer,
  starterByUser,
  weeklyPoints,
  yourPod,
  yourPodEliminated,
  yourPodMatchups,
} from "@/lib/mock/league";

export default function PodPage({ params }: { params: { podId: string } }) {
  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Pod {yourPod.podNumber}</h1>
        <p className="text-sm text-gray-500">{params.podId}</p>
      </div>

      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">Members</p>
        <ul className="divide-y divide-gray-200">
          {yourPod.userIds.map((userId) => (
            <li key={userId} className="flex items-center justify-between py-2">
              <span>
                {displayName(userId)} — {getPlayer(starterByUser[userId]).name} (
                {getPlayer(starterByUser[userId]).position})
              </span>
              {yourPodEliminated.includes(userId) && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                  Eliminated
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">This week's matchups</p>
        <ul className="divide-y divide-gray-200">
          {yourPodMatchups.map((m) => (
            <li key={`${m.userIdA}-${m.userIdB}`} className="py-2">
              <div className="flex items-center justify-between">
                <span className={m.winnerId === m.userIdA ? "font-semibold" : ""}>
                  {displayName(m.userIdA)} — {weeklyPoints(m.userIdA)}
                </span>
                <span className="text-xs text-gray-400">vs</span>
                <span className={m.winnerId === m.userIdB ? "font-semibold" : ""}>
                  {weeklyPoints(m.userIdB)} — {displayName(m.userIdB)}
                </span>
              </div>
              {m.isTie && <p className="mt-1 text-xs text-gray-500">Tie — both advance</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
