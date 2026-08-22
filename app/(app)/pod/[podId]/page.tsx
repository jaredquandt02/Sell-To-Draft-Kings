import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getSessionUser } from "@/lib/data/contests";
import { getPodDetail } from "@/lib/data/game";

export default async function PodPage({ params }: { params: { podId: string } }) {
  const [user, pod] = await Promise.all([
    getSessionUser(),
    getPodDetail(params.podId),
  ]);

  if (!pod) {
    return (
      <p className="text-sm text-gray-600">
        Pod not found.{" "}
        <Link href="/lobby" className="underline">
          Back to lobby
        </Link>
      </p>
    );
  }

  const nameOf = (id: string) =>
    pod.members.find((m) => m.userId === id)?.displayName ?? id.slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">
          {pod.contestName} · {pod.gameMode} · week {pod.week}
        </p>
        <h1 className="text-2xl font-bold">Pod {pod.podNumber}</h1>
        <Link
          href={`/contest/${pod.contestId}`}
          className="text-sm text-blue-600 underline"
        >
          Back to contest
        </Link>
      </div>

      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">Members</p>
        <ul className="divide-y divide-gray-200">
          {pod.members.map((m) => (
            <li
              key={m.userId}
              className={`flex items-start justify-between gap-3 py-2 ${
                user && m.userId === user.id ? "font-medium" : ""
              }`}
            >
              <div>
                <p>
                  {m.displayName}
                  {user && m.userId === user.id ? " (you)" : ""}
                </p>
                <p className="text-xs text-gray-500">
                  {m.starterNames.length
                    ? m.starterNames.join(", ")
                    : "No starters set"}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="tabular-nums">
                  {m.weekPoints != null ? m.weekPoints.toFixed(1) : "—"}
                </p>
                {m.eliminatedAtWeek ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    Out W{m.eliminatedAtWeek}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Alive</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">
          Week {pod.week} matchups
        </p>
        {pod.matchups.length === 0 ? (
          <p className="text-sm text-gray-500">No matchups posted yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {pod.matchups.map((m) => {
              const youIn =
                user && (m.userIdA === user.id || m.userIdB === user.id);
              return (
                <li key={m.id} className={`py-3 ${youIn ? "bg-yellow-50" : ""}`}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span
                      className={
                        m.winnerId === m.userIdA ? "font-semibold" : ""
                      }
                    >
                      {nameOf(m.userIdA)}{" "}
                      <span className="tabular-nums text-gray-600">
                        {m.pointsA != null ? m.pointsA.toFixed(1) : "—"}
                      </span>
                    </span>
                    <span className="text-xs text-gray-400">vs</span>
                    <span
                      className={
                        m.winnerId === m.userIdB ? "font-semibold" : ""
                      }
                    >
                      <span className="tabular-nums text-gray-600">
                        {m.pointsB != null ? m.pointsB.toFixed(1) : "—"}
                      </span>{" "}
                      {nameOf(m.userIdB)}
                    </span>
                  </div>
                  {!m.winnerId && m.pointsA != null && m.pointsA === m.pointsB ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Tie — both advance
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
