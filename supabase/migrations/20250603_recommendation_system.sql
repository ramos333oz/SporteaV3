-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Add preference_vector column to users table for storing user preferences
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preference_vector vector(384);

-- Add characteristic_vector column to matches table for storing match characteristics
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS characteristic_vector vector(384);

-- Create a new table for tracking user interactions with matches
CREATE TABLE IF NOT EXISTS public.user_interactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    interaction_type text NOT NULL CHECK (interaction_type IN ('view', 'join', 'leave', 'host', 'like', 'dislike')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    metadata jsonb,
    UNIQUE (user_id, match_id, interaction_type)
);

-- Add RLS policies for the user_interactions table
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own interactions
CREATE POLICY "Users can view their own interactions" 
    ON public.user_interactions FOR SELECT 
    USING (auth.uid() = user_id);

-- Allow users to insert their own interactions
CREATE POLICY "Users can insert their own interactions" 
    ON public.user_interactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create a new table for storing recommendation analytics
CREATE TABLE IF NOT EXISTS public.recommendation_analytics (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN ('shown', 'clicked', 'joined', 'dismissed')),
    recommendation_type text NOT NULL CHECK (recommendation_type IN ('content-based', 'collaborative', 'hybrid')),
    score float,
    explanation text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for the recommendation_analytics table
ALTER TABLE public.recommendation_analytics ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own recommendation analytics
CREATE POLICY "Users can view their own recommendation analytics" 
    ON public.recommendation_analytics FOR SELECT 
    USING (auth.uid() = user_id);

-- Allow users to insert their own recommendation analytics
CREATE POLICY "Users can insert their own recommendation analytics" 
    ON public.recommendation_analytics FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create function to find similar matches based on vector similarity
CREATE OR REPLACE FUNCTION match_similar_vector(
    query_embedding vector(384),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 10
) RETURNS TABLE (
    id uuid,
    title text,
    sport_id uuid,
    host_id uuid,
    start_time timestamp with time zone,
    similarity float
) LANGUAGE SQL STABLE AS $$
    SELECT
        matches.id,
        matches.title,
        matches.sport_id,
        matches.host_id,
        matches.start_time,
        1 - (matches.characteristic_vector <=> query_embedding) AS similarity
    FROM matches
    WHERE 1 - (matches.characteristic_vector <=> query_embedding) > match_threshold
        AND matches.status = 'active'
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- Create function to find similar users based on preference vectors
CREATE OR REPLACE FUNCTION find_similar_users(
    user_id uuid,
    similarity_threshold float DEFAULT 0.5,
    user_count int DEFAULT 10
) RETURNS TABLE (
    id uuid,
    similarity float
) LANGUAGE SQL STABLE AS $$
    WITH user_embedding AS (
        SELECT preference_vector 
        FROM users 
        WHERE id = user_id
    )
    SELECT
        users.id,
        1 - (users.preference_vector <=> user_embedding.preference_vector) AS similarity
    FROM users, user_embedding
    WHERE users.id != user_id
        AND users.preference_vector IS NOT NULL
        AND 1 - (users.preference_vector <=> user_embedding.preference_vector) > similarity_threshold
    ORDER BY similarity DESC
    LIMIT user_count;
$$;
