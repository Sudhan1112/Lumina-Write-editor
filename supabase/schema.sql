-- ============================================================
-- Lumina Write — PostgreSQL Schema
-- Paste ENTIRE script in Supabase SQL Editor → click Run
-- Safe to re-run: drops everything first
-- ============================================================

drop table if exists public.document_access_requests cascade;
drop table if exists public.document_versions cascade;
drop table if exists public.document_members cascade;
drop table if exists public.documents cascade;
drop table if exists public.profiles cascade;
drop type if exists app_role cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_document_member(uuid) cascade;

-- 1. Role enum — five tiers from least to most privileged
create type app_role as enum ('viewer', 'commenter', 'editor', 'admin', 'owner');

-- 2. Profiles — one row per auth.users entry
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text,
  avatar_url text,
  color text default '#3B82F6'
);
alter table public.profiles enable row level security;
create policy "Profiles viewable by all." on profiles for select using (true);
create policy "Users update own profile." on profiles for update using (auth.uid() = id);
create policy "Service can insert profiles." on profiles for insert with check (true);

-- Auto-create profile row when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users into profiles (safe to run on empty DB)
insert into public.profiles (id, email, full_name, avatar_url)
select id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;
