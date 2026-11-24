alter table public.app_settings
  add column if not exists demo_video_path text,
  add column if not exists demo_video_name text;
