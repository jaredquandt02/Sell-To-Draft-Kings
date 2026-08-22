# Gladiator League

Public fantasy football contests on a classic platform foundation, with a
Gladiator elimination mode (pods, weekly 1v1 survival, one-time Gladiator
Pick, Medic Card, Phase 2 median cuts).

Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres,
Auth, Realtime), deployed as one Vercel project. See `docs/ARCHITECTURE.md`
for the full design.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys; STATS_PROVIDER=mock works offline
npm run dev
```

Without Supabase env vars the app runs in **demo mode** (mock lobby + UI).
With Supabase configured: sign up → lobby → enter contest → draft after podding cron.

Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test
```

## Database

```bash
supabase start
supabase db reset   # migrations + seed (classic + gladiator contests)
```

## Cron jobs

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron?job=podding&contestId=<uuid>"
curl -H "Authorization: Bearer $CRON_SECRET" \
  "http://localhost:3000/api/cron?job=scoring&week=1"
```

## Large test database (hosted)

Fills two 120-person contests (classic + gladiator) with bot users, completed
pod drafts, week-1 scores, sample gladiator picks, and waiver claims.

```bash
npm run seed:test   # 120-person classic + gladiator fields
npm run seed:ui     # week 2, live draft lab, phase 2, waivers, medic
```

Then sign in as `jared@gladiator.test` / `Gladiator1!` and open the lobby.

After `seed:ui` you should see:

- **Lobby** — Week 1 Public Classic (8/12) and Gladiator Open Field (19/48)
- **Dashboard** — week-2 fields, live draft todo, injured starter + Medic
- **Live Draft Lab** — Jared on the clock
- **Test Gladiator Field (120)** — week 2, Gladiator Pick, Medic Card, waivers
- **Phase 2 Showcase** — median-cut field in `phase2`

## Load test (staging)

```bash
npm run load-test -- --contest <uuid> --users 48 --dry-run
```
