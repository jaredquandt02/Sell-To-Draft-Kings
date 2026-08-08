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
