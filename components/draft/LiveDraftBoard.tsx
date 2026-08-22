"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { DraftPick, Player, Position } from "@/lib/types";
import { makeDraftPickAction } from "@/lib/actions/draft";
import { DraftBoard } from "@/components/draft/DraftBoard";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

const POSITIONS: Array<Position | "ALL"> = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"];
const PICK_CLOCK_SECONDS = 90;

function mapPick(row: Record<string, unknown>, contestId: string, podId: string): DraftPick {
  return {
    id: String(row.id),
    contestId: String(row.contest_id ?? contestId),
    podId: String(row.pod_id ?? podId),
    pickNumber: Number(row.pick_number),
    userId: String(row.user_id),
    playerId: row.player_id ? String(row.player_id) : null,
    pickedAt: row.picked_at ? String(row.picked_at) : null,
  };
}

export function LiveDraftBoard({
  contestId,
  podId,
  picks,
  players,
  currentUserId,
  displayNames = {},
  draftRounds,
  podNumber,
}: {
  contestId: string;
  podId: string;
  picks: DraftPick[];
  players: Player[];
  currentUserId: string;
  displayNames?: Record<string, string>;
  draftRounds: number;
  podNumber: number;
}) {
  const [localPicks, setLocalPicks] = useState(picks);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Position | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(PICK_CLOCK_SECONDS);

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const { data } = await supabase
        .from("draft_picks")
        .select("id, contest_id, pod_id, pick_number, user_id, player_id, picked_at")
        .eq("pod_id", podId)
        .order("pick_number");
      if (!data) return;
      setLocalPicks(data.map((row) => mapPick(row as Record<string, unknown>, contestId, podId)));
    }

    const interval = window.setInterval(refresh, 8000);
    const channel = supabase
      .channel(`draft:${podId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draft_picks", filter: `pod_id=eq.${podId}` },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [contestId, podId]);

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
  const podSize = new Set(localPicks.map((p) => p.userId)).size || 1;
  const round = onClock ? Math.ceil(onClock.pickNumber / podSize) : draftRounds;

  useEffect(() => {
    if (!onClock) return;
    setSecondsLeft(PICK_CLOCK_SECONDS);
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onClock?.id]);

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

  const playerName = (id: string | null) => {
    if (!id) return null;
    return playerById.get(id) ?? null;
  };
  const managerName = (userId: string) =>
    userId === currentUserId ? "You" : displayNames[userId] ?? userId.slice(0, 8);

  const managers = useMemo(() => {
    const seen: string[] = [];
    for (const pick of localPicks) {
      if (!seen.includes(pick.userId)) seen.push(pick.userId);
      if (seen.length === podSize) break;
    }
    return seen;
  }, [localPicks, podSize]);

  const myPicks = localPicks.filter((p) => p.userId === currentUserId && p.playerId);
  const clockLabel = complete
    ? "Draft complete"
    : isMyTurn
      ? "You're on the clock"
      : `On the clock: ${managerName(onClock?.userId ?? "")}`;

  return (
    <div className="space-y-4">
      <Card className={isMyTurn ? "border-black" : ""}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Pod {podNumber} · Round {round} of {draftRounds} · Pick{" "}
              {onClock?.pickNumber ?? localPicks.length}/{localPicks.length}
            </p>
            <p className="text-lg font-semibold">{clockLabel}</p>
            <p className="text-sm text-gray-600">
              {complete
                ? "All picks are in. Set your lineup from My Team."
                : isMyTurn
                  ? "Select a player from the pool."
                  : `${players.length - taken.size} players still available — scouting is open.`}
            </p>
          </div>
          {!complete ? (
            <div className="text-right">
              <p className="text-xs text-gray-500">Pick clock</p>
              <p
                className={`text-3xl font-semibold tabular-nums ${
                  secondsLeft <= 15 ? "text-red-600" : ""
                }`}
              >
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
              </p>
            </div>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-500">Available players</p>
            <p className="text-xs text-gray-400">{available.length} shown</p>
          </div>
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
          <div className="max-h-[32rem] overflow-auto">
            <DraftBoard
              availablePlayers={available}
              onSelect={handleSelect}
              canDraft={isMyTurn && !complete}
              pending={pending}
            />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="mb-2 text-sm font-medium text-gray-500">Your team</p>
            {myPicks.length === 0 ? (
              <p className="text-sm text-gray-500">No picks yet.</p>
            ) : (
              <ol className="space-y-1 text-sm">
                {myPicks.map((p) => {
                  const player = playerName(p.playerId);
                  return (
                    <li key={p.id}>
                      <span className="text-xs text-gray-400">#{p.pickNumber}</span>{" "}
                      {player ? (
                        <>
                          {player.name}{" "}
                          <span className="text-gray-500">
                            {player.position} · {player.nflTeam}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          <Card>
            <p className="mb-2 text-sm font-medium text-gray-500">Draft board</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="py-1 pr-2">Rd</th>
                    {managers.map((id) => (
                      <th key={id} className="py-1 pr-2 font-medium">
                        {managerName(id)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: draftRounds }, (_, roundIdx) => {
                    const slice = localPicks.slice(roundIdx * podSize, (roundIdx + 1) * podSize);
                    const byUser = new Map(slice.map((p) => [p.userId, p]));
                    return (
                      <tr key={roundIdx} className="border-t border-gray-100 align-top">
                        <td className="py-2 pr-2 text-gray-400">{roundIdx + 1}</td>
                        {managers.map((id) => {
                          const pick = byUser.get(id);
                          const player = pick ? playerName(pick.playerId) : null;
                          const isCurrent = pick && onClock?.id === pick.id;
                          return (
                            <td
                              key={id}
                              className={`py-2 pr-2 ${isCurrent ? "font-semibold text-black" : ""}`}
                            >
                              {isCurrent
                                ? "On clock"
                                : player
                                  ? `${player.name}`
                                  : pick
                                    ? "—"
                                    : ""}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
