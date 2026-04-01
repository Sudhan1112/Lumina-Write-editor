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

-- 3. Documents
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  title text not null default 'Untitled Document',
  yjs_state text,                              -- base64-encoded Yjs binary state
  owner_id uuid references public.profiles(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
alter table public.documents enable row level security;

-- 4. Document Members — created BEFORE documents RLS policies are attached
create table public.document_members (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role app_role not null default 'viewer',
  created_at timestamptz default now() not null,
  unique(document_id, user_id)
);
alter table public.document_members enable row level security;

-- ⚠️ KEY FIX: SECURITY DEFINER functions break the RLS recursion cycle.
-- Without these, documents RLS checks document_members, whose RLS checks documents → infinite loop.
-- These functions run as the function owner (superuser), bypassing RLS internally.
create or replace function public.is_document_member(doc_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.document_members
    where document_id = doc_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_document_owner(doc_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.documents d
    where d.id = doc_id and d.owner_id = auth.uid()
  );
$$;

-- Documents RLS — uses SECURITY DEFINER helpers, no recursion
create policy "View own or member docs." on documents for select
  using (auth.uid() = owner_id or public.is_document_member(id));
create policy "Create docs." on documents for insert
  with check (auth.uid() = owner_id);
create policy "Owner updates." on documents for update
  using (auth.uid() = owner_id);
create policy "Owner deletes." on documents for delete
  using (auth.uid() = owner_id);

-- Document Members RLS
create policy "Members view document roster." on document_members for select
  using (public.is_document_member(document_id));
create policy "Owner adds document members." on document_members for insert
  with check (public.is_document_owner(document_id));
create policy "Owner updates member roles." on document_members for update
  using (public.is_document_owner(document_id))
  with check (public.is_document_owner(document_id));
create policy "Leave or owner removes members." on document_members for delete
  using (
    user_id = auth.uid()
    or public.is_document_owner(document_id)
  );
