-- =============================================================
-- SEVIGPRO — soporte para eliminar guardias/usuarios
-- - location_guards ya tiene ON DELETE CASCADE (migración 0001)
-- - visitors.guard_id ya tiene ON DELETE SET NULL (migración 0001)
-- - locations.supervisor_id ya tiene ON DELETE SET NULL (migración 0001)
-- - patrol_rounds: enlazar guard_id → users y permitir SET NULL al borrar
-- =============================================================

alter table public.patrol_rounds
  alter column guard_id drop not null;

alter table public.patrol_rounds
  drop constraint if exists patrol_rounds_guard_id_fkey;

alter table public.patrol_rounds
  add constraint patrol_rounds_guard_id_fkey
  foreign key (guard_id) references public.users(id) on delete set null;
