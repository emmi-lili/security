-- =============================================================
-- SEVIGPRO — patrol_routes
-- Adds a named patrol circuit entity.
-- Checkpoints now belong to a PatrolRoute (not directly to a
-- Location). Existing checkpoints are migrated automatically to
-- a "Ronda General" route per location so no QR codes break.
-- =============================================================

-- -------------------------------------------------------------
-- patrol_routes
-- -------------------------------------------------------------
create table if not exists public.patrol_routes (
  id           text primary key,
  name         text not null,
  location_id  text not null references public.locations(id) on delete cascade,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_patrol_routes_location on public.patrol_routes(location_id);

alter table public.patrol_routes enable row level security;
drop policy if exists patrol_routes_anon_all on public.patrol_routes;
create policy patrol_routes_anon_all on public.patrol_routes
  for all to anon, authenticated using (true) with check (true);

-- -------------------------------------------------------------
-- Add patrol_route_id to checkpoints (nullable for backward compat)
-- -------------------------------------------------------------
alter table public.checkpoints
  add column if not exists patrol_route_id text
    references public.patrol_routes(id) on delete set null;

create index if not exists idx_checkpoints_route on public.checkpoints(patrol_route_id);

-- -------------------------------------------------------------
-- Auto-migrate existing checkpoints:
-- For each distinct location_id in checkpoints, create a default
-- "Ronda General" patrol_route and link orphan checkpoints to it.
-- The route id is deterministic: 'pr-legacy-<location_id>'
-- -------------------------------------------------------------
insert into public.patrol_routes (id, name, location_id, active, created_at)
select
  'pr-legacy-' || location_id,
  'Ronda General',
  location_id,
  true,
  now()
from (select distinct location_id from public.checkpoints where patrol_route_id is null) sub
on conflict (id) do nothing;

update public.checkpoints
set patrol_route_id = 'pr-legacy-' || location_id
where patrol_route_id is null;

-- -------------------------------------------------------------
-- Realtime for patrol_routes
-- -------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'patrol_routes'
  ) then
    alter publication supabase_realtime add table public.patrol_routes;
  end if;
end $$;
