-- DNA SONG AI : public song package library (Supabase / Postgres)
-- Run once in Supabase > SQL Editor. Safe to re-run.
--
-- Security model
--   * The browser NEVER writes to this table and never holds a service key.
--   * Row Level Security is ON with no policies for anon/authenticated => the table
--     cannot be read or written with the public (anon) key.
--   * The app server (api/library.js, service role key) does every write, after checking
--     the access code and sanitizing the content.
--   * Public reads can also go through the view public_song_packages, which shows only
--     rows that are public and not hidden, and never exposes owner_hash.

create extension if not exists pgcrypto;

create table if not exists public.song_packages (
  id             uuid primary key default gen_random_uuid(),
  owner_hash     text not null check (owner_hash ~ '^[0-9a-f]{64}$'),   -- sha256 of the device id, never returned to clients
  title          text not null default '' check (char_length(title) <= 80),
  style_prompt   text not null default '' check (char_length(style_prompt) <= 1000),
  exclude_styles text not null default '' check (char_length(exclude_styles) <= 1000),
  lyrics         text not null default '' check (char_length(lyrics) <= 5000),
  brief          text not null default '' check (char_length(brief) <= 600),
  tip            text not null default '' check (char_length(tip) <= 600),
  mode           text not null default 'create' check (mode in ('create','preserve','usedna','instrumental','design')),
  lang           text not null default '' check (char_length(lang) <= 40),
  is_public      boolean not null default false,
  is_hidden      boolean not null default false,                         -- moderation switch: set true in the dashboard to take a row down
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint has_content check (char_length(style_prompt) > 0 or char_length(lyrics) > 0)
);

create index if not exists song_packages_public_idx on public.song_packages (updated_at desc) where is_public and not is_hidden;
create index if not exists song_packages_owner_idx  on public.song_packages (owner_hash, updated_at desc);

create or replace function public.song_packages_touch() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists song_packages_touch on public.song_packages;
create trigger song_packages_touch before update on public.song_packages
  for each row execute function public.song_packages_touch();

alter table public.song_packages enable row level security;
revoke all on public.song_packages from anon, authenticated;

-- Read-only public window. It runs with the owner's rights on purpose (so it can read the locked table;
-- do NOT turn on FORCE ROW LEVEL SECURITY, that would hide every row from this view)
-- and exposes only safe columns of public, visible rows.
create or replace view public.public_song_packages as
  select id, title, style_prompt, exclude_styles, lyrics, brief, tip, mode, lang, updated_at
  from public.song_packages
  where is_public and not is_hidden;

grant select on public.public_song_packages to anon, authenticated;
