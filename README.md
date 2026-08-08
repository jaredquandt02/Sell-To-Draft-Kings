# Gladiator League

A fantasy football elimination league — draft, survive weekly 1v1 matchups
in your pod, and make a one-time-use gladiator pick each week for bonus
points.

Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres,
Auth, Realtime), deployed as one Vercel project. See `docs/ARCHITECTURE.md`
for the full design (data model, swappable stats-provider pattern, build
order).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase + stats provider keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

Game rules (pods, elimination, median cuts, medic card, scoring) are pure
functions in `lib/game-engine/`, unit-tested independently of the UI:

```bash
npm test
```

## Database

Schema lives in `supabase/migrations/`. Against a local Supabase instance:

```bash
supabase start
supabase db reset   # applies migrations + supabase/seed.sql
```
