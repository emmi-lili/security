-- =============================================================
-- SEVIGPRO — novedades
-- Guard incident/event reports with optional photo attachment.
-- =============================================================

-- -------------------------------------------------------------
-- novedades table
-- -------------------------------------------------------------
create table if not exists public.novedades (
  id           text primary key,
  guard_name   text not null,
  turno        text not null check (turno in ('dia', 'noche')),
  tipo         text not null check (tipo in ('incidente', 'mantenimiento', 'paquete', 'emergencia', 'acceso', 'otro')),
  descripcion  text not null,
  ubicacion       text not null default '',
  medidas_tomadas text not null default '',
  photo_url       text,
  location_name   text,
  guard_id        text not null,
  location_id  text references public.locations(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_novedades_guard    on public.novedades(guard_id);
create index if not exists idx_novedades_location on public.novedades(location_id);
create index if not exists idx_novedades_created  on public.novedades(created_at desc);

-- -------------------------------------------------------------
-- Row Level Security (same open policy as other tables)
-- -------------------------------------------------------------
alter table public.novedades enable row level security;

drop policy if exists novedades_anon_all on public.novedades;
create policy novedades_anon_all on public.novedades
  for all to anon, authenticated
  using (true)
  with check (true);

-- -------------------------------------------------------------
-- Realtime
-- -------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname   = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'novedades'
  ) then
    alter publication supabase_realtime add table public.novedades;
  end if;
end $$;

-- -------------------------------------------------------------
-- Storage bucket for novedad photos
-- Creates the bucket if it does not exist yet.
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('novedad-photos', 'novedad-photos', true)
on conflict (id) do nothing;

drop policy if exists novedad_photos_public_read  on storage.objects;
drop policy if exists novedad_photos_anon_insert  on storage.objects;

create policy novedad_photos_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'novedad-photos');

create policy novedad_photos_anon_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'novedad-photos');
