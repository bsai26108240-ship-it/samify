-- ==========================================================
-- SAMIFY SUPABASE DATABASE SCHEMA
-- Execute this entire query in the Supabase SQL Editor
-- ==========================================================

-- 1. Profiles Table (Linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone." 
  on public.profiles for select using (true);

create policy "Users can insert their own profile." 
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile." 
  on public.profiles for update using (auth.uid() = id);

-- Trigger to create public profile on user signup automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Attach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Playlists Table
create table if not exists public.playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text default '',
  cover_url text default 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Playlists
alter table public.playlists enable row level security;

create policy "Users can view their own playlists"
  on public.playlists for select
  using (auth.uid() = user_id);

create policy "Users can insert their own playlists"
  on public.playlists for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own playlists"
  on public.playlists for update
  using (auth.uid() = user_id);

create policy "Users can delete their own playlists"
  on public.playlists for delete
  using (auth.uid() = user_id);


-- 3. Playlist Tracks Table (Junction)
create table if not exists public.playlist_tracks (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references public.playlists(id) on delete cascade not null,
  track_id text not null,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(playlist_id, track_id)
);

-- Enable RLS for Playlist Tracks
alter table public.playlist_tracks enable row level security;

create policy "Users can view tracks in their playlists"
  on public.playlist_tracks for select
  using (
    exists (
      select 1 from public.playlists
      where public.playlists.id = public.playlist_tracks.playlist_id
      and public.playlists.user_id = auth.uid()
    )
  );

create policy "Users can add tracks to their playlists"
  on public.playlist_tracks for insert
  with check (
    exists (
      select 1 from public.playlists
      where public.playlists.id = public.playlist_tracks.playlist_id
      and public.playlists.user_id = auth.uid()
    )
  );

create policy "Users can delete tracks from their playlists"
  on public.playlist_tracks for delete
  using (
    exists (
      select 1 from public.playlists
      where public.playlists.id = public.playlist_tracks.playlist_id
      and public.playlists.user_id = auth.uid()
    )
  );


-- 4. Liked Songs Table
create table if not exists public.liked_songs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  track_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, track_id)
);

-- Enable RLS for Liked Songs
alter table public.liked_songs enable row level security;

create policy "Users can view their liked songs"
  on public.liked_songs for select
  using (auth.uid() = user_id);

create policy "Users can like a song"
  on public.liked_songs for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike a song"
  on public.liked_songs for delete
  using (auth.uid() = user_id);

