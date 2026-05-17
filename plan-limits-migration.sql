-- Make per-plan limits (QR codes + team members) editable from the admin
-- plan-settings page instead of hard-coded in src/lib/types.ts. -1 means
-- "unlimited" — same convention as the old PLAN_LIMITS constant.
alter table plan_config add column if not exists qr_limit   integer not null default 1;
alter table plan_config add column if not exists team_limit integer not null default 1;

-- Seed with the values that match the current code defaults.
update plan_config set qr_limit = 1,   team_limit = 1  where plan = 'free';
update plan_config set qr_limit = 10,  team_limit = 3  where plan = 'growth';
update plan_config set qr_limit = 100, team_limit = 10 where plan = 'business';
update plan_config set qr_limit = -1,  team_limit = -1 where plan = 'enterprise';

-- Tell PostgREST about the new columns so the API can see them immediately.
notify pgrst, 'reload schema';
