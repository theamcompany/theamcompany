-- AM Digital Accounts - Supabase setup
-- Paste this entire script into Supabase Dashboard -> SQL Editor and run it.

create table if not exists public.am_digital_accounts (
  id bigint primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.am_digital_accounts enable row level security;

grant select, insert, update on public.am_digital_accounts to anon, authenticated;

drop policy if exists "Public can read AM Digital Accounts" on public.am_digital_accounts;
drop policy if exists "Public can publish AM Digital Accounts" on public.am_digital_accounts;

create policy "Public can read AM Digital Accounts"
on public.am_digital_accounts
for select
to anon, authenticated
using (true);

create policy "Public can publish AM Digital Accounts"
on public.am_digital_accounts
for insert, update
to anon, authenticated
with check (true);

-- Enable Realtime for this table. If Supabase says the table is already
-- in the publication, leave it as-is and continue.
alter publication supabase_realtime add table public.am_digital_accounts;
