"use client";

import { useState } from "react";
import { canTriggerMedicCard, applyMedicCard, type RosterSlot } from "@/lib/game-engine/medic-card";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  CURRENT_USER_ID,
  getPlayer,
  hasUsedMedicCardByUser,
  isInjured,
  rosters,
  starterByUser,
} from "@/lib/mock/league";

export function TeamDemo() {
  const rosterPlayerIds = rosters[CURRENT_USER_ID];
  const starterId = starterByUser[CURRENT_USER_ID];

  const [starters, setStarters] = useState<RosterSlot[]>([
    { playerId: starterId, isInjured: isInjured(starterId) },
  ]);
  const [benchIds, setBenchIds] = useState<string[]>(
    rosterPlayerIds.filter((id) => id !== starterId),
  );
  const [hasUsedMedicCard, setHasUsedMedicCard] = useState(
    hasUsedMedicCardByUser[CURRENT_USER_ID],
  );
  const [pickingBackupFor, setPickingBackupFor] = useState<string | null>(null);

  const eligible = canTriggerMedicCard(hasUsedMedicCard, starters);

  function swapIn(injuredPlayerId: string, backupPlayerId: string) {
    setStarters((prev) => applyMedicCard(prev, injuredPlayerId, backupPlayerId));
    setBenchIds((prev) => prev.filter((id) => id !== backupPlayerId).concat(injuredPlayerId));
    setHasUsedMedicCard(true);
    setPickingBackupFor(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">Starters</p>
          {hasUsedMedicCard && <span className="text-xs text-gray-400">Medic Card used</span>}
        </div>
        <ul className="divide-y divide-gray-200">
          {starters.map((slot) => {
            const player = getPlayer(slot.playerId);
            return (
              <li key={slot.playerId} className="flex items-center justify-between py-2">
                <span>
                  {player.name} — {player.position} ({player.nflTeam})
                  {slot.isInjured && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      Injured
                    </span>
                  )}
                </span>
                {slot.isInjured && eligible && (
                  <Button
                    className="border border-gray-300 bg-white text-black hover:bg-gray-50"
                    onClick={() => setPickingBackupFor(slot.playerId)}
                  >
                    Use Medic Card
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {pickingBackupFor && (
        <Card className="border-black">
          <p className="mb-2 text-sm font-medium">Choose a backup from your bench</p>
          <ul className="divide-y divide-gray-200">
            {benchIds.map((id) => {
              const player = getPlayer(id);
              return (
                <li key={id} className="flex items-center justify-between py-2">
                  <span>
                    {player.name} — {player.position} ({player.nflTeam})
                  </span>
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => swapIn(pickingBackupFor, id)}
                  >
                    Swap in
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">Bench</p>
        {benchIds.length === 0 ? (
          <p className="text-sm text-gray-500">No bench players.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {benchIds.map((id) => {
              const player = getPlayer(id);
              return (
                <li key={id} className="py-2">
                  {player.name} — {player.position} ({player.nflTeam})
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
