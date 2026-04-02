-- Run once in Supabase SQL editor to add document comments workflow support.

create table if not exists public.document_comments (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 2000),
  selection_text text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists document_comments_document_created_idx
  on public.document_comments(document_id, created_at desc);

alter table public.document_comments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'document_comments'
      and policyname = 'Members can view comments.'
  ) then
    create policy "Members can view comments." on public.document_comments for select
      using (public.is_document_owner(document_id) or public.is_document_member(document_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'document_comments'
      and policyname = 'Members can create own comments.'
  ) then
    create policy "Members can create own comments." on public.document_comments for insert
      with check (
        auth.uid() = user_id
        and (public.is_document_owner(document_id) or public.is_document_member(document_id))
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'document_comments'
      and policyname = 'Authors can edit own comments.'
  ) then
    create policy "Authors can edit own comments." on public.document_comments for update
      using (
        auth.uid() = user_id
        and (public.is_document_owner(document_id) or public.is_document_member(document_id))
      )
      with check (
        auth.uid() = user_id
        and (public.is_document_owner(document_id) or public.is_document_member(document_id))
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'document_comments'
      and policyname = 'Authors and owners can delete comments.'
  ) then
    create policy "Authors and owners can delete comments." on public.document_comments for delete
      using (
        auth.uid() = user_id
        or public.is_document_owner(document_id)
      );
  end if;
end $$;
