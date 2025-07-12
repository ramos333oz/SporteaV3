-- Content Moderation System Database Schema
-- This migration adds tables and functions for ML-powered content moderation

-- Create content moderation results table
CREATE TABLE IF NOT EXISTS content_moderation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  
  -- ML Model Results
  inappropriate_score DECIMAL(5, 4) DEFAULT 0, -- 0.0000 to 1.0000
  consistency_score DECIMAL(5, 4) DEFAULT 0,   -- 0.0000 to 1.0000
  sports_validation_score DECIMAL(5, 4) DEFAULT 0, -- 0.0000 to 1.0000
  
  -- Overall Risk Assessment
  overall_risk_level TEXT NOT NULL CHECK (overall_risk_level IN ('minimal', 'low', 'medium', 'high')),
  
  -- Automatic Actions
  auto_approved BOOLEAN DEFAULT FALSE,
  requires_review BOOLEAN DEFAULT FALSE,
  
  -- Detailed Analysis
  flagged_content JSONB, -- Store specific flagged phrases/words
  model_confidence JSONB, -- Store confidence scores from each model
  processing_time_ms INTEGER, -- Track performance
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create admin review queue table
CREATE TABLE IF NOT EXISTS admin_review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  moderation_result_id UUID REFERENCES content_moderation_results(id) ON DELETE CASCADE NOT NULL,
  
  -- Queue Management
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'escalated')),
  
  -- Assignment
  assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin Actions
  admin_decision TEXT CHECK (admin_decision IN ('approve', 'reject', 'request_changes', 'escalate')),
  admin_notes TEXT,
  admin_action_reason TEXT,
  
  -- User Communication
  user_notified BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create content moderation settings table for configuration
CREATE TABLE IF NOT EXISTS content_moderation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Threshold Configuration
  high_risk_threshold DECIMAL(5, 4) DEFAULT 0.8000,
  medium_risk_threshold DECIMAL(5, 4) DEFAULT 0.5000,
  low_risk_threshold DECIMAL(5, 4) DEFAULT 0.2000,
  
  -- Auto-action Settings
  auto_reject_high_risk BOOLEAN DEFAULT TRUE,
  auto_approve_minimal_risk BOOLEAN DEFAULT TRUE,
  
  -- Model Configuration
  toxic_model_weight DECIMAL(3, 2) DEFAULT 0.60, -- 60% weight for toxicity
  consistency_model_weight DECIMAL(3, 2) DEFAULT 0.25, -- 25% weight for consistency
  sports_validation_weight DECIMAL(3, 2) DEFAULT 0.15, -- 15% weight for sports validation
  
  -- Performance Settings
  max_processing_time_ms INTEGER DEFAULT 5000,
  enable_caching BOOLEAN DEFAULT TRUE,
  cache_duration_hours INTEGER DEFAULT 24,
  
  -- Feature Flags
  moderation_enabled BOOLEAN DEFAULT TRUE,
  strict_mode BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default settings
INSERT INTO content_moderation_settings (id) 
VALUES (uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_moderation_results_match_id ON content_moderation_results(match_id);
CREATE INDEX IF NOT EXISTS idx_content_moderation_results_risk_level ON content_moderation_results(overall_risk_level);
CREATE INDEX IF NOT EXISTS idx_content_moderation_results_created_at ON content_moderation_results(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_review_queue_status ON admin_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_priority ON admin_review_queue(priority);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_assigned_admin ON admin_review_queue(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_created_at ON admin_review_queue(created_at);

-- Create function to automatically set priority based on risk level
CREATE OR REPLACE FUNCTION set_review_priority()
RETURNS TRIGGER AS $$
BEGIN
  -- Set priority based on moderation result risk level
  SELECT 
    CASE 
      WHEN cmr.overall_risk_level = 'high' THEN 'urgent'
      WHEN cmr.overall_risk_level = 'medium' THEN 'high'
      WHEN cmr.overall_risk_level = 'low' THEN 'medium'
      ELSE 'low'
    END INTO NEW.priority
  FROM content_moderation_results cmr
  WHERE cmr.id = NEW.moderation_result_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set priority
CREATE TRIGGER trigger_set_review_priority
  BEFORE INSERT ON admin_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION set_review_priority();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_content_moderation_results_updated_at
  BEFORE UPDATE ON content_moderation_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_admin_review_queue_updated_at
  BEFORE UPDATE ON admin_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_content_moderation_settings_updated_at
  BEFORE UPDATE ON content_moderation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies for security
ALTER TABLE content_moderation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_moderation_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can access moderation results
CREATE POLICY "Admin access to moderation results" ON content_moderation_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can access review queue
CREATE POLICY "Admin access to review queue" ON admin_review_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can access moderation settings
CREATE POLICY "Admin access to moderation settings" ON content_moderation_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create view for admin dashboard
CREATE OR REPLACE VIEW admin_moderation_dashboard AS
SELECT 
  arq.id as queue_id,
  arq.priority,
  arq.status,
  arq.assigned_admin_id,
  arq.created_at as queued_at,
  arq.admin_notes,
  
  m.id as match_id,
  m.title as match_title,
  m.description as match_description,
  m.host_id,
  u.username as host_username,
  
  cmr.overall_risk_level,
  cmr.inappropriate_score,
  cmr.consistency_score,
  cmr.sports_validation_score,
  cmr.flagged_content,
  cmr.auto_approved,
  cmr.requires_review
  
FROM admin_review_queue arq
JOIN content_moderation_results cmr ON arq.moderation_result_id = cmr.id
JOIN matches m ON arq.match_id = m.id
JOIN users u ON m.host_id = u.id
ORDER BY 
  CASE arq.priority 
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  arq.created_at ASC;

-- Grant access to the view for admins
GRANT SELECT ON admin_moderation_dashboard TO authenticated;
