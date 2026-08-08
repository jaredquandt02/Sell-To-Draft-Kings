import type { Player } from "@/lib/types";

interface DraftBoardProps {
  availablePlayers: Player[];
  onSelect: (playerId: string) => void;
}

export function DraftBoard({ availablePlayers, onSelect }: DraftBoardProps) {
  return (
    <ul className="divide-y divide-gray-200">
      {availablePlayers.map((player) => (
        <li key={player.id} className="flex items-center justify-between py-2">
          <span>
            {player.name} — {player.position} ({player.nflTeam})
          </span>
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => onSelect(player.id)}
          >
            Draft
          </button>
        </li>
      ))}
    </ul>
  );
}
