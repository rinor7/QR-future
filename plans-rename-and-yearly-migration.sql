-- ============================================================
-- Plan rename + yearly pricing migration
-- ------------------------------------------------------------
-- 1. Rename DB plan values: star → growth, premium → business,
--    platinum → enterprise. Touches both profiles and plan_config.
-- 2. Add price_yearly column to plan_config so admins can set a
--    yearly price alongside monthly.
-- ============================================================

-- Profiles: rename plan values for any existing subscribers.
update profiles set plan = 'growth'     where plan = 'star';
update profiles set plan = 'business'   where plan = 'premium';
update profiles set plan = 'enterprise' where plan = 'platinum';

-- Plan config: rename the plan keys (PK), then seed new prices
-- (idempotent: only fills when row exists from the rename above).
update plan_config set plan = 'growth'     where plan = 'star';
update plan_config set plan = 'business'   where plan = 'premium';
update plan_config set plan = 'enterprise' where plan = 'platinum';

-- New yearly column. Default 0 so the API can always read it.
alter table plan_config
  add column if not exists price_yearly numeric not null default 0;

-- Seed the new monthly + yearly prices the admin asked for. Only
-- updates if the row already exists so we don't fight RLS / inserts.
update plan_config set price = 0,      price_yearly = 0    where plan = 'free';
update plan_config set price = 12.90,  price_yearly = 120  where plan = 'growth';
update plan_config set price = 24.90,  price_yearly = 240  where plan = 'business';
update plan_config set price = 79.90,  price_yearly = 749  where plan = 'enterprise';
