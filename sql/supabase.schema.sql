create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  device_id text unique,
  tg_id bigint unique,
  link_token text unique,
  points integer not null default 0
);

create table if not exists points_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  profile_id uuid not null references profiles(id) on delete cascade,
  delta integer not null,
  reason text,
  granted_by text
);

create index if not exists points_events_profile_idx on points_events(profile_id, created_at desc);