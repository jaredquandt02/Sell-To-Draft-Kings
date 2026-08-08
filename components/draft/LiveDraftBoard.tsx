"use client";

import { useMemo, useState, useTransition } from "react";
import type { DraftPick, Player, Position } from "@/lib/types";
import { makeDraftPickAction } from "@/lib/actions/draft";
import { DraftBoard } from "@/components/draft/DraftBoard";
import { Card } from "@/components/ui/Card";

const POSITIONS: Array<Position | "ALL"> = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"];

export function LiveDraftBoard({
  contestId,
  podId,
  picks,
  players,
  currentUserId,
  displayNames = {},
}: {
  contestId: string;
  podId: string;
  picks: DraftPick[];
  players: Player[];
  currentUserId: string;
  displayNames?: Record<string, string>;
}) {
  const [localPicks, setLocalPicks] = useState(picks);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Position | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const taken = new Set(
    localPicks.filter((p) => p.playerId).map((p) => p.playerId as string),
  );
  const available = useMemo(() => {
    return players.filter((p) => {
      if (taken.has(p.id)) return false;
      if (filter !== "ALL" && p.position !== filter) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [players, taken, filter, query]);

  const onClock = localPicks.find((p) => !p.playerId);
  const isMyTurn = onClock?.userId === currentUserId;
  const complete = !onClock;

  function handleSelect(playerId: string) {
    if (!onClock || !isMyTurn || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await makeDraftPickAction({
        pickId: onClock.id,
        playerId,
        contestId,
        podId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLocalPicks((prev) =>
        prev.map((p) =>
          p.id === onClock.id
            ? { ...p, playerId, pickedAt: new Date().toISOString() }
            : p,
        ),
      );
    });
  }

  const playerName = (id: string | null) =>
    id ? players.find((p) => p.id === id)?.name ?? id : "—";
  const managerName = (userId: string) =>
    userId === currentUserId ? "You" : displayNames[userId] ?? userId.slice(0, 8);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">
          {complete
            ? "Draft complete"
            : isMyTurn
              ? "You're on the clock"
              : `On the clock: ${managerName(onClock!.userId)} (#${onClock!.pickNumber})`}
        </p>
        {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
        <div className="mb-3 flex flex-wrap gap-2">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setFilter(pos)}
              className={`rounded-full px-2 py-0.5 text-xs ${
                filter === pos ? "bg-black text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players"
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        {isMyTurn ? (
          <div className="max-h-96 overflow-auto">
            <DraftBoard availablePlayers={available} onSelect={handleSelect} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            {players.length - taken.size} players remaining in the pool.
          </p>
        )}
      </Card>
      <Card>
        <p className="mb-2 text-sm font-medium text-gray-500">Pick order</p>
        <ol className="max-h-[28rem] space-y-1 overflow-auto text-sm">
          {localPicks.map((p) => (
            <li
              key={p.id}
              className={
                p.id === onClock?.id ? "font-semibold text-black" : "text-gray-600"
              }
            >
              #{p.pickNumber} {managerName(p.userId)} — {playerName(p.playerId)}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
