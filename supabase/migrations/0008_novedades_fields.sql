-- =============================================================
-- SEVIGPRO — novedades: add ubicacion, medidas_tomadas, location_name
-- =============================================================

alter table public.novedades
  add column if not exists ubicacion      text not null default '',
  add column if not exists medidas_tomadas text not null default '',
  add column if not exists location_name   text;
