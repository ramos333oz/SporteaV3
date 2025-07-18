-- KNN User Vectors Table Migration
-- Creates table for storing 142-element user vectors for KNN recommendation system
-- Based on User_Vector_Specification.md and Database_Schema_Requirements.md

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_vectors_knn table for storing 142-element user vectors
CREATE TABLE IF NOT EXISTS user_vectors_knn (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 142-element vector data based on actual user preferences
  -- Vector components: Sport-Skills(33) + Faculty(7) + Campus(13) + Gender(4) + PlayStyle(2) + TimeSlots(49) + Facilities(29) + Padding(5)
  vector_data FLOAT8[] NOT NULL CHECK (array_length(vector_data, 1) = 142),

  -- Vector component hashes for quick filtering and optimization
  time_availability_hash VARCHAR(64) NOT NULL,
  sports_hash VARCHAR(64) NOT NULL,
  state_hash VARCHAR(32) NOT NULL,
  facilities_hash VARCHAR(64),

  -- Metadata for vector management
  vector_version INTEGER DEFAULT 1,
  completeness_score FLOAT4 CHECK (completeness_score BETWEEN 0 AND 1),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_vectors_knn_user_id ON user_vectors_knn(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vectors_knn_updated ON user_vectors_knn(last_updated);
CREATE INDEX IF NOT EXISTS idx_user_vectors_knn_sports_hash ON user_vectors_knn(sports_hash);
CREATE INDEX IF NOT EXISTS idx_user_vectors_knn_state_hash ON user_vectors_knn(state_hash);
CREATE INDEX IF NOT EXISTS idx_user_vectors_knn_time_hash ON user_vectors_knn(time_availability_hash);
CREATE INDEX IF NOT EXISTS idx_user_vectors_knn_facilities_hash ON user_vectors_knn(facilities_hash);
CREATE INDEX IF NOT EXISTS idx_user_vectors_knn_completeness ON user_vectors_knn(completeness_score);
CREATE INDEX IF NOT EXISTS idx_user_vectors_knn_version ON user_vectors_knn(vector_version);

-- Create similarity cache table for performance optimization
CREATE TABLE IF NOT EXISTS user_similarity_cache_knn (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Euclidean distance between vectors (lower = more similar)
  euclidean_distance FLOAT8 NOT NULL,
  
  -- Similarity score (1 - normalized_distance, higher = more similar)
  similarity_score FLOAT8 NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),
  
  -- Cache metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  vector_version_1 INTEGER NOT NULL,
  vector_version_2 INTEGER NOT NULL,
  
  -- Ensure unique pairs and prevent duplicate calculations
  UNIQUE(user_id_1, user_id_2),
  CHECK(user_id_1 != user_id_2)
);

-- Create indexes for similarity cache
CREATE INDEX IF NOT EXISTS idx_similarity_cache_user1 ON user_similarity_cache_knn(user_id_1);
CREATE INDEX IF NOT EXISTS idx_similarity_cache_user2 ON user_similarity_cache_knn(user_id_2);
CREATE INDEX IF NOT EXISTS idx_similarity_cache_score ON user_similarity_cache_knn(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_similarity_cache_distance ON user_similarity_cache_knn(euclidean_distance ASC);
CREATE INDEX IF NOT EXISTS idx_similarity_cache_calculated ON user_similarity_cache_knn(calculated_at);

-- Create function to calculate hash for time availability vector component
CREATE OR REPLACE FUNCTION calculate_time_availability_hash(available_hours JSONB)
RETURNS VARCHAR(64) AS $$
DECLARE
  hash_input TEXT := '';
  day_key TEXT;
  time_slots TEXT[];
BEGIN
  -- Handle null input
  IF available_hours IS NULL THEN
    RETURN md5('empty_schedule');
  END IF;

  -- Process each day in consistent order
  FOR day_key IN SELECT unnest(ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) LOOP
    IF available_hours ? day_key THEN
      -- Get time slots for this day and sort them
      SELECT array_agg(slot ORDER BY slot) INTO time_slots
      FROM jsonb_array_elements_text(available_hours->day_key) AS slot;
      
      hash_input := hash_input || day_key || ':' || COALESCE(array_to_string(time_slots, ','), '') || ';';
    ELSE
      hash_input := hash_input || day_key || ':;';
    END IF;
  END LOOP;

  RETURN md5(hash_input);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate hash for sports preferences
CREATE OR REPLACE FUNCTION calculate_sports_hash(sport_preferences JSONB)
RETURNS VARCHAR(64) AS $$
DECLARE
  hash_input TEXT := '';
  sport_record RECORD;
BEGIN
  -- Handle null input
  IF sport_preferences IS NULL OR jsonb_array_length(sport_preferences) = 0 THEN
    RETURN md5('no_sports');
  END IF;

  -- Process sports in consistent order (by name, then level)
  FOR sport_record IN 
    SELECT 
      COALESCE(sport->>'name', '') as sport_name,
      COALESCE(sport->>'level', 'beginner') as skill_level
    FROM jsonb_array_elements(sport_preferences) AS sport
    ORDER BY sport->>'name', sport->>'level'
  LOOP
    hash_input := hash_input || sport_record.sport_name || ':' || sport_record.skill_level || ';';
  END LOOP;

  RETURN md5(hash_input);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate hash for facilities preferences
CREATE OR REPLACE FUNCTION calculate_facilities_hash(preferred_facilities JSONB)
RETURNS VARCHAR(64) AS $$
DECLARE
  hash_input TEXT := '';
  facility_id TEXT;
BEGIN
  -- Handle null input
  IF preferred_facilities IS NULL OR jsonb_array_length(preferred_facilities) = 0 THEN
    RETURN md5('no_facilities');
  END IF;

  -- Process facility IDs in consistent order
  FOR facility_id IN 
    SELECT jsonb_array_elements_text(preferred_facilities) AS fid
    ORDER BY fid
  LOOP
    hash_input := hash_input || facility_id || ';';
  END LOOP;

  RETURN md5(hash_input);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate state hash
CREATE OR REPLACE FUNCTION calculate_state_hash(campus TEXT)
RETURNS VARCHAR(32) AS $$
BEGIN
  RETURN md5(COALESCE(campus, 'unknown_state'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comments for documentation
COMMENT ON TABLE user_vectors_knn IS 'Stores 142-element user vectors for KNN recommendation system based on User_Vector_Specification.md';
COMMENT ON COLUMN user_vectors_knn.vector_data IS '142-element vector: Sport-Skills(33) + Faculty(7) + Campus(13) + Gender(4) + PlayStyle(2) + TimeSlots(49) + Facilities(29) + Padding(5)';
COMMENT ON COLUMN user_vectors_knn.time_availability_hash IS 'MD5 hash of time availability for quick filtering';
COMMENT ON COLUMN user_vectors_knn.sports_hash IS 'MD5 hash of sports preferences for quick filtering';
COMMENT ON COLUMN user_vectors_knn.state_hash IS 'MD5 hash of campus/state for geographic filtering';
COMMENT ON COLUMN user_vectors_knn.completeness_score IS 'Percentage of non-zero elements in vector (target: >0.4)';

COMMENT ON TABLE user_similarity_cache_knn IS 'Caches pairwise user similarity calculations for performance optimization';
COMMENT ON COLUMN user_similarity_cache_knn.euclidean_distance IS 'Euclidean distance between 142-element vectors (lower = more similar)';
COMMENT ON COLUMN user_similarity_cache_knn.similarity_score IS 'Normalized similarity score (1 - normalized_distance, higher = more similar)';

-- Create function to invalidate user vector when preferences change
CREATE OR REPLACE FUNCTION invalidate_user_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any vector-relevant fields have changed
  IF (OLD.sport_preferences IS DISTINCT FROM NEW.sport_preferences OR
      OLD.faculty IS DISTINCT FROM NEW.faculty OR
      OLD.campus IS DISTINCT FROM NEW.campus OR
      OLD.gender IS DISTINCT FROM NEW.gender OR
      OLD.play_style IS DISTINCT FROM NEW.play_style OR
      OLD.available_hours IS DISTINCT FROM NEW.available_hours OR
      OLD.preferred_facilities IS DISTINCT FROM NEW.preferred_facilities) THEN

    -- Delete the user's vector to force regeneration
    DELETE FROM user_vectors_knn WHERE user_id = NEW.id;

    -- Delete similarity cache entries involving this user
    DELETE FROM user_similarity_cache_knn
    WHERE user_id_1 = NEW.id OR user_id_2 = NEW.id;

    -- Log the invalidation
    RAISE NOTICE 'Invalidated KNN vector and similarity cache for user %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically invalidate vectors when user preferences change
DROP TRIGGER IF EXISTS trigger_invalidate_user_vector ON users;
CREATE TRIGGER trigger_invalidate_user_vector
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_user_vector();

-- Create function to clean up old similarity cache entries
CREATE OR REPLACE FUNCTION cleanup_similarity_cache()
RETURNS void AS $$
BEGIN
  -- Delete cache entries older than 24 hours
  DELETE FROM user_similarity_cache_knn
  WHERE calculated_at < NOW() - INTERVAL '24 hours';

  -- Log cleanup
  RAISE NOTICE 'Cleaned up old similarity cache entries';
END;
$$ LANGUAGE plpgsql;

-- Create function to get vector statistics
CREATE OR REPLACE FUNCTION get_knn_vector_stats()
RETURNS TABLE(
  total_vectors INTEGER,
  avg_completeness FLOAT,
  vectors_above_threshold INTEGER,
  cache_entries INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_vectors,
    AVG(completeness_score)::FLOAT as avg_completeness,
    COUNT(CASE WHEN completeness_score >= 0.4 THEN 1 END)::INTEGER as vectors_above_threshold,
    (SELECT COUNT(*)::INTEGER FROM user_similarity_cache_knn) as cache_entries
  FROM user_vectors_knn;
END;
$$ LANGUAGE plpgsql;
