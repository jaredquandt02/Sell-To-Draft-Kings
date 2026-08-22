import {
  listOpenContests,
  getSessionUser,
  listEnteredContestIds,
} from "@/lib/data/contests";
import { LobbyList } from "@/components/lobby/LobbyList";

export default async function LobbyPage() {
  const [user, contests] = await Promise.all([getSessionUser(), listOpenContests()]);
  const enteredIds = user ? await listEnteredContestIds(user.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contest lobby</h1>
        <p className="mt-1 text-sm text-gray-600">
          Public fields — enter with virtual credits, then draft and play.
        </p>
      </div>
      <LobbyList contests={contests} enteredIds={enteredIds} />
    </div>
  );
}
