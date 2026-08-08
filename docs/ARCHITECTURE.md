# Gladiator League — Technical Architecture

Reference doc for building in Cursor. Covers stack, folder structure, data model, and the swappable stats-provider pattern.

## Stack (locked in)

- **Frontend/backend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS — single codebase, deploys as one Vercel project.
- **Database/auth/realtime:** Supabase (Postgres + Auth + Realtime + Storage).
- **Hosting:** Vercel.
- **Stats data:** swappable provider interface (see below) — start on Tank01 or MySportsFeeds, swap to SportsDataIO/Sportradar at real-money launch.
- **Money:** none in v1. Everything runs on virtual credits until legal clears.

## Why this stack

Next.js + Supabase is the fastest path for a solo builder: one repo, no separate backend service to deploy/monitor, auth and Postgres come free, and Supabase Realtime gives you live-updating scores/leaderboards without hand-rolling websockets. Vercel's Next.js integration is zero-config. None of this locks you in — Postgres and Next.js are easy to migrate off later if you outgrow them.

## Folder structure

```
gladiator-league/
  app/
    (marketing)/              # public landing page, waitlist
      page.tsx
      layout.tsx
    (app)/                    # authenticated app shell
      dashboard/
      draft/[leagueId]/
      pod/[podId]/
      gladiator-pick/[week]/
      leaderboard/
      layout.tsx
    api/
      webhooks/                # stats-provider push webhooks, if used
      cron/                    # scheduled jobs (scoring, cuts, restock)
    layout.tsx
    globals.css
  lib/
    supabase/
      client.ts                # browser client
      server.ts                # server client (RSC/route handlers)
      admin.ts                 # service-role client, server-only
    stats-provider/
      types.ts                 # ProviderInterface contract
      tank01.ts                 # implementation
      mysportsfeeds.ts          # implementation
      sportsdataio.ts            # implementation (added later)
      index.ts                  # picks active provider from env
    game-engine/
      pods.ts                   # pod assignment, snake draft order
      elimination.ts             # 1v1 matchup resolution
      redraft.ts                 # waiver pick-order logic
      phase2-cuts.ts             # median cut + tie handling
      medic-card.ts               # injury substitution logic
      scoring.ts                 # fantasy point calculation
    types.ts                    # shared domain types
  components/
    ui/                         # base components (buttons, cards, inputs)
    draft/
    gladiator-pick/
    leaderboard/
  supabase/
    migrations/                 # SQL migrations
    seed.sql
  tests/
    game-engine/                # unit tests for rules — test these hard, independent of UI
```

Keep `lib/game-engine/` framework-agnostic — plain TypeScript, no Next.js or Supabase imports inside the rule logic itself. That's what makes the one-time-use gladiator rule, median cuts, and tiebreakers unit-testable without spinning up the whole app, and it's the part of this codebase where a subtle bug actually costs someone money later.

## Core data model (Postgres tables, simplified)

```
users              id, email, display_name, created_at
seasons            id, name, start_week, end_week, status
leagues            id, season_id, entry_fee_credits, status
pods               id, league_id, pod_number
pod_members        pod_id, user_id, roster_id, eliminated_at_week
rosters            id, user_id, league_id
roster_players     roster_id, player_id, added_week, used_as_gladiator_week (null until used)
players            id, external_id, name, position, nfl_team    -- synced from stats provider
matchups           id, pod_id, week, user_id_a, user_id_b, winner_id
gladiator_picks    id, roster_player_id, user_id, week, score, multiplier_applied
weekly_scores      id, user_id, week, points, cumulative_points  -- phase 2
medic_card_uses    id, user_id, triggered_week, backup_player_id
transactions       id, user_id, type, credits, created_at         -- virtual credits ledger
```

The `used_as_gladiator_week` column on `roster_players` is the enforcement point for the one-time-use rule — check it before allowing any gladiator selection, both client-side (UX) and in a Postgres row-level check or trigger (source of truth). Don't trust the client for anything that affects payouts later.

## Swappable stats-provider pattern

```ts
// lib/stats-provider/types.ts
interface StatsProvider {
  getWeeklyStats(week: number, season: number): Promise<PlayerWeeklyStats[]>;
  getPlayerStatus(playerId: string): Promise<InjuryStatus>;
  getLiveScores(week: number): Promise<LiveGameScore[]>;
}
```

Each provider (`tank01.ts`, `mysportsfeeds.ts`, `sportsdataio.ts`) implements this interface and maps its own response shape into your internal types. `lib/stats-provider/index.ts` exports whichever implementation matches `process.env.STATS_PROVIDER`. Nothing else in the codebase imports a provider file directly — swapping providers later is a one-line env change, not a rewrite.

## Environments

- **Local:** Supabase local dev (`supabase start`) or a free-tier hosted project.
- **Staging:** separate Supabase project + Vercel preview deployments per branch.
- **Production:** separate Supabase project, real domain, real (eventually) payment integration behind a feature flag.

## Suggested build order

1. Auth + basic app shell (Supabase Auth, protected routes).
2. Game engine as pure functions with unit tests — pods, matchups, one-time-use rule, median cuts, Medic Card. No UI yet.
3. Draft flow UI, backed by mock/seeded player data.
4. Weekly gladiator-pick UI + live scoring, wired to the stats-provider interface.
5. Leaderboard/standings, Phase 2 cut mechanic.
6. Landing/marketing page + waitlist capture (can be built in parallel with 1-2, it doesn't depend on the game engine).
7. Payments/KYC — deferred until legal clearance.
