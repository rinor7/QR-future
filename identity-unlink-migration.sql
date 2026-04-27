-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Lets a signed-in user unlink one of their own auth.identities rows
-- (e.g. disconnect Google after switching their account email).
-- Refuses to remove the only remaining sign-in method, so the user
-- cannot lock themselves out.

create or replace function public.unlink_user_identity(p_provider text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_total int;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select count(*) into v_total from auth.identities where user_id = v_user_id;
  if v_total <= 1 then
    raise exception 'cannot_unlink_last_method';
  end if;

  delete from auth.identities
   where user_id = v_user_id
     and provider = p_provider;
end;
$$;

revoke all on function public.unlink_user_identity(text) from public;
grant execute on function public.unlink_user_identity(text) to authenticated;
