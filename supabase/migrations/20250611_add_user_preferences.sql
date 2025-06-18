-- Migration: Add additional user preference fields for enhanced recommendation system
-- Description: This migration adds new columns to the users table to store additional
-- preference data including available days, available hours, preferred facilities,
-- home location, gender, and play style preference.

-- Add new columns to the users table with appropriate data types
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS available_days JSONB, -- Array of days ["Monday", "Wednesday", "Friday"]
  ADD COLUMN IF NOT EXISTS available_hours JSONB, -- Object with start/end times {start: "14:00", end: "18:00"}
  ADD COLUMN IF NOT EXISTS preferred_facilities JSONB, -- Array of facility IDs [uuid1, uuid2]
  ADD COLUMN IF NOT EXISTS home_location JSONB, -- {latitude: x, longitude: y, address: "text"} 
  ADD COLUMN IF NOT EXISTS gender TEXT, -- "Male", "Female", "Other", "Prefer not to say"
  ADD COLUMN IF NOT EXISTS play_style TEXT; -- "Casual", "Competitive" 

-- Comment the new columns for better documentation
COMMENT ON COLUMN public.users.available_days IS 'Days of the week when the user is available to play (array of strings)';
COMMENT ON COLUMN public.users.available_hours IS 'Hours during the day when the user is available to play (object with start and end times)';
COMMENT ON COLUMN public.users.preferred_facilities IS 'List of facility IDs that the user prefers to play at (array of UUIDs)';
COMMENT ON COLUMN public.users.home_location IS 'User''s home location data including coordinates and address';
COMMENT ON COLUMN public.users.gender IS 'User''s gender identity';
COMMENT ON COLUMN public.users.play_style IS 'User''s play style preference (Casual or Competitive)';

-- Create embedding queue table for managing vector embedding updates
CREATE TABLE IF NOT EXISTS public.embedding_queue (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id uuid NOT NULL,
    entity_type text NOT NULL CHECK (entity_type IN ('user', 'match')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority integer NOT NULL DEFAULT 5,
    attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 3,
    error text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (entity_id, entity_type)
);

-- Add RLS policies for the embedding_queue table
ALTER TABLE public.embedding_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role to access embedding queue
CREATE POLICY "Service role can manage embedding queue" 
    ON public.embedding_queue 
    USING (true);

-- Update recommendation_analytics table to include new action types
ALTER TABLE public.recommendation_analytics
    DROP CONSTRAINT IF EXISTS recommendation_analytics_action_check;

ALTER TABLE public.recommendation_analytics
    ADD CONSTRAINT recommendation_analytics_action_check 
    CHECK (action IN ('shown', 'clicked', 'joined', 'dismissed', 'liked', 'disliked', 'ignored', 'left'));

-- Update the function that manages the preference vector to include new preferences
-- This ensures the recommendation system considers the new preferences when generating recommendations
CREATE OR REPLACE FUNCTION public.update_user_preference_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue the user for preference vector update
  -- This will be processed by the generate-user-embeddings function
  INSERT INTO public.embedding_queue (entity_id, entity_type, status, priority)
  VALUES (NEW.id, 'user', 'pending', 5)
  ON CONFLICT (entity_id, entity_type) 
  DO UPDATE SET 
    status = 'pending',
    updated_at = NOW(),
    attempts = 0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists to call the above function when user preferences are updated
DROP TRIGGER IF EXISTS user_preference_update_trigger ON public.users;
CREATE TRIGGER user_preference_update_trigger
  AFTER UPDATE OF sport_preferences, skill_levels, available_days, available_hours, 
    preferred_facilities, home_location, play_style
  ON public.users
  FOR EACH ROW
  WHEN (OLD.sport_preferences IS DISTINCT FROM NEW.sport_preferences OR
        OLD.skill_levels IS DISTINCT FROM NEW.skill_levels OR
        OLD.available_days IS DISTINCT FROM NEW.available_days OR
        OLD.available_hours IS DISTINCT FROM NEW.available_hours OR
        OLD.preferred_facilities IS DISTINCT FROM NEW.preferred_facilities OR
        OLD.home_location IS DISTINCT FROM NEW.home_location OR
        OLD.play_style IS DISTINCT FROM NEW.play_style)
  EXECUTE FUNCTION public.update_user_preference_embedding(); 