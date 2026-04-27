-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Lets a signed-in user unlink one of their own auth.identities rows
-- (e.g. disconnect Google after switching their account email).
-- Refuses to remove the only remaining sign-in path, so the user
-- cannot lock themselves out — but treats a set password as a valid
-- fallback even if no email-identity row exists in auth.identities.

create or replace function public.unlink_user_identity(p_provider text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_total int;
  v_has_password boolean;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select count(*) into v_total from auth.identities where user_id = v_user_id;

  select (encrypted_password is not null and encrypted_password <> '')
    into v_has_password
    from auth.users where id = v_user_id;

  if v_total <= 1 and not coalesce(v_has_password, false) then
    raise exception 'cannot_unlink_last_method';
  end if;

  delete from auth.identities
   where user_id = v_user_id
     and provider = p_provider;
end;
$$;

revoke all on function public.unlink_user_identity(text) from public;
grant execute on function public.unlink_user_identity(text) to authenticated;


-- Removes any OAuth identity whose stored email no longer matches the user's
-- current account email. Returns the number of identities removed.
-- Only deletes if the user will still have a way to sign in afterwards
-- (another identity, or a password set on auth.users).

create or replace function public.cleanup_stale_oauth_identities()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_has_password boolean;
  v_total int;
  v_removed int := 0;
  ident record;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select lower(email), (encrypted_password is not null and encrypted_password <> '')
    into v_email, v_has_password
    from auth.users where id = v_user_id;

  if v_email is null then
    return 0;
  end if;

  for ident in
    select provider, lower(coalesce(identity_data->>'email', '')) as id_email
      from auth.identities
     where user_id = v_user_id
       and provider <> 'email'
  loop
    if ident.id_email <> v_email then
      select count(*) into v_total from auth.identities where user_id = v_user_id;
      if v_total > 1 or coalesce(v_has_password, false) then
        delete from auth.identities
         where user_id = v_user_id and provider = ident.provider;
        v_removed := v_removed + 1;
      end if;
    end if;
  end loop;

  return v_removed;
end;
$$;

revoke all on function public.cleanup_stale_oauth_identities() from public;
grant execute on function public.cleanup_stale_oauth_identities() to authenticated;
