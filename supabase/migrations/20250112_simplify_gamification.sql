-- SporteaV3 Simplified Gamification System Migration
-- This migration implements the simplified linear XP progression system
-- as documented in docs/leaderboard_gamification/

BEGIN;

-- Update level calculation function to linear progression
-- Replace complex tier-based calculation with simple 500 XP per level
CREATE OR REPLACE FUNCTION calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Simple linear progression: 500 XP per level
  -- Level 1: 0-499 XP
  -- Level 2: 500-999 XP
  -- Level 3: 1000-1499 XP
  -- etc.
  RETURN GREATEST(1, FLOOR(xp / 500) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add index for leaderboard performance (if not exists)
-- This optimizes ORDER BY total_xp DESC queries
CREATE INDEX IF NOT EXISTS idx_user_gamification_xp_desc
ON user_gamification(total_xp DESC);

-- Add index for user lookup performance
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id
ON user_gamification(user_id);

-- Create simple leaderboard view for performance
-- This view provides the basic leaderboard data with calculated ranks
CREATE OR REPLACE VIEW simple_leaderboard AS
SELECT
  ug.user_id,
  ug.total_xp,
  ug.current_level,
  ug.current_streak,
  ug.weekly_xp,
  ug.monthly_xp,
  ROW_NUMBER() OVER (ORDER BY ug.total_xp DESC) as global_rank,
  u.full_name,
  u.avatar_url,
  u.faculty,
  u.campus
FROM user_gamification ug
LEFT JOIN users u ON ug.user_id = u.id
WHERE ug.total_xp > 0
ORDER BY ug.total_xp DESC;

-- Update existing user levels to use new calculation
-- This ensures consistency with the new linear formula
UPDATE user_gamification 
SET current_level = calculate_level(total_xp)
WHERE total_xp > 0;

-- Add comment to document the change
COMMENT ON FUNCTION calculate_level(INTEGER) IS 
'Simplified linear level calculation: 500 XP per level. Replaces complex tier-based system for better performance and maintainability.';

COMMIT;

-- Verification queries (for testing purposes)
-- These can be run manually to verify the migration worked correctly

/*
-- Test level calculation with sample data
SELECT
  total_xp,
  current_level as old_level,
  calculate_level(total_xp) as new_level
FROM user_gamification
WHERE total_xp > 0
LIMIT 10;

-- Verify leaderboard query performance
EXPLAIN ANALYZE
SELECT user_id, total_xp, current_level
FROM user_gamification
ORDER BY total_xp DESC
LIMIT 50;

-- Test the simple_leaderboard view
SELECT * FROM simple_leaderboard LIMIT 10;

-- Verify index usage
EXPLAIN (ANALYZE, BUFFERS)
SELECT user_id, total_xp, global_rank
FROM simple_leaderboard
LIMIT 50;
*/
