-- Enhanced Content Moderation System Migration
-- This migration implements the simplified, toxic-only moderation system with automatic queueing

-- 1. Add moderation_status to matches table for optimistic approval workflow
ALTER TABLE matches ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected'));

-- 2. Add automatic queueing threshold to content_moderation_settings
ALTER TABLE content_moderation_settings ADD COLUMN IF NOT EXISTS auto_queue_threshold DECIMAL(3,2) DEFAULT 0.3;
ALTER TABLE content_moderation_settings ADD COLUMN IF NOT EXISTS simplified_mode BOOLEAN DEFAULT true;

-- 3. Update content_moderation_settings to reflect simplified algorithm (toxic detection only)
UPDATE content_moderation_settings SET 
  toxic_model_weight = 1.0,
  consistency_model_weight = 0.0,
  sports_validation_weight = 0.0,
  simplified_mode = true
WHERE id IS NOT NULL;

-- 4. Add warning_message field to admin_review_queue
ALTER TABLE admin_review_queue ADD COLUMN IF NOT EXISTS warning_message TEXT;

-- 5. Update admin_review_queue status constraints to include 'warned'
ALTER TABLE admin_review_queue DROP CONSTRAINT IF EXISTS admin_review_queue_status_check;
ALTER TABLE admin_review_queue ADD CONSTRAINT admin_review_queue_status_check 
  CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'escalated', 'warned'));

-- 6. Update admin_decision constraints to include 'warn'
ALTER TABLE admin_review_queue DROP CONSTRAINT IF EXISTS admin_review_queue_admin_decision_check;
ALTER TABLE admin_review_queue ADD CONSTRAINT admin_review_queue_admin_decision_check 
  CHECK (admin_decision IN ('approve', 'reject', 'request_changes', 'escalate', 'warn'));

-- 7. Add automatic_queue_triggered field to content_moderation_results
ALTER TABLE content_moderation_results ADD COLUMN IF NOT EXISTS automatic_queue_triggered BOOLEAN DEFAULT false;

-- 8. Create host_notifications table for notification system
CREATE TABLE IF NOT EXISTS host_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  moderation_result_id UUID REFERENCES content_moderation_results(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('warning', 'rejection', 'approval', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  warning_details JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_moderation_status ON matches(moderation_status);
CREATE INDEX IF NOT EXISTS idx_matches_host_moderation ON matches(host_id, moderation_status);
CREATE INDEX IF NOT EXISTS idx_host_notifications_host_unread ON host_notifications(host_id, is_read);
CREATE INDEX IF NOT EXISTS idx_host_notifications_match ON host_notifications(match_id);
CREATE INDEX IF NOT EXISTS idx_admin_queue_status_priority ON admin_review_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_content_moderation_auto_queue ON content_moderation_results(automatic_queue_triggered);

-- 10. Create updated admin dashboard view with new fields
DROP VIEW IF EXISTS admin_moderation_dashboard;
CREATE VIEW admin_moderation_dashboard AS
SELECT 
  arq.id as queue_id,
  arq.priority,
  arq.status,
  arq.assigned_admin_id,
  arq.created_at as queued_at,
  arq.admin_notes,
  arq.warning_message,
  arq.admin_decision,
  
  m.id as match_id,
  m.title as match_title,
  m.description as match_description,
  m.host_id,
  m.moderation_status as match_moderation_status,
  u.username as host_username,
  u.full_name as host_full_name,
  
  cmr.overall_risk_level,
  cmr.inappropriate_score,
  cmr.consistency_score,
  cmr.sports_validation_score,
  cmr.flagged_content,
  cmr.auto_approved,
  cmr.requires_review,
  cmr.automatic_queue_triggered,
  cmr.processing_time_ms,
  cmr.created_at as moderation_analyzed_at

FROM admin_review_queue arq
JOIN matches m ON arq.match_id = m.id
JOIN users u ON m.host_id = u.id
LEFT JOIN content_moderation_results cmr ON arq.moderation_result_id = cmr.id
ORDER BY 
  CASE arq.priority 
    WHEN 'urgent' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    WHEN 'low' THEN 4 
  END,
  arq.created_at DESC;

-- 11. Create function to automatically update match moderation status
CREATE OR REPLACE FUNCTION update_match_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update match status based on moderation result
  IF NEW.requires_review = true THEN
    UPDATE matches SET moderation_status = 'flagged' WHERE id = NEW.match_id;
  ELSIF NEW.auto_approved = true THEN
    UPDATE matches SET moderation_status = 'approved' WHERE id = NEW.match_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger to automatically update match status
DROP TRIGGER IF EXISTS trigger_update_match_moderation_status ON content_moderation_results;
CREATE TRIGGER trigger_update_match_moderation_status
  AFTER INSERT OR UPDATE ON content_moderation_results
  FOR EACH ROW
  EXECUTE FUNCTION update_match_moderation_status();

-- 13. Create function to handle admin decisions
CREATE OR REPLACE FUNCTION handle_admin_decision()
RETURNS TRIGGER AS $$
BEGIN
  -- Update match status based on admin decision
  IF NEW.admin_decision = 'approve' THEN
    UPDATE matches SET moderation_status = 'approved' WHERE id = NEW.match_id;
  ELSIF NEW.admin_decision = 'reject' THEN
    UPDATE matches SET moderation_status = 'rejected' WHERE id = NEW.match_id;
  ELSIF NEW.admin_decision = 'warn' THEN
    UPDATE matches SET moderation_status = 'approved' WHERE id = NEW.match_id;
  END IF;
  
  -- Update queue status and completion time - FIX: Set correct status based on decision
  NEW.status = CASE
    WHEN NEW.admin_decision = 'approve' THEN 'approved'
    WHEN NEW.admin_decision = 'reject' THEN 'rejected'
    WHEN NEW.admin_decision = 'warn' THEN 'approved'
    ELSE NEW.status
  END;
  NEW.completed_at = CASE 
    WHEN NEW.admin_decision IN ('approve', 'reject', 'warn') THEN NOW()
    ELSE NEW.completed_at
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create trigger for admin decisions
DROP TRIGGER IF EXISTS trigger_handle_admin_decision ON admin_review_queue;
CREATE TRIGGER trigger_handle_admin_decision
  BEFORE UPDATE ON admin_review_queue
  FOR EACH ROW
  WHEN (NEW.admin_decision IS DISTINCT FROM OLD.admin_decision AND NEW.admin_decision IS NOT NULL)
  EXECUTE FUNCTION handle_admin_decision();

-- 15. Create RLS policies for host_notifications
ALTER TABLE host_notifications ENABLE ROW LEVEL SECURITY;

-- Hosts can only see their own notifications
CREATE POLICY "Hosts can view own notifications" ON host_notifications
  FOR SELECT USING (host_id = auth.uid());

-- Hosts can update read status of their own notifications
CREATE POLICY "Hosts can update own notifications" ON host_notifications
  FOR UPDATE USING (host_id = auth.uid());

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications" ON host_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- 16. Update matches RLS to consider moderation_status
-- Matches are visible if they are not rejected (optimistic approval)
DROP POLICY IF EXISTS "Public matches are viewable by everyone" ON matches;
CREATE POLICY "Public matches are viewable by everyone" ON matches
  FOR SELECT USING (
    is_private = false 
    AND moderation_status != 'rejected'
  );

-- Hosts can always see their own matches regardless of moderation status
CREATE POLICY "Hosts can view own matches" ON matches
  FOR SELECT USING (host_id = auth.uid());

-- 17. Create helper function to get host deleted matches
CREATE OR REPLACE FUNCTION get_host_deleted_matches(host_user_id UUID)
RETURNS TABLE (
  match_id UUID,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  warning_message TEXT,
  flagged_content JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.description,
    m.created_at,
    arq.completed_at,
    arq.admin_notes,
    arq.warning_message,
    cmr.flagged_content
  FROM matches m
  JOIN admin_review_queue arq ON m.id = arq.match_id
  LEFT JOIN content_moderation_results cmr ON arq.moderation_result_id = cmr.id
  WHERE m.host_id = host_user_id 
    AND m.moderation_status = 'rejected'
    AND arq.admin_decision = 'reject'
  ORDER BY arq.completed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_host_deleted_matches(UUID) TO authenticated;

-- 19. Add comments for documentation
COMMENT ON COLUMN matches.moderation_status IS 'Moderation status: pending (initial), approved (safe), flagged (needs review), rejected (hidden)';
COMMENT ON COLUMN content_moderation_settings.auto_queue_threshold IS 'Threshold for automatic queueing (0.0-1.0)';
COMMENT ON COLUMN content_moderation_settings.simplified_mode IS 'Use simplified toxic-only moderation algorithm';
COMMENT ON COLUMN admin_review_queue.warning_message IS 'Custom warning message for hosts when using warn action';
COMMENT ON COLUMN content_moderation_results.automatic_queue_triggered IS 'Whether this result triggered automatic queueing';
COMMENT ON TABLE host_notifications IS 'Notification system for hosts about moderation decisions';

-- 20. Insert default notification settings if they don't exist
INSERT INTO content_moderation_settings (
  high_risk_threshold,
  medium_risk_threshold, 
  low_risk_threshold,
  auto_queue_threshold,
  auto_reject_high_risk,
  auto_approve_minimal_risk,
  toxic_model_weight,
  consistency_model_weight,
  sports_validation_weight,
  simplified_mode,
  moderation_enabled,
  strict_mode
) 
SELECT 0.8, 0.5, 0.2, 0.3, true, true, 1.0, 0.0, 0.0, true, true, false
WHERE NOT EXISTS (SELECT 1 FROM content_moderation_settings);
