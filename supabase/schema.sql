-- Run this entire file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default 'udhaar-desk',
  app_name text not null default 'Udhaar Desk',
  tagline text not null default 'Your simple, smarter udhaar manager',
  description text not null default 'Manage customer credit, payments and outstanding balances in one place.',
  version text not null default '1.0.0',
  file_size text not null default 'To be updated',
  android_requirement text not null default 'Android 7.0 or later',
  icon_path text,
  download_path text,
  download_file_name text,
  demo_video_path text,
  demo_video_name text,
  features jsonb not null default '["Customer ledger","Credit & payment entries","Overdue tracking","WhatsApp reminders","UPI links & QR","Store reports"]'::jsonb,
  screenshots jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_name text not null check (char_length(reviewer_name) between 2 and 50),
  rating int not null check (rating between 1 and 5),
  review_text text not null check (char_length(review_text) between 5 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.download_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_agent text,
  ip_hash text
);

create index if not exists reviews_status_created_idx
  on public.reviews(status, created_at desc);
create index if not exists download_events_created_idx
  on public.download_events(created_at desc);

insert into public.app_settings (slug)
values ('udhaar-desk')
on conflict (slug) do nothing;

-- The backend uses the Supabase service-role key and performs all writes.
-- Do not expose that key to the browser. RLS is enabled as a defense-in-depth
-- measure; no anon policies are created because all app data access goes
-- through the Express API.
alter table public.app_settings enable row level security;
alter table public.reviews enable row level security;
alter table public.download_events enable row level security;

-- The Express backend authenticates with the Supabase service-role/secret key.
-- These grants are required for direct PostgreSQL operations through Supabase.
grant usage on schema public to service_role;
grant all privileges on table public.app_settings to service_role;
grant all privileges on table public.reviews to service_role;
grant all privileges on table public.download_events to service_role;
