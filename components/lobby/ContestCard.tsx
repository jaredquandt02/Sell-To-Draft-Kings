"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enterContestAction } from "@/lib/actions/contest";
import { Button } from "@/components/ui/Button";
import type { Contest, GameMode } from "@/lib/types";

export function EnterContestButton({
  contestId,
  disabled,
}: {
  contestId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await enterContestAction(contestId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(`/contest/${contestId}`);
            router.refresh();
          });
        }}
      >
        {pending ? "Entering…" : "Enter"}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function ContestCard({
  contest,
  entrantCount,
  alreadyEntered,
}: {
  contest: Contest;
  entrantCount: number;
  alreadyEntered: boolean;
}) {
  const pct = Math.min(
    100,
    Math.round((entrantCount / Math.max(contest.maxEntrants, 1)) * 100),
  );

  return (
    <article className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                contest.gameMode === "gladiator"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {modeLabel(contest.gameMode)}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-700">
              {contest.status}
            </span>
            <span className="text-xs text-gray-500">Week {contest.currentWeek}</span>
          </div>
          <h2 className="mt-2 font-semibold">{contest.name}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {contest.entryFeeCredits} credits · pods of {contest.podSize} ·{" "}
            {contest.draftRounds}-round draft
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-black" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {entrantCount.toLocaleString()}/{contest.maxEntrants.toLocaleString()}{" "}
            entered
          </p>
        </div>
        {alreadyEntered ? (
          <a
            href={`/contest/${contest.id}`}
            className="shrink-0 rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
          >
            Open
          </a>
        ) : contest.status === "open" ? (
          <EnterContestButton contestId={contest.id} />
        ) : (
          <a
            href={`/contest/${contest.id}`}
            className="shrink-0 text-sm text-gray-600 underline"
          >
            View
          </a>
        )}
      </div>
    </article>
  );
}

function modeLabel(mode: GameMode) {
  return mode === "gladiator" ? "Gladiator" : "Classic H2H";
}
