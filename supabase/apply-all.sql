-- Core Gladiator League schema.
-- Mirrors lib/types.ts — keep the two in sync when this evolves.

create extension if not exists "pgcrypto";

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_week int not null,
  end_week int not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'complete'))
);

create table leagues (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons (id) on delete cascade,
  entry_fee_credits int not null default 0,
  status text not null default 'drafting'
    check (status in ('drafting', 'active', 'phase2', 'complete'))
);

create table pods (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues (id) on delete cascade,
  pod_number int not null,
  unique (league_id, pod_number)
);

create table rosters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  league_id uuid not null references leagues (id) on delete cascade,
  unique (user_id, league_id)
);

create table pod_members (
  pod_id uuid not null references pods (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  roster_id uuid not null references rosters (id) on delete cascade,
  eliminated_at_week int,
  primary key (pod_id, user_id)
);

create table players (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  position text not null check (position in ('QB', 'RB', 'WR', 'TE', 'K', 'DST')),
  nfl_team text not null
);

create table roster_players (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references rosters (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  added_week int not null,
  -- Enforcement point for the one-time-use gladiator rule (see trigger below).
  used_as_gladiator_week int,
  unique (roster_id, player_id)
);

create table matchups (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pods (id) on delete cascade,
  week int not null,
  user_id_a uuid not null references users (id),
  user_id_b uuid not null references users (id),
  winner_id uuid references users (id),
  unique (pod_id, week, user_id_a, user_id_b)
);

create table gladiator_picks (
  id uuid primary key default gen_random_uuid(),
  roster_player_id uuid not null references roster_players (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  week int not null,
  score numeric not null default 0,
  multiplier_applied numeric not null default 1,
  unique (user_id, week)
);

create table weekly_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  week int not null,
  points numeric not null default 0,
  cumulative_points numeric not null default 0,
  unique (user_id, week)
);

create table medic_card_uses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  triggered_week int not null,
  backup_player_id uuid not null references players (id),
  unique (user_id)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null
    check (type in ('entry_fee', 'payout', 'credit_grant', 'adjustment')),
  credits numeric not null,
  created_at timestamptz not null default now()
);

-- One-time-use gladiator rule: source of truth lives in Postgres, not the
-- client. A roster_player can be picked as gladiator at most once, ever.
create function enforce_gladiator_one_time_use()
returns trigger as $$
declare
  already_used int;
begin
  select used_as_gladiator_week into already_used
  from roster_players
  where id = new.roster_player_id
  for update;

  if already_used is not null then
    raise exception
      'roster_player % was already used as gladiator on week %',
      new.roster_player_id, already_used;
  end if;

  update roster_players
  set used_as_gladiator_week = new.week
  where id = new.roster_player_id;

  return new;
end;
$$ language plpgsql;

create trigger gladiator_picks_enforce_one_time_use
  before insert on gladiator_picks
  for each row execute function enforce_gladiator_one_time_use();

-- Row Level Security. Every user can read their own rows; broader
-- pod/league visibility policies get added as those flows are built.
alter table users enable row level security;
alter table rosters enable row level security;
alter table roster_players enable row level security;
alter table gladiator_picks enable row level security;
alter table weekly_scores enable row level security;
alter table transactions enable row level security;

create policy "users read own row" on users
  for select using (auth.uid() = id);

create policy "users read own rosters" on rosters
  for select using (auth.uid() = user_id);

create policy "users read own roster players" on roster_players
  for select using (
    exists (
      select 1 from rosters
      where rosters.id = roster_players.roster_id
      and rosters.user_id = auth.uid()
    )
  );

create policy "users read own gladiator picks" on gladiator_picks
  for select using (auth.uid() = user_id);

create policy "users insert own gladiator picks" on gladiator_picks
  for insert with check (auth.uid() = user_id);

create policy "users read own weekly scores" on weekly_scores
  for select using (auth.uid() = user_id);

create policy "users read own transactions" on transactions
  for select using (auth.uid() = user_id);
-- Contest-first platform: evolve leagues → contests, add entries, draft,
-- lineups, waivers, job observability, and broader RLS.

-- ---------------------------------------------------------------------------
-- Rename leagues → contests and add tournament fields
-- ---------------------------------------------------------------------------
alter table leagues rename to contests;

alter table contests
  add column if not exists name text not null default 'Public Contest',
  add column if not exists max_entrants int not null default 12,
  add column if not exists pod_size int not null default 6,
  add column if not exists game_mode text not null default 'classic'
    check (game_mode in ('classic', 'gladiator')),
  add column if not exists current_week int not null default 1,
  add column if not exists lock_at timestamptz,
  add column if not exists draft_rounds int not null default 5;

alter table contests drop constraint if exists leagues_status_check;
alter table contests drop constraint if exists contests_status_check;
alter table contests
  add constraint contests_status_check
  check (status in ('open', 'drafting', 'active', 'phase2', 'complete'));

alter table contests alter column status set default 'open';

-- Rename league_id FKs → contest_id
alter table pods rename column league_id to contest_id;
alter table rosters rename column league_id to contest_id;

-- ---------------------------------------------------------------------------
-- Contest entries (idempotent user ↔ contest)
-- ---------------------------------------------------------------------------
create table contest_entries (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  entered_at timestamptz not null default now(),
  unique (contest_id, user_id)
);

create index contest_entries_contest_id_idx on contest_entries (contest_id);
create index contest_entries_user_id_idx on contest_entries (user_id);

-- ---------------------------------------------------------------------------
-- Draft picks (persisted snake draft)
-- ---------------------------------------------------------------------------
create table draft_picks (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests (id) on delete cascade,
  pod_id uuid not null references pods (id) on delete cascade,
  pick_number int not null,
  user_id uuid not null references users (id),
  player_id uuid references players (id),
  picked_at timestamptz,
  unique (pod_id, pick_number),
  unique (pod_id, player_id)
);

create index draft_picks_pod_id_idx on draft_picks (pod_id);

-- ---------------------------------------------------------------------------
-- Lineup: starter flag on roster players
-- ---------------------------------------------------------------------------
alter table roster_players
  add column if not exists is_starter boolean not null default false,
  add column if not exists slot_order int not null default 0;

-- ---------------------------------------------------------------------------
-- Scope weekly scores + medic to contest
-- ---------------------------------------------------------------------------
alter table weekly_scores
  add column if not exists contest_id uuid references contests (id) on delete cascade;

alter table weekly_scores drop constraint if exists weekly_scores_user_id_week_key;
alter table weekly_scores
  add constraint weekly_scores_contest_user_week_key unique (contest_id, user_id, week);

create index weekly_scores_contest_week_idx on weekly_scores (contest_id, week);

alter table medic_card_uses
  add column if not exists contest_id uuid references contests (id) on delete cascade;

alter table medic_card_uses drop constraint if exists medic_card_uses_user_id_key;
alter table medic_card_uses
  add constraint medic_card_uses_contest_user_key unique (contest_id, user_id);

-- Scope gladiator picks to contest
alter table gladiator_picks
  add column if not exists contest_id uuid references contests (id) on delete cascade;

alter table gladiator_picks drop constraint if exists gladiator_picks_user_id_week_key;
alter table gladiator_picks
  add constraint gladiator_picks_contest_user_week_key unique (contest_id, user_id, week);

-- ---------------------------------------------------------------------------
-- Waivers / free-agent claims
-- ---------------------------------------------------------------------------
create table waiver_claims (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  add_player_id uuid not null references players (id),
  drop_player_id uuid references players (id),
  status text not null default 'pending'
    check (status in ('pending', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now()
);

create index waiver_claims_contest_status_idx on waiver_claims (contest_id, status);

-- ---------------------------------------------------------------------------
-- Credit balance helper + enter_contest RPC
-- ---------------------------------------------------------------------------
create or replace function user_credit_balance(p_user_id uuid)
returns numeric as $$
  select coalesce(sum(credits), 0) from transactions where user_id = p_user_id;
$$ language sql stable security definer;

create or replace function enter_contest(p_contest_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_fee int;
  v_status text;
  v_max int;
  v_count int;
  v_balance numeric;
  v_roster_id uuid;
  v_entry_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select entry_fee_credits, status, max_entrants
    into v_fee, v_status, v_max
  from contests
  where id = p_contest_id
  for update;

  if not found then
    raise exception 'contest not found';
  end if;

  if v_status <> 'open' then
    raise exception 'contest is not open for entry';
  end if;

  select count(*) into v_count from contest_entries where contest_id = p_contest_id;
  if v_count >= v_max then
    raise exception 'contest is full';
  end if;

  if exists (
    select 1 from contest_entries
    where contest_id = p_contest_id and user_id = v_user_id
  ) then
    raise exception 'already entered';
  end if;

  v_balance := user_credit_balance(v_user_id);
  if v_balance < v_fee then
    raise exception 'insufficient credits';
  end if;

  insert into rosters (user_id, contest_id)
  values (v_user_id, p_contest_id)
  returning id into v_roster_id;

  insert into contest_entries (contest_id, user_id)
  values (p_contest_id, v_user_id)
  returning id into v_entry_id;

  if v_fee > 0 then
    insert into transactions (user_id, type, credits)
    values (v_user_id, 'entry_fee', -v_fee);
  end if;

  return v_entry_id;
end;
$$;

-- Auto-create public.users row when auth.users is created
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- Starter credit grant for virtual currency
  insert into public.transactions (user_id, type, credits)
  values (new.id, 'credit_grant', 1000);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Job observability (cron scoring / podding / cuts)
-- ---------------------------------------------------------------------------
create table contest_jobs (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid references contests (id) on delete set null,
  job_type text not null
    check (job_type in ('podding', 'scoring', 'elimination', 'phase2_cuts', 'waivers', 'lock')),
  week int,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_affected int not null default 0,
  error text,
  idempotency_key text not null unique
);

create index contest_jobs_type_started_idx on contest_jobs (job_type, started_at desc);

-- ---------------------------------------------------------------------------
-- RLS expansions
-- ---------------------------------------------------------------------------
alter table contests enable row level security;
alter table contest_entries enable row level security;
alter table pods enable row level security;
alter table pod_members enable row level security;
alter table players enable row level security;
alter table matchups enable row level security;
alter table draft_picks enable row level security;
alter table waiver_claims enable row level security;
alter table medic_card_uses enable row level security;
alter table contest_jobs enable row level security;

create policy "contests are publicly readable" on contests
  for select using (true);

create policy "entries readable by entrants and public lobby counts" on contest_entries
  for select using (true);

create policy "users insert own entry via rpc only" on contest_entries
  for insert with check (auth.uid() = user_id);

create policy "pods readable" on pods for select using (true);
create policy "pod members readable" on pod_members for select using (true);
create policy "players readable" on players for select using (true);
create policy "matchups readable" on matchups for select using (true);
create policy "draft picks readable" on draft_picks for select using (true);

create policy "users update own draft pick when on the clock" on draft_picks
  for update using (auth.uid() = user_id);

create policy "users manage own waiver claims" on waiver_claims
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users read own medic uses" on medic_card_uses
  for select using (auth.uid() = user_id);

create policy "users insert own medic uses" on medic_card_uses
  for insert with check (auth.uid() = user_id);

create policy "users update own roster players" on roster_players
  for update using (
    exists (
      select 1 from rosters
      where rosters.id = roster_players.roster_id
      and rosters.user_id = auth.uid()
    )
  );

create policy "users insert own roster players" on roster_players
  for insert with check (
    exists (
      select 1 from rosters
      where rosters.id = roster_players.roster_id
      and rosters.user_id = auth.uid()
    )
  );

create policy "users insert own roster" on rosters
  for insert with check (auth.uid() = user_id);

create policy "weekly scores readable in contest" on weekly_scores
  for select using (true);

create policy "users update own profile" on users
  for update using (auth.uid() = id);

create policy "users insert own profile" on users
  for insert with check (auth.uid() = id);

-- contest_jobs: service role only (no user policies = denied for anon/authenticated)
-- Contest-first seed. Auth users are created via Supabase Auth; the
-- handle_new_user trigger creates public.users + starter credits.

insert into seasons (id, name, start_week, end_week, status)
values ('00000000-0000-0000-0000-000000000001', '2026 Season', 1, 17, 'active')
on conflict (id) do nothing;

insert into contests (
  id, season_id, name, entry_fee_credits, max_entrants, pod_size,
  game_mode, status, current_week, draft_rounds
)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Week 1 Public Classic',
  100,
  12,
  6,
  'classic',
  'open',
  1,
  5
)
on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  game_mode = excluded.game_mode;

insert into contests (
  id, season_id, name, entry_fee_credits, max_entrants, pod_size,
  game_mode, status, current_week, draft_rounds
)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Gladiator Open Field',
  250,
  48,
  6,
  'gladiator',
  'open',
  1,
  5
)
on conflict (id) do nothing;

insert into players (external_id, name, position, nfl_team) values
  ('nfl-1', 'Patrick Mahomes', 'QB', 'KC'),
  ('nfl-2', 'Josh Allen', 'QB', 'BUF'),
  ('nfl-3', 'Jalen Hurts', 'QB', 'PHI'),
  ('nfl-4', 'Lamar Jackson', 'QB', 'BAL'),
  ('nfl-5', 'Christian McCaffrey', 'RB', 'SF'),
  ('nfl-6', 'Breece Hall', 'RB', 'NYJ'),
  ('nfl-7', 'Bijan Robinson', 'RB', 'ATL'),
  ('nfl-8', 'Saquon Barkley', 'RB', 'PHI'),
  ('nfl-9', 'Justin Jefferson', 'WR', 'MIN'),
  ('nfl-10', 'Ja''Marr Chase', 'WR', 'CIN'),
  ('nfl-11', 'CeeDee Lamb', 'WR', 'DAL'),
  ('nfl-12', 'Amon-Ra St. Brown', 'WR', 'DET'),
  ('nfl-13', 'Tyreek Hill', 'WR', 'MIA'),
  ('nfl-14', 'A.J. Brown', 'WR', 'PHI'),
  ('nfl-15', 'Travis Kelce', 'TE', 'KC'),
  ('nfl-16', 'Sam LaPorta', 'TE', 'DET'),
  ('nfl-17', 'Harrison Butker', 'K', 'KC'),
  ('nfl-18', 'Justin Tucker', 'K', 'BAL'),
  ('nfl-19', 'San Francisco Defense', 'DST', 'SF'),
  ('nfl-20', 'Baltimore Defense', 'DST', 'BAL'),
  ('nfl-21', 'Jonathan Taylor', 'RB', 'IND'),
  ('nfl-22', 'Puka Nacua', 'WR', 'LAR'),
  ('nfl-23', 'Garrett Wilson', 'WR', 'NYJ'),
  ('nfl-24', 'Mark Andrews', 'TE', 'BAL')
on conflict (external_id) do nothing;
