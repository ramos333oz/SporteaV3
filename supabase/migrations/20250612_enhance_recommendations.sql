-- Migration: Enhance recommendation system with sport preferences and improved matching
-- Description: This migration adds sport preferences to the vector calculation and improves the matching algorithm

-- Update the match_similar_vector function to consider sport preferences
CREATE OR REPLACE FUNCTION match_similar_vector(
    query_embedding vector(384),
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 10,
    user_id uuid DEFAULT NULL
) RETURNS TABLE (
    id uuid,
    title text,
    sport_id uuid,
    host_id uuid,
    start_time timestamp with time zone,
    similarity float,
    sport_preference_match float
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    user_sport_preferences jsonb;
BEGIN
    -- Set search path to include extensions schema where pgvector operators are defined
    SET search_path TO public, extensions;
    
    -- Get user sport preferences if user_id is provided
    IF user_id IS NOT NULL THEN
        SELECT sport_preferences INTO user_sport_preferences 
        FROM users 
        WHERE id = user_id;
    END IF;

    RETURN QUERY
    SELECT
        matches.id,
        matches.title,
        matches.sport_id,
        matches.host_id,
        matches.start_time,
        1 - (matches.characteristic_vector <=> query_embedding) AS similarity,
        CASE
            WHEN user_id IS NULL OR user_sport_preferences IS NULL THEN 0.5 -- Neutral if no preferences
            WHEN user_sport_preferences->>(matches.sport_id::text) = 'true' THEN 1.0 -- Direct match
            ELSE 0.0 -- No match
        END AS sport_preference_match
    FROM matches
    WHERE 1 - (matches.characteristic_vector <=> query_embedding) > match_threshold
        AND matches.status = 'active'
        AND matches.start_time > NOW() -- Only future matches
    ORDER BY 
        -- Combined score with higher weight for sport preference
        (1 - (matches.characteristic_vector <=> query_embedding)) * 0.6 + 
        CASE
            WHEN user_id IS NULL OR user_sport_preferences IS NULL THEN 0.5 -- Neutral if no preferences
            WHEN user_sport_preferences->>(matches.sport_id::text) = 'true' THEN 1.0 -- Direct match
            ELSE 0.0 -- No match
        END * 0.4
        DESC
    LIMIT match_count;
END;
$$;

-- Create a function to find matches based on availability
CREATE OR REPLACE FUNCTION find_matches_by_availability(
    user_id uuid,
    match_count int DEFAULT 10
) RETURNS TABLE (
    id uuid,
    title text,
    sport_id uuid,
    start_time timestamp with time zone,
    availability_score float
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    user_available_days jsonb;
    user_available_hours jsonb;
BEGIN
    -- Get user availability
    SELECT available_days, available_hours INTO user_available_days, user_available_hours
    FROM users
    WHERE id = user_id;
    
    -- Return matches that match user availability
    RETURN QUERY
    SELECT
        m.id,
        m.title,
        m.sport_id,
        m.start_time,
        CASE
            WHEN user_available_days IS NULL THEN 0.5 -- Neutral if no preferences
            WHEN user_available_days @> jsonb_build_array(LOWER(TO_CHAR(m.start_time, 'day'))) THEN 1.0 -- Direct day match
            ELSE 0.0 -- No day match
        END AS availability_score
    FROM matches m
    WHERE m.status = 'active'
        AND m.start_time > NOW() -- Only future matches
    ORDER BY availability_score DESC, m.start_time ASC
    LIMIT match_count;
END;
$$;

-- Create a function to calculate location proximity
CREATE OR REPLACE FUNCTION calculate_location_proximity(
    lat1 float,
    lon1 float,
    lat2 float,
    lon2 float
) RETURNS float AS $$
DECLARE
    x float := 69.1 * (lat2 - lat1);
    y float := 69.1 * (lon2 - lon1) * COS(lat1 / 57.3);
    distance float;
BEGIN
    -- Calculate distance in miles using the Haversine formula approximation
    distance := SQRT(x * x + y * y);
    
    -- Convert distance to a proximity score (0-1)
    -- Closer locations get higher scores
    -- This assumes most locations are within 10 miles
    RETURN GREATEST(0, 1 - (distance / 10));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a recommendation analytics view for insights
CREATE OR REPLACE VIEW recommendation_analytics_summary AS
SELECT
    user_id,
    recommendation_type,
    action,
    COUNT(*) as action_count,
    AVG(score) as avg_score,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
FROM recommendation_analytics
GROUP BY user_id, recommendation_type, action
ORDER BY user_id, recommendation_type, action;

-- Add index on preference_vector for faster similarity searches
CREATE INDEX IF NOT EXISTS users_preference_vector_idx ON users USING ivfflat (preference_vector vector_l2_ops)
WITH (lists = 100);

-- Add index on characteristic_vector for faster similarity searches
CREATE INDEX IF NOT EXISTS matches_characteristic_vector_idx ON matches USING ivfflat (characteristic_vector vector_l2_ops)
WITH (lists = 100);

-- Migration to enhance recommendation system with additional user preferences
-- This adds new columns to the users table for more granular recommendation filtering

-- Add age range preference column
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS age_range_preference VARCHAR(10) DEFAULT NULL;

-- Add participant count preference column
-- Values can be: 'small', 'medium', 'large'
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS participant_count_preference VARCHAR(10) DEFAULT NULL;

-- Add duration preference column
-- Values can be: 'short', 'medium', 'long'
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS duration_preference VARCHAR(10) DEFAULT NULL;

-- Add age_range column to matches table for filtering
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS age_range VARCHAR(10) DEFAULT NULL;

-- Add comments to explain the new columns
COMMENT ON COLUMN public.users.age_range_preference IS 'User''s preferred age range for matches, format: "18-25", "26-35", etc.';
COMMENT ON COLUMN public.users.participant_count_preference IS 'User''s preferred group size: small (2-6), medium (7-12), or large (13+)';
COMMENT ON COLUMN public.users.duration_preference IS 'User''s preferred match duration: short (15-45min), medium (46-90min), or long (91-180min)';
COMMENT ON COLUMN public.matches.age_range IS 'Target age range for this match, format: "18-25", "26-35", etc.';

-- Update the match_similar_vector function to consider the new preferences
CREATE OR REPLACE FUNCTION public.match_similar_vector(
  query_embedding vector,
  match_threshold float,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  id uuid,
  similarity float,
  sport_preference_match float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Get user's sport preferences
  DECLARE
    user_sport_prefs jsonb;
  BEGIN
    SELECT sport_preferences INTO user_sport_prefs FROM users WHERE id = user_id;
    
    RETURN QUERY
    SELECT
      m.id,
      1 - (m.preference_vector <=> query_embedding) AS similarity,
      CASE
        WHEN user_sport_prefs IS NULL THEN 0.5
        WHEN user_sport_prefs->>(m.sport_id::text) = 'true' THEN 1.0
        ELSE 0.0
      END AS sport_preference_match
    FROM
      matches m
    WHERE
      m.preference_vector IS NOT NULL
      AND m.status = 'active'
      AND m.start_time > NOW()
      AND 1 - (m.preference_vector <=> query_embedding) > match_threshold
      -- Don't include matches the user is already part of
      AND NOT EXISTS (
        SELECT 1 FROM participants p 
        WHERE p.match_id = m.id AND p.user_id = match_similar_vector.user_id
      )
    ORDER BY
      similarity DESC,
      sport_preference_match DESC
    LIMIT match_count;
  END;
END;
$$;

-- Create a new function to filter recommendations by explicit criteria
CREATE OR REPLACE FUNCTION public.filter_matches_by_criteria(
  user_id uuid,
  age_range varchar DEFAULT NULL,
  participant_count varchar DEFAULT NULL,
  duration varchar DEFAULT NULL,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  sport_id uuid,
  score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Define participant count ranges
  DECLARE
    min_participants int := 0;
    max_participants int := 100;
    min_duration int := 0;
    max_duration int := 240;
  BEGIN
    -- Set participant count range based on preference
    IF participant_count = 'small' THEN
      min_participants := 2;
      max_participants := 6;
    ELSIF participant_count = 'medium' THEN
      min_participants := 7;
      max_participants := 12;
    ELSIF participant_count = 'large' THEN
      min_participants := 13;
      max_participants := 100;
    END IF;
    
    -- Set duration range based on preference
    IF duration = 'short' THEN
      min_duration := 15;
      max_duration := 45;
    ELSIF duration = 'medium' THEN
      min_duration := 46;
      max_duration := 90;
    ELSIF duration = 'long' THEN
      min_duration := 91;
      max_duration := 180;
    END IF;

    RETURN QUERY
    SELECT
      m.id,
      m.title,
      m.sport_id,
      -- Calculate a basic score based on how well criteria match
      (CASE WHEN age_range IS NULL OR m.age_range = age_range THEN 1.0 ELSE 0.5 END +
       CASE WHEN participant_count IS NULL OR (m.max_participants BETWEEN min_participants AND max_participants) THEN 1.0 ELSE 0.5 END +
       CASE WHEN duration IS NULL OR (m.duration_minutes BETWEEN min_duration AND max_duration) THEN 1.0 ELSE 0.5 END) / 3.0 AS score
    FROM
      matches m
    WHERE
      m.status = 'active'
      AND m.start_time > NOW()
      -- Apply age range filter if specified
      AND (age_range IS NULL OR m.age_range = age_range)
      -- Apply participant count filter if specified
      AND (participant_count IS NULL OR (m.max_participants BETWEEN min_participants AND max_participants))
      -- Apply duration filter if specified
      AND (duration IS NULL OR (m.duration_minutes BETWEEN min_duration AND max_duration))
      -- Don't include matches the user is already part of
      AND NOT EXISTS (
        SELECT 1 FROM participants p 
        WHERE p.match_id = m.id AND p.user_id = filter_matches_by_criteria.user_id
      )
    ORDER BY
      score DESC,
      m.created_at DESC
    LIMIT limit_count;
  END;
END;
$$;
 