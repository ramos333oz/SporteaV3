-- Migration for the new recommendation system
-- This migration adds new venues, updates user_preferences, and creates new tables for the recommendation system

-- Add new futsal venues
INSERT INTO venues (name, description, type, location, price_per_hour, image_url, created_at, updated_at)
VALUES 
  ('COURT PERINDU 1', 'Futsal court at Perindu area', 'futsal', '{"lat": 3.1390, "lng": 101.6869}', 120.00, 'https://example.com/venues/court-perindu-1.jpg', NOW(), NOW()),
  ('COURT PERINDU 2', 'Futsal court at Perindu area', 'futsal', '{"lat": 3.1390, "lng": 101.6869}', 120.00, 'https://example.com/venues/court-perindu-2.jpg', NOW(), NOW()),
  ('COURT PERINDU 3', 'Futsal court at Perindu area', 'futsal', '{"lat": 3.1390, "lng": 101.6869}', 120.00, 'https://example.com/venues/court-perindu-3.jpg', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Update user_preferences table to add new fields for direct matching
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS preferred_venues TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_days TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_times TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_group_size INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS preferred_skill_level TEXT DEFAULT 'intermediate',
ADD COLUMN IF NOT EXISTS preferred_match_frequency TEXT DEFAULT 'weekly';

-- Create match_history table to track matches for users
CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL,
  venue_id UUID REFERENCES venues(id),
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sport_type TEXT NOT NULL,
  group_size INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_match_id ON match_history(match_id);

-- Create user_engagement table to track engagement metrics
CREATE TABLE IF NOT EXISTS user_engagement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_login TIMESTAMP WITH TIME ZONE,
  session_count INT DEFAULT 0,
  total_matches_joined INT DEFAULT 0,
  total_matches_created INT DEFAULT 0,
  total_messages_sent INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement(user_id);

-- Create match_ratings table to store user ratings for matches
CREATE TABLE IF NOT EXISTS match_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id and match_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_match_ratings_user_id ON match_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_match_ratings_match_id ON match_ratings(match_id);

-- Create user_similarity table to store pre-calculated similarity scores
CREATE TABLE IF NOT EXISTS user_similarity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  similar_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_similarity UNIQUE (user_id, similar_user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_similarity_user_id ON user_similarity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_similarity_similar_user_id ON user_similarity(similar_user_id);
CREATE INDEX IF NOT EXISTS idx_user_similarity_score ON user_similarity(similarity_score);

-- Create user_activity_metrics table to store aggregated user activity data
CREATE TABLE IF NOT EXISTS user_activity_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_level FLOAT DEFAULT 0 CHECK (activity_level BETWEEN 0 AND 1),
  response_rate FLOAT DEFAULT 0 CHECK (response_rate BETWEEN 0 AND 1),
  attendance_rate FLOAT DEFAULT 0 CHECK (attendance_rate BETWEEN 0 AND 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_metrics_user_id ON user_activity_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_metrics_activity_level ON user_activity_metrics(activity_level);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all the new tables to update the updated_at column
CREATE TRIGGER update_match_history_updated_at
BEFORE UPDATE ON match_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_engagement_updated_at
BEFORE UPDATE ON user_engagement
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_ratings_updated_at
BEFORE UPDATE ON match_ratings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_similarity_updated_at
BEFORE UPDATE ON user_similarity
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_activity_metrics_updated_at
BEFORE UPDATE ON user_activity_metrics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 