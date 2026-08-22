"use client";

import { useMemo, useState } from "react";
import { ContestCard } from "@/components/lobby/ContestCard";
import type { Contest, GameMode } from "@/lib/types";

type StatusFilter = "all" | "open" | "live" | "mine";
type ModeFilter = "all" | GameMode;

export function LobbyList({
  contests,
  enteredIds,
}: {
  contests: Array<Contest & { entrantCount: number }>;
  enteredIds: string[];
}) {
  const [mode, setMode] = useState<ModeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const entered = useMemo(() => new Set(enteredIds), [enteredIds]);

  const mine = contests.filter((c) => entered.has(c.id));
  const filtered = contests.filter((c) => {
    if (mode !== "all" && c.gameMode !== mode) return false;
    if (status === "open" && c.status !== "open") return false;
    if (status === "live" && c.status === "open") return false;
    if (status === "mine" && !entered.has(c.id)) return false;
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const pinned = status === "all" && !query && mode === "all" ? mine : [];
  const rest = pinned.length ? filtered.filter((c) => !entered.has(c.id)) : filtered;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPills
          value={mode}
          onChange={setMode}
          options={[
            { id: "all", label: "All modes" },
            { id: "classic", label: "Classic" },
            { id: "gladiator", label: "Gladiator" },
          ]}
        />
        <FilterPills
          value={status}
          onChange={setStatus}
          options={[
            { id: "all", label: "All" },
            { id: "open", label: "Open" },
            { id: "live", label: "In progress" },
            { id: "mine", label: "My contests" },
          ]}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contests"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>

      {pinned.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Your contests
          </h2>
          <div className="grid gap-3">
            {pinned.map((c) => (
              <ContestCard
                key={c.id}
                contest={c}
                entrantCount={c.entrantCount}
                alreadyEntered
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {pinned.length > 0 ? "More contests" : "Contests"}
        </h2>
        {rest.length === 0 ? (
          <p className="text-sm text-gray-600">No contests match those filters.</p>
        ) : (
          <div className="grid gap-3">
            {rest.map((c) => (
              <ContestCard
                key={c.id}
                contest={c}
                entrantCount={c.entrantCount}
                alreadyEntered={entered.has(c.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ id: T; label: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded px-2.5 py-1 text-xs font-medium ${
            value === opt.id ? "bg-white text-black shadow-sm" : "text-gray-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
