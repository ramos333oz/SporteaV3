-- ML Integration for Content Moderation System Migration
-- This migration adds ML-specific configuration fields and updates the system for Hugging Face integration

-- 1. Add ML-specific configuration fields to content_moderation_settings
ALTER TABLE content_moderation_settings 
ADD COLUMN IF NOT EXISTS ml_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ml_confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS ml_timeout_ms INTEGER DEFAULT 5000,
ADD COLUMN IF NOT EXISTS ml_primary_model TEXT DEFAULT 'unitary/toxic-bert',
ADD COLUMN IF NOT EXISTS ml_fallback_model TEXT DEFAULT 'martin-ha/toxic-comment-model';

-- 2. Add ML performance tracking fields to content_moderation_results
ALTER TABLE content_moderation_results 
ADD COLUMN IF NOT EXISTS ml_model_used TEXT,
ADD COLUMN IF NOT EXISTS ml_confidence_score DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS ml_fallback_used BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ml_processing_time_ms INTEGER;

-- 3. Update content_moderation_settings for ML-enabled toxic-only focus
UPDATE content_moderation_settings SET 
  toxic_model_weight = 1.0,
  consistency_model_weight = 0.0,
  sports_validation_weight = 0.0,
  simplified_mode = true,
  ml_enabled = true,
  ml_confidence_threshold = 0.7,
  ml_timeout_ms = 5000,
  ml_primary_model = 'unitary/toxic-bert',
  ml_fallback_model = 'martin-ha/toxic-comment-model'
WHERE id IS NOT NULL;

-- 4. Insert default ML settings if no settings exist
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
  strict_mode,
  ml_enabled,
  ml_confidence_threshold,
  ml_timeout_ms,
  ml_primary_model,
  ml_fallback_model
) 
SELECT 
  0.8, 0.5, 0.2, 0.3, 
  true, true, 
  1.0, 0.0, 0.0, 
  true, true, false,
  true, 0.7, 5000,
  'unitary/toxic-bert', 'martin-ha/toxic-comment-model'
WHERE NOT EXISTS (SELECT 1 FROM content_moderation_settings);

-- 5. Create ML performance monitoring view
CREATE OR REPLACE VIEW ml_moderation_performance AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_processed,
  COUNT(CASE WHEN ml_model_used LIKE '%toxic-bert%' THEN 1 END) as primary_model_used,
  COUNT(CASE WHEN ml_model_used LIKE '%toxic-comment-model%' THEN 1 END) as fallback_model_used,
  COUNT(CASE WHEN ml_model_used = 'rule-based-fallback' THEN 1 END) as rule_based_fallback,
  COUNT(CASE WHEN ml_fallback_used = true THEN 1 END) as total_fallbacks,
  AVG(ml_processing_time_ms) as avg_ml_processing_time,
  AVG(processing_time_ms) as avg_total_processing_time,
  AVG(inappropriate_score) as avg_toxic_score,
  COUNT(CASE WHEN overall_risk_level = 'high' THEN 1 END) as high_risk_count,
  COUNT(CASE WHEN overall_risk_level = 'medium' THEN 1 END) as medium_risk_count,
  COUNT(CASE WHEN overall_risk_level = 'low' THEN 1 END) as low_risk_count,
  COUNT(CASE WHEN overall_risk_level = 'minimal' THEN 1 END) as minimal_risk_count,
  ROUND(
    COUNT(CASE WHEN ml_fallback_used = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100, 
    2
  ) as fallback_rate_percent
FROM content_moderation_results 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 6. Create ML configuration validation function
CREATE OR REPLACE FUNCTION validate_ml_configuration()
RETURNS TABLE (
  setting_name TEXT,
  current_value TEXT,
  is_valid BOOLEAN,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'ml_enabled'::TEXT,
    ml_enabled::TEXT,
    ml_enabled IS NOT NULL,
    CASE 
      WHEN ml_enabled IS NULL THEN 'Set ml_enabled to true or false'
      WHEN ml_enabled = false THEN 'Consider enabling ML for better accuracy'
      ELSE 'Configuration is valid'
    END
  FROM content_moderation_settings
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    'ml_confidence_threshold'::TEXT,
    ml_confidence_threshold::TEXT,
    ml_confidence_threshold BETWEEN 0.1 AND 1.0,
    CASE 
      WHEN ml_confidence_threshold IS NULL THEN 'Set threshold between 0.1 and 1.0'
      WHEN ml_confidence_threshold < 0.1 THEN 'Threshold too low, recommend 0.3-0.8'
      WHEN ml_confidence_threshold > 1.0 THEN 'Threshold too high, recommend 0.3-0.8'
      WHEN ml_confidence_threshold BETWEEN 0.3 AND 0.8 THEN 'Optimal threshold range'
      ELSE 'Consider adjusting to 0.3-0.8 range'
    END
  FROM content_moderation_settings
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    'toxic_model_weight'::TEXT,
    toxic_model_weight::TEXT,
    toxic_model_weight = 1.0,
    CASE 
      WHEN toxic_model_weight = 1.0 THEN 'Correctly configured for toxic-only focus'
      ELSE 'Should be 1.0 for toxic-only focus as per user preference'
    END
  FROM content_moderation_settings
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    'simplified_mode'::TEXT,
    simplified_mode::TEXT,
    simplified_mode = true,
    CASE 
      WHEN simplified_mode = true THEN 'Correctly configured for simplified mode'
      ELSE 'Should be true for toxic-only focus as per user preference'
    END
  FROM content_moderation_settings
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 7. Create ML performance summary function
CREATE OR REPLACE FUNCTION get_ml_performance_summary(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  metric_name TEXT,
  metric_value TEXT,
  status TEXT
) AS $$
DECLARE
  total_processed INTEGER;
  fallback_rate DECIMAL;
  avg_processing_time DECIMAL;
  high_risk_rate DECIMAL;
BEGIN
  -- Get basic metrics
  SELECT 
    COUNT(*),
    ROUND(COUNT(CASE WHEN ml_fallback_used = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100, 2),
    ROUND(AVG(ml_processing_time_ms), 2),
    ROUND(COUNT(CASE WHEN overall_risk_level = 'high' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100, 2)
  INTO total_processed, fallback_rate, avg_processing_time, high_risk_rate
  FROM content_moderation_results 
  WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back;
  
  -- Return metrics
  RETURN QUERY VALUES 
    ('Total Processed', total_processed::TEXT, 
     CASE WHEN total_processed > 0 THEN 'Active' ELSE 'No Activity' END),
    ('ML Fallback Rate', fallback_rate::TEXT || '%', 
     CASE WHEN fallback_rate < 5 THEN 'Excellent' 
          WHEN fallback_rate < 15 THEN 'Good' 
          ELSE 'Needs Attention' END),
    ('Avg Processing Time', avg_processing_time::TEXT || 'ms', 
     CASE WHEN avg_processing_time < 2000 THEN 'Fast' 
          WHEN avg_processing_time < 5000 THEN 'Acceptable' 
          ELSE 'Slow' END),
    ('High Risk Detection Rate', high_risk_rate::TEXT || '%', 
     CASE WHEN high_risk_rate < 5 THEN 'Low Risk Content' 
          WHEN high_risk_rate < 15 THEN 'Moderate Risk Content' 
          ELSE 'High Risk Content Detected' END);
END;
$$ LANGUAGE plpgsql;

-- 8. Add comments for documentation
COMMENT ON COLUMN content_moderation_settings.ml_enabled IS 'Enable/disable ML models for content moderation';
COMMENT ON COLUMN content_moderation_settings.ml_confidence_threshold IS 'Confidence threshold for ML model predictions (0.0-1.0)';
COMMENT ON COLUMN content_moderation_settings.ml_timeout_ms IS 'Timeout for ML API calls in milliseconds';
COMMENT ON COLUMN content_moderation_settings.ml_primary_model IS 'Primary Hugging Face model name (e.g., unitary/toxic-bert)';
COMMENT ON COLUMN content_moderation_settings.ml_fallback_model IS 'Fallback Hugging Face model name';

COMMENT ON COLUMN content_moderation_results.ml_model_used IS 'Name of the ML model that was actually used for this prediction';
COMMENT ON COLUMN content_moderation_results.ml_confidence_score IS 'Confidence score from the ML model (0.0-1.0)';
COMMENT ON COLUMN content_moderation_results.ml_fallback_used IS 'Whether fallback mechanism was triggered';
COMMENT ON COLUMN content_moderation_results.ml_processing_time_ms IS 'Time taken by ML model processing only';

COMMENT ON VIEW ml_moderation_performance IS 'Daily performance metrics for ML-powered content moderation';
COMMENT ON FUNCTION validate_ml_configuration() IS 'Validates current ML configuration settings';
COMMENT ON FUNCTION get_ml_performance_summary(INTEGER) IS 'Returns ML performance summary for specified number of days';

-- 9. Grant necessary permissions
GRANT SELECT ON ml_moderation_performance TO authenticated;
GRANT EXECUTE ON FUNCTION validate_ml_configuration() TO authenticated;
GRANT EXECUTE ON FUNCTION get_ml_performance_summary(INTEGER) TO authenticated;

-- 10. Log migration completion
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
  '20250113_ml_integration_content_moderation',
  NOW(),
  'Added ML integration with Hugging Face toxic-bert, implemented toxic-only focus, and added performance monitoring'
) ON CONFLICT (migration_name) DO UPDATE SET 
  applied_at = NOW(),
  description = EXCLUDED.description;
