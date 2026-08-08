"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
import { DraftBoard } from "@/components/draft/DraftBoard";
import { Card } from "@/components/ui/Card";

export function DraftBoardDemo({ initialAvailable }: { initialAvailable: Player[] }) {
  const [available, setAvailable] = useState(initialAvailable);
  const [picks, setPicks] = useState<Player[]>([]);

  function handleSelect(playerId: string) {
    const player = available.find((p) => p.id === playerId);
    if (!player) return;
    setAvailable((prev) => prev.filter((p) => p.id !== playerId));
    setPicks((prev) => [...prev, player]);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">Available players</p>
        {available.length > 0 ? (
          <DraftBoard availablePlayers={available} onSelect={handleSelect} />
        ) : (
          <p className="text-sm text-gray-500">No players left.</p>
        )}
      </Card>
      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">Your picks this session</p>
        {picks.length === 0 ? (
          <p className="text-sm text-gray-500">Draft a player to see it here.</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-4 text-sm">
            {picks.map((p) => (
              <li key={p.id}>
                {p.name} ({p.position} — {p.nflTeam})
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-gray-400">
          Client-side only — not persisted or synced with anyone else's board.
        </p>
      </Card>
    </div>
  );
}
