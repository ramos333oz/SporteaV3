-- Rollback script for the recommendation system update
-- This script will revert the changes made by 20250616_recommendation_system_update.sql

-- Drop tables in reverse order of creation (to avoid foreign key constraints)
DROP TABLE IF EXISTS user_activity_metrics;
DROP TABLE IF EXISTS user_similarity;
DROP TABLE IF EXISTS match_ratings;
DROP TABLE IF EXISTS user_engagement;
DROP TABLE IF EXISTS match_history;

-- Remove the new fields from user_preferences table
ALTER TABLE user_preferences 
  DROP COLUMN IF EXISTS preferred_venues,
  DROP COLUMN IF EXISTS preferred_days,
  DROP COLUMN IF EXISTS preferred_times,
  DROP COLUMN IF EXISTS preferred_group_size,
  DROP COLUMN IF EXISTS preferred_skill_level,
  DROP COLUMN IF EXISTS preferred_match_frequency;

-- Remove the new futsal venues
DELETE FROM venues WHERE id IN ('venue_perindu_1', 'venue_perindu_2', 'venue_perindu_3');

-- Log the rollback
INSERT INTO migration_logs (migration_name, status, details)
VALUES (
  '20250616_recommendation_system_rollback', 
  'completed', 
  'Rolled back recommendation system update: removed new tables, fields, and venues'
);

-- Note: This rollback does not affect the Edge Functions, which need to be handled separately
-- To roll back Edge Functions, deploy the previous version or disable the new function 