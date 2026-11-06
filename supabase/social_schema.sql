-- ==========================================================
-- SAMIFY SOCIAL SCHEMA: Friend Activity, Following & Presence
-- ==========================================================

-- 1. User Profiles & Live Listening Presence
create table if not exists public.user_profiles (
  id uuid primary key,
  username text not null,
  avatar_url text,
  current_track jsonb,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS for user_profiles
alter table public.user_profiles enable row level security;

-- Policies for user_profiles: everyone can read profiles/presence, only owner can upsert/update
drop policy if exists "Profiles are viewable by everyone" on public.user_profiles;
create policy "Profiles are viewable by everyone"
  on public.user_profiles for select
  using (true);

drop policy if exists "Users can upsert own profile" on public.user_profiles;
create policy "Users can upsert own profile"
  on public.user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- 2. User Follows (Friendship graph)
create table if not exists public.user_follows (
  follower_id uuid not null,
  following_id uuid not null,
  created_at timestamp with time zone default now() not null,
  primary key (follower_id, following_id)
);

-- Enable RLS for user_follows
alter table public.user_follows enable row level security;

-- Policies for user_follows
drop policy if exists "Anyone can read follows" on public.user_follows;
create policy "Anyone can read follows"
  on public.user_follows for select
  using (true);

drop policy if exists "Users can manage their follows" on public.user_follows;
create policy "Users can manage their follows"
  on public.user_follows for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);


-- 3. Friend Messages (Direct Chat between friends)
create table if not exists public.friend_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  receiver_id uuid not null,
  message text not null,
  created_at timestamp with time zone default now() not null
);

-- Enable RLS for friend_messages
alter table public.friend_messages enable row level security;

-- Policies for friend_messages: Users can only read messages sent by or to them
drop policy if exists "Users can read their own conversations" on public.friend_messages;
create policy "Users can read their own conversations"
  on public.friend_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can send messages" on public.friend_messages;
create policy "Users can send messages"
  on public.friend_messages for insert
  with check (auth.uid() = sender_id);


-- 4. Enable Supabase Realtime Replication
alter publication supabase_realtime add table public.user_profiles;
alter publication supabase_realtime add table public.user_follows;
alter publication supabase_realtime add table public.friend_messages;

