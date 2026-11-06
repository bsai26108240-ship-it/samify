-- ==========================================================
-- SAMIFY MASTER SUPABASE MIGRATION SCRIPT
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/brigerbdlrbqbbpymjsf/sql
-- ==========================================================

-- 1. Create Liked Songs Table
CREATE TABLE IF NOT EXISTS public.user_likes (
    user_id UUID NOT NULL,
    track_id TEXT NOT NULL,
    track_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, track_id)
);

-- 2. Create Playlists Table
CREATE TABLE IF NOT EXISTS public.user_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    tracks JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Profiles Table (For Friend Activity & Sync)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    username TEXT,
    avatar_url TEXT,
    current_track JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Follows & Chat Tables
CREATE TABLE IF NOT EXISTS public.user_follows (
    follower_id UUID,
    following_id UUID,
    PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.friend_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Realtime Replication for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_playlists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_messages;

-- 6. Disable RLS locks for instant access
ALTER TABLE public.user_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_playlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_messages DISABLE ROW LEVEL SECURITY;
