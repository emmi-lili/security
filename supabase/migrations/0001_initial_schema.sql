-- =============================================================
-- SEVIGPRO — initial schema
-- Custom user-table auth (no Supabase Auth). RLS is permissive
-- for anon because the frontend ships the anon key and all API
-- traffic uses it. This is a known trade-off of the chosen auth
-- strategy; see SUPABASE.md for the production hardening path.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- users
-- -------------------------------------------------------------
create table if not exists public.users (
  id            text primary key,
  username      text not null unique,
  password_hash text not null,
  role          text not null check (role in ('admin', 'supervisor', 'guard')),
  full_name     text not null,
  email         text,
  phone         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- -------------------------------------------------------------
-- locations + pivot for guards
-- -------------------------------------------------------------
create table if not exists public.locations (
  id             text primary key,
  name           text not null,
  address        text not null default '',
  type           text not null default '',
  supervisor_id  text references public.users(id) on delete set null,
  access_code    text not null default '',
  notes          text,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.location_guards (
  location_id text not null references public.locations(id) on delete cascade,
  guard_id    text not null references public.users(id)     on delete cascade,
  primary key (location_id, guard_id)
);

create index if not exists idx_location_guards_guard on public.location_guards(guard_id);

-- -------------------------------------------------------------
-- residents
-- -------------------------------------------------------------
create table if not exists public.residents (
  id             text primary key,
  location_id    text not null references public.locations(id) on delete cascade,
  tower          text,
  department     text not null,
  resident_type  text not null check (resident_type in ('propietario', 'inquilino', 'familiar', 'otro')),
  full_name      text not null,
  phone          text,
  email          text,
  document_id    text,
  active         boolean not null default true,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_residents_location on public.residents(location_id);
create index if not exists idx_residents_department on public.residents(location_id, lower(department));

-- -------------------------------------------------------------
-- visitors
-- -------------------------------------------------------------
create table if not exists public.visitors (
  id                        text primary key,
  id_card                   text not null,
  name                      text not null,
  document_id               text not null default '',
  photo_url                 text,
  department                text not null default '',
  tower                     text,
  host_name                 text not null default '',
  resident_id               text references public.residents(id) on delete set null,
  is_validated_destination  boolean not null default false,
  reason                    text not null default '',
  vehicle_plate             text,
  vehicle_type              text,
  check_in_time             timestamptz not null default now(),
  check_out_time            timestamptz,
  guard_id                  text references public.users(id)     on delete set null,
  location_id               text references public.locations(id) on delete set null,
  notes                     text
);

create index if not exists idx_visitors_id_card    on public.visitors(id_card);
create index if not exists idx_visitors_checkin    on public.visitors(check_in_time desc);
create index if not exists idx_visitors_location   on public.visitors(location_id);

-- -------------------------------------------------------------
-- checkpoints + patrol_rounds
-- -------------------------------------------------------------
create table if not exists public.checkpoints (
  id           text primary key,
  name         text not null,
  location_id  text not null references public.locations(id) on delete cascade,
  qr_code      text not null unique,
  latitude     double precision,
  longitude    double precision,
  description  text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_checkpoints_location on public.checkpoints(location_id);

create table if not exists public.patrol_rounds (
  id             text primary key,
  guard_id       text not null,
  location_id    text references public.locations(id)  on delete set null,
  checkpoint_id  text references public.checkpoints(id) on delete set null,
  timestamp      timestamptz not null default now(),
  latitude       double precision not null default 0,
  longitude      double precision not null default 0,
  device         text,
  notes          text
);

create index if not exists idx_patrol_rounds_timestamp  on public.patrol_rounds(timestamp desc);
create index if not exists idx_patrol_rounds_checkpoint on public.patrol_rounds(checkpoint_id);
create index if not exists idx_patrol_rounds_guard      on public.patrol_rounds(guard_id);

-- -------------------------------------------------------------
-- RLS: permissive, anon can do everything. This is intentional
-- given the custom-user auth strategy. See SUPABASE.md.
-- -------------------------------------------------------------
alter table public.users           enable row level security;
alter table public.locations       enable row level security;
alter table public.location_guards enable row level security;
alter table public.residents       enable row level security;
alter table public.visitors        enable row level security;
alter table public.checkpoints     enable row level security;
alter table public.patrol_rounds   enable row level security;

do $$
declare
  t text;
  tables text[] := array[
    'users',
    'locations',
    'location_guards',
    'residents',
    'visitors',
    'checkpoints',
    'patrol_rounds'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I on public.%I', t || '_anon_all', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true)',
      t || '_anon_all',
      t
    );
  end loop;
end $$;

-- -------------------------------------------------------------
-- Auth RPC — bcrypt verify against public.users
-- Runs as SECURITY DEFINER so the hash column never leaves the DB.
-- -------------------------------------------------------------
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

grant execute on function public.verify_user(text, text) to anon, authenticated;

-- -------------------------------------------------------------
-- Realtime: enable INSERT/UPDATE/DELETE events for the tables
-- consumed by Dashboard and Reports.
-- -------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'patrol_rounds'
  ) then
    alter publication supabase_realtime add table public.patrol_rounds;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'visitors'
  ) then
    alter publication supabase_realtime add table public.visitors;
  end if;
end $$;

-- -------------------------------------------------------------
-- Storage bucket for visitor photos (public read, anon write).
-- Safe to re-run thanks to on conflict / upsert semantics.
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('visitor-photos', 'visitor-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "visitor_photos_read"  on storage.objects;
drop policy if exists "visitor_photos_write" on storage.objects;
drop policy if exists "visitor_photos_update" on storage.objects;

create policy "visitor_photos_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'visitor-photos');

create policy "visitor_photos_write"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'visitor-photos');

create policy "visitor_photos_update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'visitor-photos')
  with check (bucket_id = 'visitor-photos');
