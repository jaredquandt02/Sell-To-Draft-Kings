# Gladiator League — Technical Architecture

Reference doc for building in Cursor. Covers stack, folder structure, data model, and the swappable stats-provider pattern.

## Product direction

- **End state:** Public massive-field contests (mass entry → auto-pod → shared virtual-credit pool).
- **Build sequence:** Classic fantasy platform surfaces first (`GAME_MODE=classic`), then mold into Gladiator elimination (`game_mode=gladiator` per contest).
- **Scale target:** Schema and jobs sized for ~100k entrants/contest (pod sharding, batched scoring, pod-scoped realtime).
- **Money:** Virtual credits only in v1.

## Stack (locked in)

- **Frontend/backend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS — single codebase, deploys as one Vercel project.
- **Database/auth/realtime:** Supabase (Postgres + Auth + Realtime + Storage).
- **Hosting:** Vercel (+ Cron for weekly jobs).
- **Stats data:** swappable provider interface — default `mock` locally; Tank01 / MySportsFeeds / SportsDataIO when keyed.
- **Money:** none in v1. Everything runs on virtual credits until legal clears.

## Why this stack

Next.js + Supabase is the fastest path for a solo builder: one repo, no separate backend service to deploy/monitor, auth and Postgres come free, and Supabase Realtime gives you live-updating scores/leaderboards without hand-rolling websockets. Vercel's Next.js integration is zero-config. None of this locks you in — Postgres and Next.js are easy to migrate off later if you outgrow them.

When Realtime or single-region Postgres becomes the bottleneck (draft night + Sunday scoring), split **workers first** (queue + dedicated scorer), not a full rewrite.

## Folder structure

```
gladiator-league/
  app/
    (marketing)/              # public landing
    (auth)/                   # login / signup
    (app)/                    # authenticated shell: lobby, contest, draft, team, …
    api/cron/                 # scoring, podding, waivers, phase2 cuts
    api/webhooks/
  lib/
    actions/                  # server actions (entry, draft, roster, gladiator, medic)
    data/                     # RSC data loaders
    jobs/                     # service-role batch jobs + observability
    supabase/                 # browser / server / admin clients
    stats-provider/           # mock | tank01 | mysportsfeeds | sportsdataio
    game-engine/              # pure rules (unit tested)
    config.ts                 # GAME_MODE helpers
    types.ts
  scripts/
    load-test-entry.ts        # staging entry + podding load helper
  supabase/migrations/
  tests/game-engine/
```

Keep `lib/game-engine/` framework-agnostic — plain TypeScript, no Next.js or Supabase imports inside the rule logic itself.

## Contest status machine

`open → drafting → active → phase2 → complete`

- **open:** public lobby entry (`enter_contest` RPC debits credits)
- **drafting:** after lock/podding cron seeds pods + draft_picks
- **active:** weekly scoring + (gladiator) elimination
- **phase2:** median cuts (gladiator mode)
- **complete:** season over

Per-contest `game_mode`: `classic` (H2H points, no elimination) | `gladiator` (1v1 elimination, Gladiator Pick, Medic Card, median cuts).

## Core data model

```
users              id, email, display_name, created_at
seasons            id, name, start_week, end_week, status
contests           id, season_id, name, entry_fee_credits, max_entrants,
                   pod_size, game_mode, status, current_week, lock_at, draft_rounds
contest_entries    contest_id, user_id (unique)
pods               contest_id, pod_number
pod_members        pod_id, user_id, roster_id, eliminated_at_week
rosters            user_id, contest_id
roster_players     roster_id, player_id, is_starter, slot_order, used_as_gladiator_week
players            external_id, name, position, nfl_team
draft_picks        contest_id, pod_id, pick_number, user_id, player_id
matchups           pod_id, week, user_id_a, user_id_b, winner_id
gladiator_picks    contest_id, roster_player_id, user_id, week, multiplier_applied
weekly_scores      contest_id, user_id, week, points, cumulative_points
medic_card_uses    contest_id, user_id, triggered_week, backup_player_id
waiver_claims      contest_id, user_id, add_player_id, drop_player_id, status
transactions       user_id, type, credits          -- virtual credits ledger
contest_jobs       job_type, idempotency_key, status, rows_affected, error
```

Scale rules: every hot row keyed by `contest_id` (and `pod_id` where relevant). Realtime subscriptions should be **pod-scoped**, never contest-wide.

The `used_as_gladiator_week` column + insert trigger on `gladiator_picks` enforce one-time-use in Postgres.

## Jobs (`/api/cron`)

Auth with `Authorization: Bearer $CRON_SECRET`.

| `job` | Behavior |
|-------|----------|
| `podding` | Lock open contests with full pods of N; seed draft + week-1 matchups |
| `scoring` | Fetch stats once → score starters → upsert weekly_scores → resolve matchups; eliminate in gladiator mode |
| `phase2_cuts` | Median cut (`usersCutByMedian`) |
| `waivers` | Fulfill pending claims in `waiverOrder` |
| `all` | Podding for open + scoring for active (phase2/waivers opt-in via query flags) |

All jobs write `contest_jobs` rows with idempotency keys (`scoring:{contestId}:{week}`, etc.).

## Swappable stats-provider pattern

```ts
interface StatsProvider {
  getWeeklyStats(week: number, season: number): Promise<PlayerWeeklyStats[]>;
  getPlayerStatus(playerId: string): Promise<InjuryStatus>;
  getLiveScores(week: number): Promise<LiveGameScore[]>;
}
```

`STATS_PROVIDER=mock|tank01|mysportsfeeds|sportsdataio`. Default **mock** for local/dev and load tests.

## Environments

- **Local:** Supabase local (`supabase start`) or free-tier hosted; `STATS_PROVIDER=mock`.
- **Staging:** separate Supabase project + Vercel previews; run `scripts/load-test-entry.ts`.
- **Production:** separate Supabase project; payments/KYC behind feature flag after legal clearance.

## Load testing

```bash
npx tsx scripts/load-test-entry.ts --contest <uuid> --users 48 --dry-run
npx tsx scripts/load-test-entry.ts --contest <uuid> --users 1008
```

Target: staging ≥10k entries with pod drafts + weekly score job &lt;15 min after stats available.

## Suggested build order (status)

1. ~~Auth + app shell~~ — middleware, login/signup, lobby
2. ~~Game engine unit tests~~ — pods, scoring, elimination, phase2, medic
3. ~~Classic platform~~ — entry, draft, roster, matchup, standings, waivers
4. ~~Gladiator mold~~ — podding job, elimination scoring, gladiator pick, medic, phase2
5. Marketing/waitlist polish (landing CTA live)
6. Payments/KYC — deferred until legal clearance
7. Massive-field hardening — workers/queue when needed
