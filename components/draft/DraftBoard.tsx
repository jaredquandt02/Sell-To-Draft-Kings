import type { Player } from "@/lib/types";

interface DraftBoardProps {
  availablePlayers: Player[];
  onSelect: (playerId: string) => void;
  canDraft?: boolean;
  pending?: boolean;
}

export function DraftBoard({
  availablePlayers,
  onSelect,
  canDraft = true,
  pending = false,
}: DraftBoardProps) {
  if (availablePlayers.length === 0) {
    return <p className="text-sm text-gray-500">No players match that filter.</p>;
  }

  return (
    <ul className="divide-y divide-gray-200">
      {availablePlayers.map((player) => (
        <li key={player.id} className="flex items-center justify-between gap-3 py-2">
          <span className="min-w-0">
            <span className="font-medium">{player.name}</span>
            <span className="text-gray-500">
              {" "}
              — {player.position} ({player.nflTeam})
            </span>
          </span>
          {canDraft ? (
            <button
              type="button"
              disabled={pending}
              className="shrink-0 text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
              onClick={() => onSelect(player.id)}
            >
              Draft
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
