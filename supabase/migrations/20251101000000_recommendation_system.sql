-- Add new futsal venues
INSERT INTO venues (id, name, category, is_active)
VALUES 
  ('venue_perindu_1', 'COURT PERINDU 1', 'futsal', true),
  ('venue_perindu_2', 'COURT PERINDU 2', 'futsal', true),
  ('venue_perindu_3', 'COURT PERINDU 3', 'futsal', true);

-- Create index for faster venue lookups
CREATE INDEX IF NOT EXISTS idx_venues_category ON venues(category);

-- Update user_preferences table to add new preference fields
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS favorite_activities TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS skill_levels JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS play_style TEXT DEFAULT 'both',
ADD COLUMN IF NOT EXISTS available_days TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS available_hours TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS venue_preference TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS participant_count_preference TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS duration_preference TEXT DEFAULT 'medium';

-- Create index for faster preference lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create a table to store match history for collaborative filtering
CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  game_id UUID NOT NULL REFERENCES games(id),
  status TEXT NOT NULL CHECK (status IN ('participated', 'canceled', 'no-show')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, game_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_game_id ON match_history(game_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created_at ON match_history(created_at);

-- Create a table to track user interactions beyond game participation
CREATE TABLE IF NOT EXISTS user_engagement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'game')),
  target_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('view', 'click', 'message', 'save')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_engagement_user_id ON user_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_target_id ON user_engagement(target_id);
CREATE INDEX IF NOT EXISTS idx_user_engagement_created_at ON user_engagement(created_at);

-- Create a table to collect feedback after matches
CREATE TABLE IF NOT EXISTS match_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  game_id UUID NOT NULL REFERENCES games(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, game_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_match_ratings_user_id ON match_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_match_ratings_game_id ON match_ratings(game_id);

-- Create a table to store pre-computed user similarities
CREATE TABLE IF NOT EXISTS user_similarity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id),
  user_id_2 UUID NOT NULL REFERENCES auth.users(id),
  similarity_score FLOAT NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id_1, user_id_2)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_similarity_user_id_1 ON user_similarity(user_id_1);
CREATE INDEX IF NOT EXISTS idx_user_similarity_user_id_2 ON user_similarity(user_id_2);
CREATE INDEX IF NOT EXISTS idx_user_similarity_score ON user_similarity(similarity_score);

-- Create a table to store pre-calculated activity metrics
CREATE TABLE IF NOT EXISTS user_activity_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  participation_count INTEGER DEFAULT 0,
  completion_rate FLOAT DEFAULT 0,
  average_rating FLOAT DEFAULT 0,
  favorite_venues TEXT[] DEFAULT ARRAY[]::TEXT[],
  frequent_players UUID[] DEFAULT ARRAY[]::UUID[],
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_metrics_user_id ON user_activity_metrics(user_id); 