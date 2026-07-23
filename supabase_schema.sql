-- WhatsPoll Supabase PostgreSQL Database Schema
-- Paste this script into your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. PROFILES Table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" 
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profiles" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own profiles" 
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- 2. POLLS Table
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    options JSONB NOT NULL, -- list of option objects {text, emoji}
    completion_time TEXT DEFAULT '1 min',
    primary_color TEXT DEFAULT '#22C55E',
    accent_color TEXT DEFAULT '#2563EB',
    card_bg TEXT DEFAULT '#F8FAFC',
    font TEXT DEFAULT 'inter',
    radius TEXT DEFAULT '16px',
    qtype TEXT DEFAULT 'single',
    results_visible BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for Polls
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to polls" 
    ON public.polls FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create polls" 
    ON public.polls FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow creator to update their own polls" 
    ON public.polls FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Allow creator to delete their own polls" 
    ON public.polls FOR DELETE USING (auth.uid() = created_by);


-- 3. VOTES Table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users ON DELETE SET NULL,
    option_text TEXT NOT NULL,
    option_emoji TEXT DEFAULT '💡',
    confidence INTEGER DEFAULT 80,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_poll_vote UNIQUE (poll_id, user_id)
);

-- Enable RLS for Votes
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to votes" 
    ON public.votes FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to vote" 
    ON public.votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow user to delete (undo) their own votes" 
    ON public.votes FOR DELETE USING (auth.uid() = user_id);


-- 4. COMMENTS Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users ON DELETE SET NULL,
    username TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to comments" 
    ON public.comments FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to post comments" 
    ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 5. BOOKMARKS Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    poll_id UUID REFERENCES public.polls ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (user_id, poll_id)
);

-- Enable RLS for Bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own bookmarks" 
    ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users to add their own bookmarks" 
    ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own bookmarks" 
    ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);


-- 6. TEAMS Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read teams" 
    ON public.teams FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create teams" 
    ON public.teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 7. TEAM MEMBERS Table
CREATE TABLE IF NOT EXISTS public.team_members (
    team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'Member',
    permissions TEXT DEFAULT 'Vote & Create',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    PRIMARY KEY (team_id, email)
);

-- Enable RLS for Team Members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view team members" 
    ON public.team_members FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow team managers to add members" 
    ON public.team_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow team managers to remove members" 
    ON public.team_members FOR DELETE USING (auth.role() = 'authenticated');


-- 8. Enable Realtime triggers for live sync
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.comments;
