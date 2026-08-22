"use client";

import Link from "next/link";
import { usePathname, useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signOutAction } from "@/lib/actions/contest";
import { Button } from "@/components/ui/Button";
import type { ContestStatus, GameMode } from "@/lib/types";

export const LAST_CONTEST_KEY = "gladiator.lastContestId";
const NAV_CACHE_KEY = "gladiator.nav";

export interface NavContest {
  id: string;
  name: string;
  currentWeek: number;
  gameMode: GameMode;
  status: ContestStatus;
  podId: string | null;
}

interface NavPayload {
  user: { id: string; displayName: string } | null;
  credits: number | null;
  contests: NavContest[];
}

function pickDefaultContest(contests: NavContest[]) {
  return (
    contests.find((c) => c.status === "active" || c.status === "phase2") ??
    contests.find((c) => c.status === "drafting") ??
    contests[0] ??
    null
  );
}

function navClass(active: boolean) {
  return active
    ? "font-medium text-black underline decoration-2 underline-offset-4"
    : "text-gray-600 hover:text-black hover:underline";
}

const NAV_TTL_MS = 60_000;

type StoredNav = NavPayload & { cachedAt?: number };

function readCache(): { payload: NavPayload; fresh: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(NAV_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredNav;
    const { cachedAt, ...payload } = parsed;
    return {
      payload,
      fresh: typeof cachedAt === "number" && Date.now() - cachedAt < NAV_TTL_MS,
    };
  } catch {
    return null;
  }
}

export function AppNav() {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const [nav, setNav] = useState<NavPayload>(() => ({
    user: null,
    credits: null,
    contests: [],
  }));

  useEffect(() => {
    const cached = readCache();
    if (cached) setNav(cached.payload);
    if (cached?.fresh) return;
    fetch("/api/nav")
      .then((r) => r.json())
      .then((data: NavPayload) => {
        sessionStorage.setItem(
          NAV_CACHE_KEY,
          JSON.stringify({ ...data, cachedAt: Date.now() }),
        );
        setNav(data);
      })
      .catch(() => undefined);
  }, []);

  const urlContestId = useMemo(() => {
    if (typeof params.contestId === "string") return params.contestId;
    if (typeof params.leagueId === "string") return params.leagueId;
    const fromQuery = searchParams.get("contestId");
    if (fromQuery) return fromQuery;
    if (typeof params.podId === "string") {
      return nav.contests.find((c) => c.podId === params.podId)?.id ?? null;
    }
    return null;
  }, [params, searchParams, nav.contests]);

  const [storedId, setStoredId] = useState<string | null>(null);

  useEffect(() => {
    if (urlContestId) {
      sessionStorage.setItem(LAST_CONTEST_KEY, urlContestId);
      setStoredId(urlContestId);
      return;
    }
    setStoredId(sessionStorage.getItem(LAST_CONTEST_KEY));
  }, [urlContestId]);

  const contest =
    nav.contests.find((c) => c.id === urlContestId) ??
    nav.contests.find((c) => c.id === storedId) ??
    pickDefaultContest(nav.contests);

  const contestId = contest?.id ?? null;
  const week = contest?.currentWeek ?? 1;
  const q = contestId ? `?contestId=${contestId}` : "";

  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/lobby" className="font-bold">
            Gladiator League
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link href="/lobby" className={navClass(pathname === "/lobby")}>
              Lobby
            </Link>
            <Link href="/dashboard" className={navClass(pathname === "/dashboard")}>
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {contest ? (
            <span className="rounded-md bg-gray-100 px-2 py-1 font-medium capitalize">
              Week {week} · {contest.status}
            </span>
          ) : null}
          {nav.credits != null ? (
            <span className="rounded-md bg-gray-100 px-2 py-1 font-medium">
              {nav.credits.toLocaleString()} credits
            </span>
          ) : null}
          {nav.user ? (
            <form
              action={signOutAction}
              onSubmit={() => {
                sessionStorage.removeItem(NAV_CACHE_KEY);
                sessionStorage.removeItem(LAST_CONTEST_KEY);
              }}
            >
              <Button type="submit" className="!px-2 !py-1 text-xs">
                Sign out
              </Button>
            </form>
          ) : (
            <Link href="/login" className="underline">
              Sign in
            </Link>
          )}
        </div>
      </div>

      {contestId ? (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2 text-sm">
            <Link
              href={`/contest/${contestId}`}
              className={`max-w-[14rem] truncate ${navClass(pathname.startsWith("/contest/"))}`}
              title={contest?.name}
            >
              {contest?.name ?? "Contest"}
            </Link>
            <nav className="flex flex-wrap gap-3">
              <Link href={`/team${q}`} className={navClass(pathname === "/team")}>
                Team
              </Link>
              <Link href={`/matchup${q}`} className={navClass(pathname === "/matchup")}>
                Matchup
              </Link>
              <Link
                href={`/leaderboard${q}`}
                className={navClass(pathname === "/leaderboard")}
              >
                Standings
              </Link>
              <Link href={`/waivers${q}`} className={navClass(pathname === "/waivers")}>
                Waivers
              </Link>
              <Link
                href={`/draft/${contestId}`}
                className={navClass(pathname.startsWith("/draft/"))}
              >
                Draft
              </Link>
              {contest?.podId ? (
                <Link
                  href={`/pod/${contest.podId}`}
                  className={navClass(pathname.startsWith("/pod/"))}
                >
                  Pod
                </Link>
              ) : null}
              {contest?.gameMode === "gladiator" ? (
                <Link
                  href={`/gladiator-pick/${week}?contestId=${contestId}`}
                  className={navClass(pathname.startsWith("/gladiator-pick/"))}
                >
                  Gladiator
                </Link>
              ) : null}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
