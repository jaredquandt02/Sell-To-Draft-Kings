"use client";

import { useMemo, useState, useTransition } from "react";
import type { Player } from "@/lib/types";
import { setLineupAction, useMedicCardAction } from "@/lib/actions/roster";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { canTriggerMedicCard } from "@/lib/game-engine/medic-card";

export interface TeamPlayerRow {
  rosterPlayerId: string;
  player: Player;
  isStarter: boolean;
  usedAsGladiatorWeek: number | null;
  isInjured?: boolean;
}

export function TeamManager({
  contestId,
  rosterId,
  week,
  rows,
  hasUsedMedic,
  gameMode,
}: {
  contestId: string;
  rosterId: string;
  week: number;
  rows: TeamPlayerRow[];
  hasUsedMedic: boolean;
  gameMode: "classic" | "gladiator";
}) {
  const [selectedStarters, setSelectedStarters] = useState(
    () => new Set(rows.filter((r) => r.isStarter).map((r) => r.player.id)),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pickingMedic, setPickingMedic] = useState<string | null>(null);

  const starters = useMemo(
    () => rows.filter((r) => selectedStarters.has(r.player.id)),
    [rows, selectedStarters],
  );
  const bench = useMemo(
    () => rows.filter((r) => !selectedStarters.has(r.player.id)),
    [rows, selectedStarters],
  );

  const medicEligible = canTriggerMedicCard(
    hasUsedMedic,
    starters.map((s) => ({
      playerId: s.player.id,
      isInjured: Boolean(s.isInjured),
    })),
  );

  function toggleStarter(playerId: string) {
    setSelectedStarters((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function saveLineup() {
    setMessage(null);
    startTransition(async () => {
      const result = await setLineupAction({
        rosterId,
        starterPlayerIds: [...selectedStarters],
      });
      setMessage(result.ok ? "Lineup saved" : result.error);
    });
  }

  function runMedic(injuredPlayerId: string, backupPlayerId: string) {
    startTransition(async () => {
      const result = await useMedicCardAction({
        contestId,
        week,
        injuredPlayerId,
        backupPlayerId,
        rosterId,
        injuredStatuses: starters.map((s) => ({
          playerId: s.player.id,
          isInjured: Boolean(s.isInjured),
        })),
      });
      setMessage(result.ok ? "Medic Card used" : result.error);
      setPickingMedic(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Toggle starters, then save. {gameMode === "gladiator" ? "Medic Card available when injured." : null}
        </p>
        <Button disabled={pending} onClick={saveLineup}>
          Save lineup
        </Button>
      </div>
      {message ? <p className="text-sm text-gray-700">{message}</p> : null}

      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">Starters</p>
        <ul className="divide-y divide-gray-200">
          {starters.map((row) => (
            <li key={row.player.id} className="flex items-center justify-between py-2">
              <span>
                {row.player.name} — {row.player.position} ({row.player.nflTeam})
                {row.isInjured ? (
                  <span className="ml-2 text-xs text-red-600">Injured</span>
                ) : null}
              </span>
              <div className="flex gap-2">
                {row.isInjured && medicEligible ? (
                  <Button
                    className="border border-gray-300 bg-white text-black hover:bg-gray-50"
                    onClick={() => setPickingMedic(row.player.id)}
                  >
                    Medic Card
                  </Button>
                ) : null}
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => toggleStarter(row.player.id)}
                >
                  Bench
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {pickingMedic ? (
        <Card className="border-black">
          <p className="mb-2 text-sm font-medium">Choose backup</p>
          <ul className="divide-y divide-gray-200">
            {bench.map((row) => (
              <li key={row.player.id} className="flex justify-between py-2">
                <span>
                  {row.player.name} — {row.player.position}
                </span>
                <button
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => runMedic(pickingMedic, row.player.id)}
                >
                  Swap in
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">Bench</p>
        <ul className="divide-y divide-gray-200">
          {bench.map((row) => (
            <li key={row.player.id} className="flex items-center justify-between py-2">
              <span>
                {row.player.name} — {row.player.position} ({row.player.nflTeam})
                {row.usedAsGladiatorWeek != null
                  ? ` · Glad W${row.usedAsGladiatorWeek}`
                  : ""}
              </span>
              <button
                className="text-sm text-blue-600 hover:underline"
                onClick={() => toggleStarter(row.player.id)}
              >
                Start
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
