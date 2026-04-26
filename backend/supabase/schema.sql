create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null check (
    role in ('public_user', 'asha_worker', 'ngo_planner', 'government_auditor', 'admin')
  ),
  full_name text,
  organization text,
  district text,
  state text,
  language text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  query text not null,
  language text,
  radius_km integer,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_facilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  facility_id text not null,
  notes text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.saved_searches enable row level security;
alter table public.saved_facilities enable row level security;

drop policy if exists "profiles_select_own" on public.user_profiles;
create policy "profiles_select_own"
on public.user_profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.user_profiles;
create policy "profiles_insert_own"
on public.user_profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_update_own"
on public.user_profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "saved_searches_own" on public.saved_searches;
create policy "saved_searches_own"
on public.saved_searches
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "saved_facilities_own" on public.saved_facilities;
create policy "saved_facilities_own"
on public.saved_facilities
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
