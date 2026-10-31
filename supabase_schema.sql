-- CropScan AI: Supabase Database & Storage Setup
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create the scans table
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id text default 'anonymous',
  crop text not null,
  problem_name text not null,
  problem_type text not null,
  confidence integer not null default 0,
  result_json jsonb not null default '{}'::jsonb,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.scans enable row level security;

-- 3. RLS Policies: Allow public read, insert, and delete for app users
create policy "Allow all users to read scans"
  on public.scans for select
  using (true);

create policy "Allow all users to insert scans"
  on public.scans for insert
  with check (true);

create policy "Allow all users to delete scans"
  on public.scans for delete
  using (true);

-- 4. Create the 'crop-images' storage bucket if it doesn't already exist
insert into storage.buckets (id, name, public)
values ('crop-images', 'crop-images', true)
on conflict (id) do update set public = true;

-- 5. Storage Policies: Allow public download, upload, and deletion of crop photos
create policy "Allow public viewing of crop images"
  on storage.objects for select
  using (bucket_id = 'crop-images');

create policy "Allow public uploading of crop images"
  on storage.objects for insert
  with check (bucket_id = 'crop-images');

create policy "Allow public deletion of crop images"
  on storage.objects for delete
  using (bucket_id = 'crop-images');

