"use client";

import { useState, useTransition } from "react";
import type { Player } from "@/lib/types";
import { submitGladiatorPickAction } from "@/lib/actions/roster";
import { GladiatorPickCard } from "@/components/gladiator-pick/GladiatorPickCard";
import { Card } from "@/components/ui/Card";
import { GLADIATOR_MULTIPLIER } from "@/lib/config";

export function GladiatorPickForm({
  contestId,
  week,
  options,
}: {
  contestId: string;
  week: number;
  options: Array<{
    rosterPlayerId: string;
    player: Player;
    usedAsGladiatorWeek: number | null;
  }>;
}) {
  const [selectedRosterPlayerId, setSelectedRosterPlayerId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = options.find(
    (o) => o.rosterPlayerId === selectedRosterPlayerId,
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Multiplier {GLADIATOR_MULTIPLIER}× — each player usable once.
      </p>
      <div className="grid gap-3">
        {options.map((o) => (
          <GladiatorPickCard
            key={o.rosterPlayerId}
            player={o.player}
            alreadyUsed={o.usedAsGladiatorWeek != null}
            onPick={() => setSelectedRosterPlayerId(o.rosterPlayerId)}
          />
        ))}
      </div>

      {selected && selected.usedAsGladiatorWeek == null ? (
        <Card className="bg-black text-white">
          <p className="text-sm text-gray-300">Confirm gladiator</p>
          <p className="mt-1 text-lg font-medium">{selected.player.name}</p>
          <button
            type="button"
            disabled={pending}
            className="mt-3 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50"
            onClick={() => {
              startTransition(async () => {
                const result = await submitGladiatorPickAction({
                  contestId,
                  rosterPlayerId: selected.rosterPlayerId,
                  week,
                });
                setMessage(result.ok ? "Pick locked in" : result.error);
              });
            }}
          >
            {pending ? "Saving…" : "Lock in pick"}
          </button>
        </Card>
      ) : null}
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
