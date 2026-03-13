-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

create table if not exists contacts (
  id              text primary key,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,
  name            text default '' not null,
  title           text default '' not null,
  company         text default '' not null,
  logo_url        text default '' not null,
  phone           text default '' not null,
  email           text default '' not null,
  website         text default '' not null,
  linkedin_url    text default '' not null,
  instagram_url   text default '' not null,
  facebook_url    text default '' not null,
  pdf_url         text default '' not null,
  pdf_label       text default 'Dokument öffnen' not null,
  address         text default '' not null,
  primary_color   text default '#2563eb' not null,
  notes           text default '' not null,
  created_by      text default '' not null
);

-- Allow anyone to read contacts (needed for QR landing pages)
alter table contacts enable row level security;

create policy "Public read" on contacts
  for select using (true);

-- Allow anyone to insert/update/delete (dashboard — add auth later)
create policy "Public write" on contacts
  for all using (true);
