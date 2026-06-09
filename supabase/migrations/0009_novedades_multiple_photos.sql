-- =============================================================
-- SEVIGPRO — novedades: support multiple photo attachments
-- =============================================================

alter table public.novedades
  add column if not exists photo_urls text[] not null default '{}';

-- Migrate existing single photo into the array column
update public.novedades
  set photo_urls = array[photo_url]
  where photo_url is not null
    and photo_url <> ''
    and (photo_urls is null or photo_urls = '{}');

alter table public.novedades
  drop column if exists photo_url;
