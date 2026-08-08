"use client";

import { useState } from "react";
import type { Player } from "@/lib/types";
import { GladiatorPickCard } from "@/components/gladiator-pick/GladiatorPickCard";
import { Card } from "@/components/ui/Card";
import { GLADIATOR_MULTIPLIER, gladiatorPreview } from "@/lib/mock/league";

export function GladiatorPickDemo({ rosterPlayers }: { rosterPlayers: Player[] }) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = rosterPlayers.find((p) => p.id === pickedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3">
        {rosterPlayers.map((player) => (
          <GladiatorPickCard
            key={player.id}
            player={player}
            alreadyUsed={false}
            onPick={setPickedId}
          />
        ))}
      </div>

      {picked && (
        <Card className="bg-black text-white">
          <p className="text-sm text-gray-300">Gladiator pick locked in</p>
          <p className="mt-1 text-lg font-medium">{picked.name}</p>
          {(() => {
            const { base, withMultiplier } = gladiatorPreview(picked.id);
            return (
              <p className="mt-1 text-sm text-gray-300">
                {base} pts × {GLADIATOR_MULTIPLIER} multiplier ={" "}
                <span className="font-semibold text-white">{withMultiplier} pts</span>
              </p>
            );
          })()}
        </Card>
      )}
    </div>
  );
}
