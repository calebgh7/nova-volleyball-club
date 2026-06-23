-- ============================================================================
-- Nova Volleyball Club — Auto-create profiles on signup
-- Target: Supabase (PostgreSQL). Safe to run anytime; idempotent.
--
-- When a new user signs up via Supabase Auth, this creates their matching row
-- in public.profiles with the default role 'parent'. Director/admin/coach
-- roles are then granted manually (least-privilege by default).
--
-- This file also BACKFILLS profiles for any existing auth users that don't
-- have one yet (e.g. accounts created before this trigger existed).
-- ============================================================================

-- 1) Function: insert a profile for each new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'parent',
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) Trigger: run it after each new auth user is created.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Backfill: create profiles for existing users who don't have one.
insert into public.profiles (id, role, full_name)
select u.id, 'parent', coalesce(u.raw_user_meta_data->>'full_name', '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 4) Promote the director account. EDIT the email to match your login.
update public.profiles
set role = 'director'
where id = (select id from auth.users where email = 'caleb@aznova.org');
