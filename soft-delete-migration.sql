-- Soft delete + 72h auto-purge for contacts and folders
-- Run this once in the Supabase SQL Editor.

-- 1. Add deleted_at columns
alter table contacts add column if not exists deleted_at timestamptz;
alter table folders  add column if not exists deleted_at timestamptz;

create index if not exists contacts_deleted_at_idx on contacts(deleted_at) where deleted_at is not null;
create index if not exists folders_deleted_at_idx  on folders(deleted_at)  where deleted_at is not null;

-- 2. Enable pg_cron (Supabase has this extension available; safe to call repeatedly)
create extension if not exists pg_cron;

-- 3. Purge function — deletes anything soft-deleted more than 72 hours ago
create or replace function purge_soft_deleted()
returns void
language plpgsql
security definer
as $$
begin
  -- Cascade: when a contact is permanently deleted, also clean its analytics rows
  delete from qr_scans
   where qr_id in (select id from contacts where deleted_at < now() - interval '72 hours');
  delete from qr_interactions
   where qr_id in (select id from contacts where deleted_at < now() - interval '72 hours');
  delete from qr_leads
   where qr_id in (select id from contacts where deleted_at < now() - interval '72 hours');

  delete from contacts where deleted_at < now() - interval '72 hours';
  delete from folders  where deleted_at < now() - interval '72 hours';
end;
$$;

-- 4. Schedule it: run every hour
-- Drop any prior schedule with the same name so this is idempotent
do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-soft-deleted-hourly') then
    perform cron.unschedule('purge-soft-deleted-hourly');
  end if;
end $$;

select cron.schedule(
  'purge-soft-deleted-hourly',
  '0 * * * *',  -- every hour at :00
  $$select purge_soft_deleted();$$
);
