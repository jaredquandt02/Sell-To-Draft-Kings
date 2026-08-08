import { GladiatorPickDemo } from "@/components/gladiator-pick/GladiatorPickDemo";
import { CURRENT_USER_ID, getPlayer, rosters } from "@/lib/mock/league";

export default function GladiatorPickPage({ params }: { params: { week: string } }) {
  const rosterPlayers = rosters[CURRENT_USER_ID].map((id) => getPlayer(id));

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Gladiator Pick — Week {params.week}</h1>
        <p className="text-sm text-gray-500">
          Choose one roster player for a one-time-use score multiplier this week.
        </p>
      </div>

      <GladiatorPickDemo rosterPlayers={rosterPlayers} />
    </div>
  );
}
