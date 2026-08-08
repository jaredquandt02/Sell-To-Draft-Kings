import {
  listOpenContests,
  getSessionUser,
  getUserEntry,
} from "@/lib/data/contests";
import { ContestCard } from "@/components/lobby/ContestCard";

export default async function LobbyPage() {
  const user = await getSessionUser();
  const contests = await listOpenContests();

  const entered = new Set<string>();
  if (user) {
    for (const c of contests) {
      const entry = await getUserEntry(c.id, user.id);
      if (entry) entered.add(c.id);
    }
  }

  const open = contests.filter((c) => c.status === "open");
  const live = contests.filter((c) => c.status !== "open");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Contest lobby</h1>
        <p className="mt-1 text-sm text-gray-600">
          Public fields — enter with virtual credits, then draft and play.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Open for entry
        </h2>
        {open.length === 0 ? (
          <p className="text-sm text-gray-600">No open contests right now.</p>
        ) : (
          <div className="grid gap-3">
            {open.map((c) => (
              <ContestCard
                key={c.id}
                contest={c}
                entrantCount={c.entrantCount}
                alreadyEntered={entered.has(c.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          In progress
        </h2>
        {live.length === 0 ? (
          <p className="text-sm text-gray-600">No live contests yet.</p>
        ) : (
          <div className="grid gap-3">
            {live.map((c) => (
              <ContestCard
                key={c.id}
                contest={c}
                entrantCount={c.entrantCount}
                alreadyEntered={entered.has(c.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
