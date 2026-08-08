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
