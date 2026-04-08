-- Idempotent: adds `admin` to public.app_role if your database was created before that value existed.
-- Run in Supabase → SQL Editor → Run. Safe to run multiple times.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_role'
      and e.enumlabel = 'admin'
  ) then
    -- Older databases often had viewer, commenter, editor, owner only — append admin after owner.
    alter type public.app_role add value 'admin' after 'owner';
  end if;
end $$;
