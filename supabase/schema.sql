-- ==========================================================
-- SAMIFY SUPABASE SCHEMA: Cross-Device Realtime Sync
-- ==========================================================

-- 1. User Likes (Tracks liked by user, with metadata for instant cross-device hydration)
create table if not exists public.user_likes (
  user_id uuid references auth.users(id) on delete cascade not null,
  track_id text not null,
  track_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now() not null,
  primary key (user_id, track_id)
);

-- Enable RLS for user_likes
alter table public.user_likes enable row level security;

-- Policies for user_likes: users only read, insert, delete their own records
drop policy if exists "Users can read own liked songs" on public.user_likes;
create policy "Users can read own liked songs"
  on public.user_likes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own liked songs" on public.user_likes;
create policy "Users can insert own liked songs"
  on public.user_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own liked songs" on public.user_likes;
create policy "Users can update own liked songs"
  on public.user_likes for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own liked songs" on public.user_likes;
create policy "Users can delete own liked songs"
  on public.user_likes for delete
  using (auth.uid() = user_id);


-- 2. User Playlists (Custom playlists stored with tracks jsonb array)
create table if not exists public.user_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  tracks jsonb default '[]'::jsonb not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS for user_playlists
alter table public.user_playlists enable row level security;

-- Policies for user_playlists: users only read, insert, update, delete their own records
drop policy if exists "Users can read own playlists" on public.user_playlists;
create policy "Users can read own playlists"
  on public.user_playlists for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own playlists" on public.user_playlists;
create policy "Users can insert own playlists"
  on public.user_playlists for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own playlists" on public.user_playlists;
create policy "Users can update own playlists"
  on public.user_playlists for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own playlists" on public.user_playlists;
create policy "Users can delete own playlists"
  on public.user_playlists for delete
  using (auth.uid() = user_id);

-- 3. Enable Realtime Replication for these tables
alter publication supabase_realtime add table public.user_likes;
alter publication supabase_realtime add table public.user_playlists;
