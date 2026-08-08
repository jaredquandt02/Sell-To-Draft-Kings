-- Minimal local dev seed. Assumes `supabase start` has run the migration.
-- auth.users rows are created separately (via Supabase Auth), so `users`
-- here references fixed UUIDs you also sign up locally with the same ids.

insert into seasons (id, name, start_week, end_week, status)
values ('00000000-0000-0000-0000-000000000001', '2026 Season', 1, 17, 'active');

insert into leagues (id, season_id, entry_fee_credits, status)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  0,
  'drafting'
);

insert into players (external_id, name, position, nfl_team) values
  ('nfl-1', 'Patrick Mahomes', 'QB', 'KC'),
  ('nfl-2', 'Christian McCaffrey', 'RB', 'SF'),
  ('nfl-3', 'Justin Jefferson', 'WR', 'MIN'),
  ('nfl-4', 'Travis Kelce', 'TE', 'KC'),
  ('nfl-5', 'Harrison Butker', 'K', 'KC');
