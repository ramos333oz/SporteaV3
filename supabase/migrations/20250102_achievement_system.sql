-- Achievement System Database Schema
-- This migration creates the complete achievement and gamification system

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('participation', 'social', 'streak', 'skill', 'special')),
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('count', 'streak', 'percentage', 'special')),
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  badge_icon TEXT NOT NULL,
  badge_color TEXT NOT NULL,
  rarity_percentage FLOAT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_time_limited BOOLEAN DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievement_progress table
CREATE TABLE IF NOT EXISTS user_achievement_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Create user_gamification table
CREATE TABLE IF NOT EXISTS user_gamification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  community_score FLOAT DEFAULT 0,
  weekly_xp INTEGER DEFAULT 0,
  monthly_xp INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievement_progress_user_id ON user_achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievement_progress_completed ON user_achievement_progress(is_completed, completed_at);
CREATE INDEX IF NOT EXISTS idx_achievements_category_tier ON achievements(category, tier);
CREATE INDEX IF NOT EXISTS idx_user_gamification_community_score ON user_gamification(community_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_gamification_weekly_xp ON user_gamification(weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_gamification_level ON user_gamification(current_level DESC);

-- Create RLS policies
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- Achievements are readable by all authenticated users
CREATE POLICY "Achievements are viewable by authenticated users" ON achievements
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only view their own achievement progress
CREATE POLICY "Users can view own achievement progress" ON user_achievement_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only view their own gamification data
CREATE POLICY "Users can view own gamification data" ON user_gamification
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all data
CREATE POLICY "Service role can manage achievements" ON achievements
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage user achievement progress" ON user_achievement_progress
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage user gamification" ON user_gamification
  FOR ALL USING (auth.role() = 'service_role');

-- Insert initial achievement data
INSERT INTO achievements (name, description, category, tier, requirement_type, requirement_value, xp_reward, badge_icon, badge_color) VALUES
-- Participation Achievements - Bronze Tier
('First Steps', 'Join your first match', 'participation', 'bronze', 'count', 1, 10, '🏃', '#CD7F32'),
('Getting Started', 'Host your first match', 'participation', 'bronze', 'count', 1, 15, '🎯', '#CD7F32'),
('Sport Explorer', 'Try 2 different sports', 'participation', 'bronze', 'count', 2, 20, '🌟', '#CD7F32'),

-- Participation Achievements - Silver Tier
('Regular Player', 'Join 10 matches', 'participation', 'silver', 'count', 10, 25, '⚽', '#C0C0C0'),
('Match Organizer', 'Host 5 matches', 'participation', 'silver', 'count', 5, 30, '📋', '#C0C0C0'),
('Multi-Sport Athlete', 'Try 4 different sports', 'participation', 'silver', 'count', 4, 35, '🏆', '#C0C0C0'),

-- Participation Achievements - Gold Tier
('Dedicated Player', 'Join 50 matches', 'participation', 'gold', 'count', 50, 50, '🥇', '#FFD700'),
('Event Master', 'Host 25 matches', 'participation', 'gold', 'count', 25, 60, '👑', '#FFD700'),
('Sports Enthusiast', 'Try 6 different sports', 'participation', 'gold', 'count', 6, 70, '🎖️', '#FFD700'),

-- Social Achievements - Bronze Tier
('Friendly Face', 'Make 3 friends', 'social', 'bronze', 'count', 3, 15, '👋', '#CD7F32'),
('Team Player', 'Join 1 group match', 'social', 'bronze', 'count', 1, 10, '🤝', '#CD7F32'),

-- Social Achievements - Silver Tier
('Social Butterfly', 'Make 10 friends', 'social', 'silver', 'count', 10, 30, '🦋', '#C0C0C0'),
('Group Leader', 'Join 5 group matches', 'social', 'silver', 'count', 5, 25, '👥', '#C0C0C0'),

-- Social Achievements - Gold Tier
('Community Builder', 'Make 25 friends', 'social', 'gold', 'count', 25, 60, '🏘️', '#FFD700'),
('Team Captain', 'Join 15 group matches', 'social', 'gold', 'count', 15, 50, '⭐', '#FFD700'),

-- Streak Achievements - Bronze Tier
('Consistent Player', 'Maintain 3-day activity streak', 'streak', 'bronze', 'streak', 3, 20, '🔥', '#CD7F32'),

-- Streak Achievements - Silver Tier
('Weekly Warrior', 'Maintain 7-day activity streak', 'streak', 'silver', 'streak', 7, 40, '⚡', '#C0C0C0'),

-- Streak Achievements - Gold Tier
('Unstoppable', 'Maintain 14-day activity streak', 'streak', 'gold', 'streak', 14, 80, '💪', '#FFD700'),

-- Skill Achievements - Bronze Tier
('Skill Seeker', 'Improve skill level in 1 sport', 'skill', 'bronze', 'count', 1, 25, '📈', '#CD7F32'),

-- Skill Achievements - Silver Tier
('Multi-Skilled', 'Improve skill level in 3 sports', 'skill', 'silver', 'count', 3, 50, '🎯', '#C0C0C0'),

-- Skill Achievements - Gold Tier
('Master Athlete', 'Improve skill level in 5 sports', 'skill', 'gold', 'count', 5, 100, '🏅', '#FFD700');

-- Create function to automatically create user_gamification record for new users
CREATE OR REPLACE FUNCTION create_user_gamification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_gamification (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create gamification record when user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_gamification();

-- Create function to calculate user level based on XP
CREATE OR REPLACE FUNCTION calculate_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Level calculation: Level 1-10 (0-500 XP), 11-25 (501-2000 XP), etc.
  IF xp <= 500 THEN
    RETURN LEAST(10, GREATEST(1, (xp / 50) + 1));
  ELSIF xp <= 2000 THEN
    RETURN LEAST(25, 10 + ((xp - 500) / 100));
  ELSIF xp <= 5000 THEN
    RETURN LEAST(50, 25 + ((xp - 2000) / 120));
  ELSIF xp <= 10000 THEN
    RETURN LEAST(75, 50 + ((xp - 5000) / 200));
  ELSE
    RETURN LEAST(100, 75 + ((xp - 10000) / 400));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user level when XP changes
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.current_level = calculate_level(NEW.total_xp);
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update level when XP changes
CREATE TRIGGER on_xp_update
  BEFORE UPDATE OF total_xp ON user_gamification
  FOR EACH ROW EXECUTE FUNCTION update_user_level();
