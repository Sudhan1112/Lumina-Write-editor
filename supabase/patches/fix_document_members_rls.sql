-- Run once in Supabase SQL Editor if you already have the old document_members policies.
-- Fixes: full member roster for share modal, owner-only invites, owner can remove members.

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

drop policy if exists "View own memberships." on public.document_members;
drop policy if exists "Owner inserts members." on public.document_members;
drop policy if exists "Owner deletes members." on public.document_members;
drop policy if exists "Members view document roster." on public.document_members;
drop policy if exists "Owner adds document members." on public.document_members;
drop policy if exists "Owner updates member roles." on public.document_members;
drop policy if exists "Leave or owner removes members." on public.document_members;

create policy "Members view document roster." on public.document_members for select
  using (public.is_document_member(document_id));

create policy "Owner adds document members." on public.document_members for insert
  with check (public.is_document_owner(document_id));

create policy "Owner updates member roles." on public.document_members for update
  using (public.is_document_owner(document_id))
  with check (public.is_document_owner(document_id));

create policy "Leave or owner removes members." on public.document_members for delete
  using (
    user_id = auth.uid()
    or public.is_document_owner(document_id)
  );
