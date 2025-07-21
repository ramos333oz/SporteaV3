-- Update ML Model Defaults to Reflect Current Implementation
-- This migration corrects the model configuration to match the actual confidence-based system
-- Date: January 20, 2025
-- Purpose: Align database defaults with XLM-RoBERTa + Enhanced Lexicon architecture

-- 1. Update existing content_moderation_settings to use correct models
UPDATE content_moderation_settings 
SET 
  ml_primary_model = 'unitary/multilingual-toxic-xlm-roberta',
  ml_fallback_model = 'enhanced-lexicon',
  ml_confidence_threshold = 0.5,  -- Updated to match confidence-based decision logic
  ml_timeout_ms = 4000,           -- Updated to match XLM-RoBERTa timeout in edge function
  simplified_mode = true          -- Ensure toxic-only focus is maintained
WHERE ml_primary_model = 'unitary/toxic-bert' 
   OR ml_primary_model IS NULL;

-- 2. Add system version tracking for the confidence-based implementation
ALTER TABLE content_moderation_settings 
ADD COLUMN IF NOT EXISTS system_version TEXT DEFAULT '3.0-confidence-based-fallback';

UPDATE content_moderation_settings 
SET system_version = '3.0-confidence-based-fallback'
WHERE system_version IS NULL;

-- 3. Add confidence-based processing metadata fields to content_moderation_results
ALTER TABLE content_moderation_results 
ADD COLUMN IF NOT EXISTS confidence_processing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS primary_model_used TEXT,
ADD COLUMN IF NOT EXISTS xlm_attempted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS xlm_confidence TEXT,
ADD COLUMN IF NOT EXISTS lexicon_score DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS fallback_reason TEXT;

-- 4. Create index for performance on new confidence-based fields
CREATE INDEX IF NOT EXISTS idx_content_moderation_confidence 
ON content_moderation_results(confidence_processing, primary_model_used);

-- 5. Update any existing records to reflect the new system
UPDATE content_moderation_results 
SET 
  confidence_processing = true,
  primary_model_used = CASE 
    WHEN ml_model_used LIKE '%xlm-roberta%' THEN 'xlm-roberta'
    WHEN ml_model_used LIKE '%lexicon%' OR ml_model_used LIKE '%rule-based%' THEN 'lexicon'
    ELSE 'unknown'
  END,
  xlm_attempted = CASE 
    WHEN ml_model_used LIKE '%xlm-roberta%' THEN true
    ELSE false
  END
WHERE confidence_processing IS NULL OR confidence_processing = false;

-- 6. Add comment to document the migration purpose
COMMENT ON TABLE content_moderation_settings IS 'Content moderation configuration with confidence-based XLM-RoBERTa + Enhanced Lexicon fallback system (v3.0)';
COMMENT ON COLUMN content_moderation_settings.ml_primary_model IS 'Primary ML model: unitary/multilingual-toxic-xlm-roberta for confidence-based detection';
COMMENT ON COLUMN content_moderation_settings.ml_fallback_model IS 'Fallback system: enhanced-lexicon for low-confidence scenarios';
COMMENT ON COLUMN content_moderation_settings.system_version IS 'Content moderation system version identifier';

-- 7. Verification query to confirm updates
-- Uncomment the following lines to verify the migration results:
/*
SELECT 
  ml_primary_model,
  ml_fallback_model,
  ml_confidence_threshold,
  ml_timeout_ms,
  system_version,
  simplified_mode
FROM content_moderation_settings;
*/
