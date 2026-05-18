-- =============================================================
-- SEVIGPRO — password management RPC + demo seeds
-- Idempotent.
-- =============================================================

-- -------------------------------------------------------------
-- set_user_password
-- Hashes the plaintext with bcrypt and writes it to users.password_hash.
-- SECURITY DEFINER so anon callers don't need direct UPDATE rights on
-- users.password_hash (we want that column unreadable from PostgREST).
-- -------------------------------------------------------------
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

grant execute on function public.set_user_password(text, text) to anon, authenticated;

-- -------------------------------------------------------------
-- Demo seeds (idempotent on username)
-- Passwords match what Login.tsx hints and what storage.ts seeds locally.
-- -------------------------------------------------------------
insert into public.users (id, username, password_hash, role, full_name, email, active)
values
  ('user-supervisor1', 'supervisor1', extensions.crypt('super123', extensions.gen_salt('bf')),
   'supervisor', 'Supervisor 1', 'supervisor1@sevigpro.local', true),
  ('user-guard001',    'guard001',    extensions.crypt('guard123', extensions.gen_salt('bf')),
   'guard',      'Guardia 001',   null, true),
  ('user-guard002',    'guard002',    extensions.crypt('guard123', extensions.gen_salt('bf')),
   'guard',      'Guardia 002',   null, true)
on conflict (username) do nothing;
