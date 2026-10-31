-- ==============================================================================
-- CropScan AI: Supabase Database, Authentication & Storage Setup with RLS
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Create the scans table (if it doesn't already exist)
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

-- Index for fast user scan lookups
create index if not exists idx_scans_user_id on public.scans(user_id);
create index if not exists idx_scans_created_at on public.scans(created_at desc);

-- 2. Enable Row Level Security (RLS) on public.scans
alter table public.scans enable row level security;

-- Drop legacy open policies if present
drop policy if exists "Allow all users to read scans" on public.scans;
drop policy if exists "Allow all users to insert scans" on public.scans;
drop policy if exists "Allow all users to delete scans" on public.scans;
drop policy if exists "Users can only read their own scans" on public.scans;
drop policy if exists "Users can insert their own scans" on public.scans;
drop policy if exists "Users can delete their own scans" on public.scans;
drop policy if exists "Allow scan creation" on public.scans;

-- 3. Row Level Security (RLS) Policies

-- Policy 1: SELECT (Only logged-in users can view their own scans)
create policy "Users can only read their own scans"
  on public.scans for select
  using (auth.uid()::text = user_id);

-- Policy 2: INSERT (Authenticated users can save scans under their uid, or guest scans)
create policy "Users can insert scans"
  on public.scans for insert
  with check (auth.uid()::text = user_id or user_id = 'anonymous' or auth.role() = 'anon');

-- Policy 3: UPDATE (Users can only update their own scans)
create policy "Users can update their own scans"
  on public.scans for update
  using (auth.uid()::text = user_id);

-- Policy 4: DELETE (Users can only delete their own scans)
create policy "Users can delete their own scans"
  on public.scans for delete
  using (auth.uid()::text = user_id);

-- 4. Storage Bucket Setup: 'crop-images'
insert into storage.buckets (id, name, public)
values ('crop-images', 'crop-images', true)
on conflict (id) do update set public = true;

-- Drop previous storage policies if present
drop policy if exists "Allow public viewing of crop images" on storage.objects;
drop policy if exists "Allow public uploading of crop images" on storage.objects;
drop policy if exists "Allow public deletion of crop images" on storage.objects;
drop policy if exists "Public access for crop images" on storage.objects;
drop policy if exists "Authenticated and anon upload crop images" on storage.objects;
drop policy if exists "Users can delete crop images" on storage.objects;

-- 5. Storage Policies for 'crop-images' bucket
-- Public download/view of uploaded leaf photos:
create policy "Public access for crop images"
  on storage.objects for select
  using (bucket_id = 'crop-images');

-- Upload allowed for all app users (both guest & logged-in farmers):
create policy "Authenticated and anon upload crop images"
  on storage.objects for insert
  with check (bucket_id = 'crop-images');

-- Delete allowed for app users:
create policy "Users can delete crop images"
  on storage.objects for delete
  using (bucket_id = 'crop-images');
