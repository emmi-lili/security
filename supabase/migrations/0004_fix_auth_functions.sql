-- =============================================================
-- SEVIGPRO — refresh auth functions
-- Re-creates verify_user and set_user_password with explicit
-- `extensions.` schema qualification for crypt/gen_salt. This is a
-- corrective migration: earlier pushes left the functions referencing
-- bare crypt()/gen_salt() which fail under the default search_path
-- on hosted Supabase (where pgcrypto lives in the `extensions` schema).
-- Also notifies PostgREST to reload its schema cache so the RPCs are
-- immediately reachable.
-- =============================================================

create or replace function public.verify_user(p_username text, p_password text)
returns table (
  id         text,
  username   text,
  role       text,
  full_name  text,
  email      text,
  phone      text,
  active     boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select u.id, u.username, u.role, u.full_name, u.email, u.phone, u.active, u.created_at
  from public.users u
  where u.username = p_username
    and u.active = true
    and u.password_hash = extensions.crypt(p_password, u.password_hash);
end;
$$;

create or replace function public.set_user_password(p_user_id text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_password is null or length(p_password) = 0 then
    raise exception 'password must not be empty';
  end if;

  update public.users
     set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
   where id = p_user_id;

  if not found then
    raise exception 'user % not found', p_user_id;
  end if;
end;
$$;

grant execute on function public.verify_user(text, text)        to anon, authenticated;
grant execute on function public.set_user_password(text, text)  to anon, authenticated;

-- Ask PostgREST to refresh its schema cache so the RPCs become visible
-- without waiting for the next periodic reload.
notify pgrst, 'reload schema';
