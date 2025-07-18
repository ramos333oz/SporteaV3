# Database Schema Requirements for KNN Recommendation System

## Overview

This document specifies the database schema requirements for implementing the KNN recommendation system. The schema extends the existing Supabase database structure to support vector storage, similarity caching, and recommendation tracking.

## Current Database Analysis

### Existing Tables (Verified)
- ✅ `users` - Core user data with JSONB preference fields (ALL user preferences stored here)
- ✅ `matches` - Match data with moderation_status
- ✅ `sports` - Sports catalog
- ✅ `locations` - Venue information
- ✅ `match_participants` - User-match relationships
- ✅ `user_similarity` - Basic similarity storage (legacy)
- ✅ `user_activity_metrics` - User behavior tracking

### User Preference Data Location
**Important**: All user preference data is stored directly in the `users` table. There is NO separate `user_preferences` table.

**Available User Preference Columns in `users` table**:
- `sport_preferences` (JSONB) - Sports and skill levels
- `faculty` (TEXT) - User's faculty
- `campus` (TEXT) - User's campus
- `gender` (TEXT) - User's gender
- `play_style` (TEXT) - Casual or Competitive
- `available_days` (JSONB) - Available days array
- `available_hours` (JSONB) - Available time slots
- `preferred_facilities` (JSONB) - Preferred facility IDs

### Extensions Required
- ✅ `pgvector` - Already enabled for vector operations
- ✅ `uuid-ossp` - Already enabled for UUID generation

## New Schema Components

### 1. User Vector Storage

```sql
-- Main table for storing 142-element user vectors
CREATE TABLE user_vectors_knn (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 142-element vector data based on actual user preferences
  vector_data FLOAT8[] NOT NULL CHECK (array_length(vector_data, 1) = 142),

  -- Vector component hashes for quick filtering
  time_availability_hash VARCHAR(64) NOT NULL,
  sports_hash VARCHAR(64) NOT NULL,
  state_hash VARCHAR(32) NOT NULL,

  -- Metadata
  vector_version INTEGER DEFAULT 1,
  completeness_score FLOAT4 CHECK (completeness_score BETWEEN 0 AND 1),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX idx_user_vectors_knn_user_id ON user_vectors_knn(user_id);
CREATE INDEX idx_user_vectors_knn_updated ON user_vectors_knn(last_updated);
CREATE INDEX idx_user_vectors_knn_sports_hash ON user_vectors_knn(sports_hash);
CREATE INDEX idx_user_vectors_knn_time_hash ON user_vectors_knn(time_availability_hash);
CREATE INDEX idx_user_vectors_knn_state_hash ON user_vectors_knn(state_hash);
CREATE INDEX idx_user_vectors_knn_completeness ON user_vectors_knn(completeness_score);

-- Comments for documentation
COMMENT ON TABLE user_vectors_knn IS 'Stores 142-element user attribute vectors for KNN recommendations';
COMMENT ON COLUMN user_vectors_knn.vector_data IS '142-element array: [sport_skills(33), faculty(7), state(13), gender(4), play_style(2), time_slots(49), facilities(29), padding(5)]';
COMMENT ON COLUMN user_vectors_knn.time_availability_hash IS 'Hash of time availability pattern for quick overlap detection';
COMMENT ON COLUMN user_vectors_knn.sports_hash IS 'Hash of sport-skill combinations for sport isolation';
COMMENT ON COLUMN user_vectors_knn.state_hash IS 'Hash of state location for geographic filtering';
COMMENT ON COLUMN user_vectors_knn.completeness_score IS 'Percentage of non-zero elements in vector (0.0-1.0)';
```

### 2. Enhanced User Similarity Cache

```sql
-- Enhanced similarity storage with KNN-specific metadata
CREATE TABLE user_similarity_knn (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Similarity scores
  euclidean_similarity FLOAT4 NOT NULL CHECK (euclidean_similarity BETWEEN 0 AND 1),
  cosine_similarity FLOAT4 NOT NULL CHECK (cosine_similarity BETWEEN 0 AND 1),
  hybrid_similarity FLOAT4 NOT NULL CHECK (hybrid_similarity BETWEEN 0 AND 1),
  
  -- Component similarities for debugging
  time_similarity FLOAT4 CHECK (time_similarity BETWEEN 0 AND 1),
  sports_similarity FLOAT4 CHECK (sports_similarity BETWEEN 0 AND 1),
  location_similarity FLOAT4 CHECK (location_similarity BETWEEN 0 AND 1),
  social_similarity FLOAT4 CHECK (social_similarity BETWEEN 0 AND 1),
  
  -- Metadata
  calculation_method VARCHAR(20) DEFAULT 'hybrid',
  confidence_score FLOAT4 CHECK (confidence_score BETWEEN 0 AND 1),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 < user_id_2) -- Ensure consistent ordering
);

-- Indexes for performance
CREATE INDEX idx_user_similarity_knn_user1 ON user_similarity_knn(user_id_1);
CREATE INDEX idx_user_similarity_knn_user2 ON user_similarity_knn(user_id_2);
CREATE INDEX idx_user_similarity_knn_hybrid ON user_similarity_knn(hybrid_similarity DESC);
CREATE INDEX idx_user_similarity_knn_updated ON user_similarity_knn(last_updated);

-- Comments
COMMENT ON TABLE user_similarity_knn IS 'Cached pairwise user similarities for KNN algorithm';
COMMENT ON COLUMN user_similarity_knn.hybrid_similarity IS 'Primary similarity score combining euclidean and cosine metrics';
```

### 3. KNN Recommendation Cache

```sql
-- Cache for KNN-generated recommendations
CREATE TABLE knn_recommendation_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Recommendation data
  recommended_matches JSONB NOT NULL,
  neighbor_count INTEGER NOT NULL,
  avg_neighbor_similarity FLOAT4 CHECK (avg_neighbor_similarity BETWEEN 0 AND 1),
  
  -- Cache metadata
  cache_key VARCHAR(64) NOT NULL,
  algorithm_version VARCHAR(10) DEFAULT 'knn_v1',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Performance tracking
  generation_time_ms INTEGER,
  neighbor_search_time_ms INTEGER,
  
  -- Constraints
  UNIQUE(user_id, cache_key)
);

-- Indexes
CREATE INDEX idx_knn_cache_user_id ON knn_recommendation_cache(user_id);
CREATE INDEX idx_knn_cache_expires ON knn_recommendation_cache(expires_at);
CREATE INDEX idx_knn_cache_key ON knn_recommendation_cache(cache_key);

-- Auto-cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_knn_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM knn_recommendation_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup every hour
SELECT cron.schedule('cleanup-knn-cache', '0 * * * *', 'SELECT cleanup_expired_knn_cache();');
```

### 4. KNN Performance Metrics

```sql
-- Track KNN algorithm performance and quality
CREATE TABLE knn_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Query metadata
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query_type VARCHAR(20) NOT NULL, -- 'recommendation', 'similarity', 'vector_update'
  
  -- Performance metrics
  execution_time_ms INTEGER NOT NULL,
  vector_comparisons INTEGER,
  cache_hit_rate FLOAT4 CHECK (cache_hit_rate BETWEEN 0 AND 1),
  
  -- Quality metrics
  recommendation_count INTEGER,
  avg_recommendation_score FLOAT4,
  user_feedback_score FLOAT4 CHECK (user_feedback_score BETWEEN 1 AND 5),
  
  -- System metrics
  memory_usage_mb FLOAT4,
  cpu_usage_percent FLOAT4,
  
  -- Metadata
  algorithm_version VARCHAR(10) DEFAULT 'knn_v1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_knn_metrics_user_id ON knn_performance_metrics(user_id);
CREATE INDEX idx_knn_metrics_created ON knn_performance_metrics(created_at);
CREATE INDEX idx_knn_metrics_query_type ON knn_performance_metrics(query_type);
```

### 5. Vector Update Queue

```sql
-- Queue for managing vector updates
CREATE TABLE vector_update_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Update details
  update_type VARCHAR(20) NOT NULL, -- 'profile_change', 'behavior_update', 'periodic_refresh'
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(user_id, update_type, status) -- Prevent duplicate pending updates
);

-- Indexes
CREATE INDEX idx_vector_queue_status ON vector_update_queue(status);
CREATE INDEX idx_vector_queue_priority ON vector_update_queue(priority DESC);
CREATE INDEX idx_vector_queue_created ON vector_update_queue(created_at);
```

## Database Functions

### 1. Vector Distance Calculation

```sql
-- Function to calculate unweighted Euclidean distance between vectors
-- Following TEMPLATE.md methodology (lines 61-63)
CREATE OR REPLACE FUNCTION calculate_vector_distance(
  vector1 FLOAT8[],
  vector2 FLOAT8[]
)
RETURNS FLOAT8 AS $$
DECLARE
  distance FLOAT8 := 0;
  i INTEGER;
BEGIN
  -- Validate input vectors
  IF array_length(vector1, 1) != 142 OR array_length(vector2, 1) != 142 THEN
    RAISE EXCEPTION 'Vectors must be 142-dimensional';
  END IF;

  -- Calculate pure Euclidean distance: √[(x₁-y₁)² + (x₂-y₂)² + ... + (xₙ-yₙ)²]
  FOR i IN 1..142 LOOP
    distance := distance + POWER(vector1[i] - vector2[i], 2);
  END LOOP;

  RETURN SQRT(distance);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to convert distance to similarity score
CREATE OR REPLACE FUNCTION distance_to_similarity(distance FLOAT8)
RETURNS FLOAT8 AS $$
BEGIN
  -- Convert distance to similarity (0-1 scale)
  -- Lower distance = Higher similarity
  RETURN 1.0 / (1.0 + distance);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 2. KNN Search Function

```sql
-- Function to find K nearest neighbors for a user
CREATE OR REPLACE FUNCTION find_knn_neighbors(
  target_user_id UUID,
  k INTEGER DEFAULT 10,
  min_similarity FLOAT8 DEFAULT 0.3,
  sport_filter VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  neighbor_user_id UUID,
  similarity_score FLOAT8,
  distance FLOAT8
) AS $$
DECLARE
  target_vector FLOAT8[];
BEGIN
  -- Get target user's vector
  SELECT vector_data INTO target_vector
  FROM user_vectors_knn
  WHERE user_id = target_user_id;
  
  IF target_vector IS NULL THEN
    RAISE EXCEPTION 'User vector not found for user %', target_user_id;
  END IF;
  
  -- Find similar users
  RETURN QUERY
  SELECT 
    uvk.user_id,
    1.0 / (1.0 + calculate_vector_distance(target_vector, uvk.vector_data)) AS similarity,
    calculate_vector_distance(target_vector, uvk.vector_data) AS dist
  FROM user_vectors_knn uvk
  WHERE uvk.user_id != target_user_id
    AND (sport_filter IS NULL OR uvk.sports_hash = sport_filter)
    AND uvk.completeness_score >= 0.5  -- Ensure sufficient data quality
  ORDER BY dist ASC
  LIMIT k;
END;
$$ LANGUAGE plpgsql;
```

### 3. Vector Update Trigger

```sql
-- Trigger to queue vector updates when user data changes
CREATE OR REPLACE FUNCTION queue_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert update request into queue
  INSERT INTO vector_update_queue (user_id, update_type, priority)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    CASE
      WHEN TG_TABLE_NAME = 'users' THEN 'profile_change'
      ELSE 'data_change'
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 8  -- High priority for new users
      WHEN TG_OP = 'UPDATE' THEN 5  -- Medium priority for updates
      ELSE 3                        -- Lower priority for other changes
    END
  )
  ON CONFLICT (user_id, update_type, status) DO NOTHING;  -- Avoid duplicates
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables
CREATE TRIGGER trigger_queue_vector_update_users
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION queue_vector_update();
```

## Migration Scripts

### Initial Setup Migration

```sql
-- Migration: 20250117_knn_recommendation_system.sql
-- Description: Set up KNN recommendation system database schema

BEGIN;

-- Create all tables
-- (Include all CREATE TABLE statements from above)

-- Create all functions
-- (Include all function definitions from above)

-- Create all triggers
-- (Include all trigger definitions from above)

-- Insert initial data or configurations if needed
INSERT INTO knn_performance_metrics (query_type, execution_time_ms, created_at)
VALUES ('system_initialization', 0, NOW());

COMMIT;
```

### Data Migration for Existing Users

```sql
-- Migration: 20250117_migrate_existing_users_to_knn.sql
-- Description: Generate initial vectors for existing users

BEGIN;

-- Queue vector generation for all existing users
INSERT INTO vector_update_queue (user_id, update_type, priority)
SELECT id, 'initial_vector_generation', 9
FROM users
WHERE id NOT IN (SELECT user_id FROM user_vectors_knn);

COMMIT;
```

## Performance Considerations

### Index Strategy
- **Primary Lookups**: user_id indexes on all tables
- **Similarity Searches**: Composite indexes on similarity scores
- **Cache Management**: TTL-based indexes for automatic cleanup
- **Vector Operations**: Specialized indexes for array operations

### Storage Estimates
- **User Vector**: ~1,136 bytes per user (142 × 8-byte floats)
- **Similarity Cache**: ~32 bytes per user pair
- **Recommendation Cache**: ~2KB per user (JSON data)
- **Total for 10K users**: ~114MB vector data, ~3GB similarity cache

### Maintenance Tasks
- **Daily**: Vector updates for active users
- **Weekly**: Full similarity recalculation
- **Monthly**: Performance metrics analysis and optimization

This schema provides a robust foundation for the KNN recommendation system based on the actual Sportea database structure, with 142-element vectors representing verified user preference data from the `users` table.
