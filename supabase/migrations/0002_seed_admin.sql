-- =============================================================
-- SEVIGPRO — initial admin seed
-- Without this the users table is empty and nobody can log in.
-- Idempotent: safe to re-run.
-- =============================================================

insert into public.users (id, username, password_hash, role, full_name, email, active)
values (
  'user-admin-seed',
  'admin',
  extensions.crypt('admin123', extensions.gen_salt('bf')),
  'admin',
  'Administrador',
  'admin@sevigpro.local',
  true
)
on conflict (username) do nothing;
