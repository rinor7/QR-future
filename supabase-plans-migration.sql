-- ============================================================
-- PLANS MIGRATION — run this in Supabase SQL Editor
-- ============================================================

-- 1. Add user_id to contacts (UUID linking to auth.users)
alter table contacts
  add column if not exists user_id uuid references auth.users(id);

create index if not exists contacts_user_id_idx on contacts(user_id);

-- 2. Profiles table (one row per user, stores their plan)
create table if not exists profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  plan       text not null default 'free', -- 'free' | 'star' | 'premium' | 'platinum'
  created_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "Users read own profile" on profiles
  for select using (auth.uid() = user_id);

create policy "Users update own profile" on profiles
  for update using (auth.uid() = user_id);

create policy "Users insert own profile" on profiles
  for insert with check (auth.uid() = user_id);

-- 3. Auto-create profile when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 4. Manually create profiles for any existing users (run once)
insert into public.profiles (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;

-- 5. Try to set user_id on existing contacts by matching created_by email
update contacts c
set user_id = u.id
from auth.users u
where c.created_by = u.email
  and c.user_id is null;

-- 6. Update contacts RLS — users manage only their own contacts
--    Public read stays so QR landing pages still work without auth
drop policy if exists "Public write" on contacts;

create policy "Users manage own contacts" on contacts
  for all using (auth.uid() = user_id);
