-- User Reporting System Database Schema
-- This migration creates the complete user reporting system with rate limiting

-- Create user_reports table
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('technical', 'player', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  player_name TEXT, -- Optional, for player-related reports
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_report_limits table for rate limiting
CREATE TABLE IF NOT EXISTS user_report_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, report_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_reports_user_id ON user_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_category ON user_reports(category);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_priority ON user_reports(priority);
CREATE INDEX IF NOT EXISTS idx_user_report_limits_user_date ON user_report_limits(user_id, report_date);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_reports_updated_at
  BEFORE UPDATE ON user_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_report_limits_updated_at
  BEFORE UPDATE ON user_report_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle rate limiting
CREATE OR REPLACE FUNCTION increment_user_report_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Insert or update the report count for today
  INSERT INTO user_report_limits (user_id, report_date, report_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, report_date)
  DO UPDATE SET 
    report_count = user_report_limits.report_count + 1,
    updated_at = NOW()
  RETURNING report_count INTO current_count;
  
  RETURN current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can report
CREATE OR REPLACE FUNCTION can_user_report(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COALESCE(report_count, 0) INTO current_count
  FROM user_report_limits
  WHERE user_id = p_user_id AND report_date = CURRENT_DATE;
  
  RETURN COALESCE(current_count, 0) < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS)
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_report_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_reports
-- Users can only see their own reports
CREATE POLICY "Users can view own reports" ON user_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own reports (with rate limiting check)
CREATE POLICY "Users can insert own reports" ON user_reports
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    can_user_report(auth.uid())
  );

-- Users cannot update or delete reports (admin only)
CREATE POLICY "Users cannot update reports" ON user_reports
  FOR UPDATE USING (false);

CREATE POLICY "Users cannot delete reports" ON user_reports
  FOR DELETE USING (false);

-- Admin policies (assuming admins have a role or specific user IDs)
-- For now, we'll create a simple admin check function
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- This is a placeholder - you should implement proper admin role checking
  -- For example, check if user has admin role in a roles table
  -- or check against specific admin user IDs
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email LIKE '%@admin.sportea.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can view all reports
CREATE POLICY "Admins can view all reports" ON user_reports
  FOR SELECT USING (is_admin(auth.uid()));

-- Admin can update all reports
CREATE POLICY "Admins can update all reports" ON user_reports
  FOR UPDATE USING (is_admin(auth.uid()));

-- Create RLS policies for user_report_limits
-- Users can only see their own limits
CREATE POLICY "Users can view own limits" ON user_report_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert/update their own limits (handled by functions)
CREATE POLICY "Users can manage own limits" ON user_report_limits
  FOR ALL USING (auth.uid() = user_id);

-- Admins can view all limits
CREATE POLICY "Admins can view all limits" ON user_report_limits
  FOR SELECT USING (is_admin(auth.uid()));

-- Create view for admin dashboard with user information
CREATE OR REPLACE VIEW admin_reports_view AS
SELECT 
  r.*,
  u.full_name as user_full_name,
  u.email as user_email,
  u.username as user_username,
  u.avatar_url as user_avatar_url,
  resolver.full_name as resolved_by_name
FROM user_reports r
LEFT JOIN auth.users u ON r.user_id = u.id
LEFT JOIN auth.users resolver ON r.resolved_by = resolver.id
ORDER BY r.created_at DESC;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON user_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_report_limits TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_report_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- Grant admin view access (will be restricted by RLS)
GRANT SELECT ON admin_reports_view TO authenticated;

-- Insert some sample report categories for reference
COMMENT ON COLUMN user_reports.category IS 'Report categories: technical (app bugs, performance), player (cancellations, no-shows), other (general issues)';
COMMENT ON COLUMN user_reports.status IS 'Report status: open (new), in_progress (being handled), resolved (fixed), closed (completed)';
COMMENT ON COLUMN user_reports.priority IS 'Priority levels: low, medium, high, urgent (auto-assigned based on category)';
COMMENT ON TABLE user_report_limits IS 'Rate limiting table: max 3 reports per user per day';

-- Create notification trigger for new reports
CREATE OR REPLACE FUNCTION notify_admins_new_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for admins when new report is created
  INSERT INTO notifications (user_id, type, title, content, data, is_read)
  SELECT 
    id,
    'new_report',
    'New User Report',
    'New ' || NEW.category || ' report: ' || NEW.title,
    json_build_object('reportId', NEW.id, 'category', NEW.category),
    false
  FROM auth.users 
  WHERE email LIKE '%@admin.sportea.com'; -- Adjust admin identification as needed
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_admins_on_new_report
  AFTER INSERT ON user_reports
  FOR EACH ROW EXECUTE FUNCTION notify_admins_new_report();
