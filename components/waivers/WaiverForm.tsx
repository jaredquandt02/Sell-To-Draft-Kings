"use client";

import { useState, useTransition } from "react";
import type { Player } from "@/lib/types";
import { submitWaiverClaimAction } from "@/lib/actions/roster";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function WaiverForm({
  contestId,
  freeAgents,
  rosterPlayers,
}: {
  contestId: string;
  freeAgents: Player[];
  rosterPlayers: Player[];
}) {
  const [addId, setAddId] = useState(freeAgents[0]?.id ?? "");
  const [dropId, setDropId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <p className="mb-3 text-sm text-gray-600">
        Submit a free-agent claim. Processed in worst-record-first order.
      </p>
      <div className="flex flex-col gap-3">
        <label className="text-sm">
          Add
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
          >
            {freeAgents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.position} — {p.nflTeam})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Drop (optional)
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            value={dropId}
            onChange={(e) => setDropId(e.target.value)}
          >
            <option value="">— none —</option>
            {rosterPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.position})
              </option>
            ))}
          </select>
        </label>
        {message ? <p className="text-sm">{message}</p> : null}
        <Button
          disabled={pending || !addId}
          onClick={() => {
            startTransition(async () => {
              const result = await submitWaiverClaimAction({
                contestId,
                addPlayerId: addId,
                dropPlayerId: dropId || null,
              });
              setMessage(result.ok ? "Claim submitted" : result.error);
            });
          }}
        >
          {pending ? "Submitting…" : "Submit claim"}
        </Button>
      </div>
    </Card>
  );
}
