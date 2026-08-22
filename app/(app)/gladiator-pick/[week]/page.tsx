import { GladiatorPickDemo } from "@/components/gladiator-pick/GladiatorPickDemo";
import { GladiatorPickForm } from "@/components/gladiator-pick/GladiatorPickForm";
import { CURRENT_USER_ID, getPlayer, rosters } from "@/lib/mock/league";
import { getSessionUser } from "@/lib/data/contests";
import {
  getUserContests,
  resolveContestForUser,
  getRosterRows,
} from "@/lib/data/game";
import { ContestSwitcher } from "@/components/app/ContestSwitcher";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export default async function GladiatorPickPage({
  params,
  searchParams,
}: {
  params: { week: string };
  searchParams: { contestId?: string };
}) {
  const week = Number(params.week) || 1;
  const user = await getSessionUser();

  if (!isSupabaseConfigured() || !user) {
    const rosterPlayers = rosters[CURRENT_USER_ID].map((id) => getPlayer(id));
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Gladiator Pick — Week {week}</h1>
          <p className="text-sm text-gray-500">
            Choose one roster player for a one-time-use score multiplier.
          </p>
        </div>
        <GladiatorPickDemo rosterPlayers={rosterPlayers} />
      </div>
    );
  }

  const mine = (await getUserContests(user.id)).filter((c) => c.gameMode === "gladiator");
  const contest = await resolveContestForUser(user.id, searchParams.contestId);
  const glad =
    contest?.gameMode === "gladiator"
      ? contest
      : mine[0] ?? null;

  if (!glad) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Gladiator Pick</h1>
        <p className="text-sm text-gray-600">
          Enter a Gladiator-mode contest to make picks. Classic contests use
          standard H2H scoring without multipliers.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const [{ data: existing }, rows] = await Promise.all([
    supabase
      .from("gladiator_picks")
      .select("id, roster_player_id")
      .eq("contest_id", glad.id)
      .eq("user_id", user.id)
      .eq("week", week)
      .maybeSingle(),
    getRosterRows(glad.rosterId),
  ]);
  const options = rows.map((r) => ({
    rosterPlayerId: r.rosterPlayerId,
    player: r.player,
    usedAsGladiatorWeek: r.usedAsGladiatorWeek,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Gladiator Pick — Week {week}</h1>
        <p className="text-sm text-gray-500">{glad.name}</p>
      </div>
      <ContestSwitcher contests={mine} currentId={glad.id} basePath={`/gladiator-pick/${week}`} />
      {existing ? (
        <p className="text-sm text-gray-700">
          Pick locked in for this week. Each player can only be used once.
        </p>
      ) : (
        <GladiatorPickForm contestId={glad.id} week={week} options={options} />
      )}
    </div>
  );
}
