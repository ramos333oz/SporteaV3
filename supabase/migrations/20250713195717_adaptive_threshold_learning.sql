-- =====================================================
-- Adaptive Threshold Learning Database Schema
-- SporteaV3 Content Moderation Enhancement
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ADAPTIVE THRESHOLD HISTORY TABLE
-- =====================================================
-- Tracks all threshold changes over time with full audit trail
CREATE TABLE IF NOT EXISTS adaptive_threshold_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Context Information
    context_type VARCHAR(50) NOT NULL CHECK (context_type IN (
        'global', 'sport_specific', 'user_pattern', 'time_based', 'content_type'
    )),
    context_value VARCHAR(100), -- sport_id, user_pattern_id, time_period, etc.
    context_metadata JSONB, -- Additional context information

    -- Threshold Details
    threshold_type VARCHAR(30) NOT NULL CHECK (threshold_type IN (
        'high_risk', 'medium_risk', 'low_risk', 'ml_confidence'
    )),
    old_value DECIMAL(5, 4) NOT NULL CHECK (old_value >= 0 AND old_value <= 1),
    new_value DECIMAL(5, 4) NOT NULL CHECK (new_value >= 0 AND new_value <= 1),
    adjustment_magnitude DECIMAL(5, 4) GENERATED ALWAYS AS (ABS(new_value - old_value)) STORED,

    -- Learning Algorithm Information
    algorithm_version VARCHAR(20) DEFAULT 'v1.0',
    learning_signal_strength DECIMAL(5, 4), -- How strong the signal was (0-1)
    confidence_score DECIMAL(5, 4), -- Algorithm confidence in this adjustment
    exploration_factor DECIMAL(5, 4), -- Exploration vs exploitation balance

    -- Feedback Information
    admin_feedback_count INTEGER DEFAULT 0,
    positive_feedback_count INTEGER DEFAULT 0,
    negative_feedback_count INTEGER DEFAULT 0,
    adjustment_reason TEXT,

    -- Performance Tracking
    expected_improvement DECIMAL(5, 4), -- Predicted improvement
    actual_improvement DECIMAL(5, 4), -- Measured improvement (updated later)

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by VARCHAR(50) DEFAULT 'adaptive_learning_system'
);

-- Create indexes for adaptive_threshold_history
CREATE INDEX IF NOT EXISTS idx_threshold_history_context ON adaptive_threshold_history(context_type, context_value);
CREATE INDEX IF NOT EXISTS idx_threshold_history_time ON adaptive_threshold_history(created_at);
CREATE INDEX IF NOT EXISTS idx_threshold_history_type ON adaptive_threshold_history(threshold_type);

-- =====================================================
-- 2. USER BEHAVIOR PATTERNS TABLE
-- =====================================================
-- Stores user content patterns for contextual learning
CREATE TABLE IF NOT EXISTS user_behavior_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

    -- Pattern Identification
    content_pattern_hash VARCHAR(64) UNIQUE NOT NULL, -- Hash of content characteristics
    pattern_name VARCHAR(100), -- Human-readable pattern name

    -- Submission Statistics
    total_submissions INTEGER DEFAULT 0 CHECK (total_submissions >= 0),
    admin_approvals INTEGER DEFAULT 0 CHECK (admin_approvals >= 0),
    admin_rejections INTEGER DEFAULT 0 CHECK (admin_rejections >= 0),
    auto_approvals INTEGER DEFAULT 0 CHECK (auto_approvals >= 0),
    auto_rejections INTEGER DEFAULT 0 CHECK (auto_rejections >= 0),

    -- Performance Metrics
    false_positive_rate DECIMAL(5, 4) DEFAULT 0 CHECK (false_positive_rate >= 0 AND false_positive_rate <= 1),
    false_negative_rate DECIMAL(5, 4) DEFAULT 0 CHECK (false_negative_rate >= 0 AND false_negative_rate <= 1),
    accuracy_score DECIMAL(5, 4) DEFAULT 0 CHECK (accuracy_score >= 0 AND accuracy_score <= 1),

    -- Content Characteristics
    content_characteristics JSONB NOT NULL DEFAULT '{}', -- Sports terms, language patterns, etc.
    language_distribution JSONB DEFAULT '{}', -- English/Malay ratio
    sports_categories JSONB DEFAULT '[]', -- Associated sports
    toxicity_patterns JSONB DEFAULT '{}', -- Historical toxicity scores

    -- Learning Metadata
    learning_confidence DECIMAL(5, 4) DEFAULT 0, -- How confident we are in this pattern
    last_threshold_adjustment TIMESTAMP WITH TIME ZONE,
    adjustment_count INTEGER DEFAULT 0,

    -- Timestamps
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    -- Computed columns
    approval_rate DECIMAL(5, 4) GENERATED ALWAYS AS (
        CASE
            WHEN (admin_approvals + admin_rejections) > 0
            THEN admin_approvals::DECIMAL / (admin_approvals + admin_rejections)
            ELSE 0
        END
    ) STORED
);

-- Create indexes for user_behavior_patterns
CREATE INDEX IF NOT EXISTS idx_user_behavior_user ON user_behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_pattern ON user_behavior_patterns(content_pattern_hash);
CREATE INDEX IF NOT EXISTS idx_user_behavior_updated ON user_behavior_patterns(last_updated);
CREATE INDEX IF NOT EXISTS idx_user_behavior_confidence ON user_behavior_patterns(learning_confidence);

-- =====================================================
-- 3. LEARNING PARAMETERS TABLE
-- =====================================================
-- Configuration for adaptive learning algorithm
CREATE TABLE IF NOT EXISTS learning_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Parameter Identification
    parameter_name VARCHAR(50) UNIQUE NOT NULL,
    parameter_value DECIMAL(10, 6) NOT NULL,
    parameter_type VARCHAR(20) NOT NULL CHECK (parameter_type IN (
        'learning_rate', 'exploration_rate', 'decay_factor', 'confidence_threshold',
        'adjustment_limit', 'feedback_weight', 'time_decay', 'safety_bound'
    )),

    -- Context and Scope
    context_scope VARCHAR(30) DEFAULT 'global' CHECK (context_scope IN (
        'global', 'sport_specific', 'user_specific', 'time_specific'
    )),
    scope_identifier VARCHAR(100), -- Specific sport, user group, time period

    -- Parameter Constraints
    min_value DECIMAL(10, 6),
    max_value DECIMAL(10, 6),
    default_value DECIMAL(10, 6) NOT NULL,

    -- Metadata
    description TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_by UUID REFERENCES users(id),
    version INTEGER DEFAULT 1,

    -- Validation constraints
    CHECK (parameter_value >= COALESCE(min_value, parameter_value)),
    CHECK (parameter_value <= COALESCE(max_value, parameter_value))
);

-- Create indexes for learning_parameters
CREATE INDEX IF NOT EXISTS idx_learning_params_name ON learning_parameters(parameter_name);
CREATE INDEX IF NOT EXISTS idx_learning_params_scope ON learning_parameters(context_scope, scope_identifier);

-- =====================================================
-- 4. THRESHOLD CONTEXTS TABLE
-- =====================================================
-- Context-specific threshold management
CREATE TABLE IF NOT EXISTS threshold_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Context Definition
    context_type VARCHAR(50) NOT NULL CHECK (context_type IN (
        'sport_category', 'user_reputation', 'time_period', 'content_length',
        'language_mix', 'user_history', 'seasonal'
    )),
    context_identifier VARCHAR(100) NOT NULL, -- Specific sport, reputation level, etc.
    context_description TEXT,

    -- Dynamic Thresholds
    high_risk_threshold DECIMAL(5, 4) DEFAULT 0.8000 CHECK (high_risk_threshold >= 0 AND high_risk_threshold <= 1),
    medium_risk_threshold DECIMAL(5, 4) DEFAULT 0.5000 CHECK (medium_risk_threshold >= 0 AND medium_risk_threshold <= 1),
    low_risk_threshold DECIMAL(5, 4) DEFAULT 0.2000 CHECK (low_risk_threshold >= 0 AND low_risk_threshold <= 1),

    -- Learning Configuration
    learning_enabled BOOLEAN DEFAULT TRUE,
    learning_rate DECIMAL(5, 4) DEFAULT 0.1000,
    min_feedback_count INTEGER DEFAULT 10, -- Minimum feedback before adjustments

    -- Performance Metrics
    performance_metrics JSONB DEFAULT '{}', -- Accuracy, false positive rate, etc.
    total_decisions INTEGER DEFAULT 0,
    correct_decisions INTEGER DEFAULT 0,
    last_performance_update TIMESTAMP WITH TIME ZONE,

    -- Safety Bounds
    max_adjustment_per_cycle DECIMAL(5, 4) DEFAULT 0.0500, -- Maximum change per learning cycle
    safety_override_enabled BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    -- Validation constraints
    CHECK (high_risk_threshold >= medium_risk_threshold),
    CHECK (medium_risk_threshold >= low_risk_threshold),

    -- Unique constraint
    UNIQUE (context_type, context_identifier)
);

-- Create indexes for threshold_contexts
CREATE INDEX IF NOT EXISTS idx_threshold_contexts_type ON threshold_contexts(context_type);
CREATE INDEX IF NOT EXISTS idx_threshold_contexts_learning ON threshold_contexts(learning_enabled);
CREATE INDEX IF NOT EXISTS idx_threshold_contexts_updated ON threshold_contexts(updated_at);

-- =====================================================
-- 5. LEARNING FEEDBACK SIGNALS TABLE
-- =====================================================
-- Captures all learning signals for algorithm training
CREATE TABLE IF NOT EXISTS learning_feedback_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source Information
    moderation_result_id UUID REFERENCES content_moderation_results(id) ON DELETE CASCADE,
    queue_item_id UUID REFERENCES content_moderation_queue(id) ON DELETE CASCADE,

    -- Signal Details
    signal_type VARCHAR(30) NOT NULL CHECK (signal_type IN (
        'admin_approval', 'admin_rejection', 'user_appeal', 'false_positive',
        'false_negative', 'threshold_test', 'manual_override'
    )),
    signal_strength DECIMAL(5, 4) NOT NULL CHECK (signal_strength >= 0 AND signal_strength <= 1),
    confidence_level DECIMAL(5, 4) NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 1),

    -- Context at Time of Signal
    original_threshold DECIMAL(5, 4),
    original_score DECIMAL(5, 4),
    context_id UUID REFERENCES threshold_contexts(id),
    user_pattern_id UUID REFERENCES user_behavior_patterns(id),

    -- Learning Impact
    processed BOOLEAN DEFAULT FALSE,
    processing_timestamp TIMESTAMP WITH TIME ZONE,
    threshold_adjustment_applied DECIMAL(5, 4), -- Actual adjustment made

    -- Metadata
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for learning_feedback_signals
CREATE INDEX IF NOT EXISTS idx_feedback_signals_type ON learning_feedback_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_processed ON learning_feedback_signals(processed);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_time ON learning_feedback_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_signals_context ON learning_feedback_signals(context_id);

-- =====================================================
-- 6. MODIFY EXISTING TABLES
-- =====================================================

-- Add adaptive learning fields to content_moderation_settings
ALTER TABLE content_moderation_settings
ADD COLUMN IF NOT EXISTS adaptive_learning_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS learning_rate DECIMAL(5, 4) DEFAULT 0.1000,
ADD COLUMN IF NOT EXISTS exploration_rate DECIMAL(5, 4) DEFAULT 0.2000,
ADD COLUMN IF NOT EXISTS min_feedback_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_threshold_adjustment DECIMAL(5, 4) DEFAULT 0.1000,
ADD COLUMN IF NOT EXISTS safety_bounds_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS learning_algorithm_version VARCHAR(20) DEFAULT 'v1.0';

-- Add learning signals to content_moderation_queue
ALTER TABLE content_moderation_queue
ADD COLUMN IF NOT EXISTS learning_signal_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS threshold_context_id UUID REFERENCES threshold_contexts(id),
ADD COLUMN IF NOT EXISTS user_pattern_id UUID REFERENCES user_behavior_patterns(id),
ADD COLUMN IF NOT EXISTS adaptive_threshold_used DECIMAL(5, 4),
ADD COLUMN IF NOT EXISTS learning_confidence DECIMAL(5, 4);

-- Add adaptive learning metadata to content_moderation_results
ALTER TABLE content_moderation_results
ADD COLUMN IF NOT EXISTS threshold_context_used UUID REFERENCES threshold_contexts(id),
ADD COLUMN IF NOT EXISTS adaptive_thresholds_applied JSONB,
ADD COLUMN IF NOT EXISTS learning_metadata JSONB DEFAULT '{}';

-- =====================================================
-- 7. INITIAL DATA SETUP
-- =====================================================

-- Insert default learning parameters
INSERT INTO learning_parameters (parameter_name, parameter_value, parameter_type, description) VALUES
('global_learning_rate', 0.1000, 'learning_rate', 'Base learning rate for threshold adjustments'),
('exploration_rate', 0.2000, 'exploration_rate', 'Exploration vs exploitation balance'),
('confidence_threshold', 0.7000, 'confidence_threshold', 'Minimum confidence for threshold adjustments'),
('max_adjustment_per_cycle', 0.0500, 'adjustment_limit', 'Maximum threshold change per learning cycle'),
('feedback_weight_admin', 1.0000, 'feedback_weight', 'Weight for admin feedback signals'),
('feedback_weight_user', 0.5000, 'feedback_weight', 'Weight for user appeal signals'),
('time_decay_factor', 0.9500, 'decay_factor', 'Time-based decay for old feedback'),
('safety_bound_high', 0.9500, 'safety_bound', 'Upper safety bound for high risk threshold'),
('safety_bound_low', 0.0500, 'safety_bound', 'Lower safety bound for low risk threshold')
ON CONFLICT (parameter_name) DO NOTHING;

-- Insert default threshold contexts
INSERT INTO threshold_contexts (context_type, context_identifier, context_description) VALUES
('sport_category', 'football', 'Football/Soccer matches with competitive language'),
('sport_category', 'basketball', 'Basketball matches with competitive terminology'),
('sport_category', 'badminton', 'Badminton matches - typically less aggressive language'),
('sport_category', 'futsal', 'Futsal matches with indoor competitive dynamics'),
('user_reputation', 'new_user', 'Users with less than 5 successful matches'),
('user_reputation', 'experienced_user', 'Users with 10+ successful matches'),
('user_reputation', 'regular_user', 'Users with 5-9 successful matches'),
('time_period', 'peak_hours', 'High activity periods (7-10 PM)'),
('time_period', 'day_hours', 'Regular day hours (7 AM - 6 PM)'),
('time_period', 'off_hours', 'Low activity periods (10 PM - 7 AM)'),
('language_mix', 'english_primary', 'Primarily English content'),
('language_mix', 'malay_primary', 'Primarily Malay content'),
('language_mix', 'mixed_language', 'Mixed English-Malay content')
ON CONFLICT (context_type, context_identifier) DO NOTHING;

-- =====================================================
-- 8. ADDITIONAL INDEXES AND PERFORMANCE OPTIMIZATION
-- =====================================================

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_moderation_results_adaptive ON content_moderation_results(threshold_context_used, created_at);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_adaptive ON content_moderation_queue(threshold_context_id, learning_signal_processed);

-- Partial indexes for active learning
CREATE INDEX IF NOT EXISTS idx_active_learning_contexts ON threshold_contexts(id) WHERE learning_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_unprocessed_signals ON learning_feedback_signals(id) WHERE processed = FALSE;

-- =====================================================
-- 9. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamp trigger for threshold_contexts
CREATE OR REPLACE FUNCTION update_threshold_contexts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_threshold_contexts_timestamp
    BEFORE UPDATE ON threshold_contexts
    FOR EACH ROW
    EXECUTE FUNCTION update_threshold_contexts_timestamp();

-- Update user behavior patterns trigger
CREATE OR REPLACE FUNCTION update_user_behavior_patterns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_behavior_patterns_timestamp
    BEFORE UPDATE ON user_behavior_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_user_behavior_patterns_timestamp();

-- =====================================================
-- 10. VIEWS FOR EASY ACCESS
-- =====================================================

-- View for current active thresholds by context
CREATE OR REPLACE VIEW active_threshold_contexts AS
SELECT
    tc.*,
    COUNT(ath.id) as adjustment_count,
    MAX(ath.created_at) as last_adjustment,
    AVG(ath.adjustment_magnitude) as avg_adjustment_magnitude
FROM threshold_contexts tc
LEFT JOIN adaptive_threshold_history ath ON tc.id::text = ath.context_value
WHERE tc.learning_enabled = TRUE
GROUP BY tc.id;

-- View for learning performance metrics
CREATE OR REPLACE VIEW learning_performance_summary AS
SELECT
    context_type,
    COUNT(*) as total_contexts,
    AVG(high_risk_threshold) as avg_high_threshold,
    AVG(medium_risk_threshold) as avg_medium_threshold,
    AVG(low_risk_threshold) as avg_low_threshold,
    AVG((performance_metrics->>'accuracy')::DECIMAL) as avg_accuracy,
    AVG(total_decisions) as avg_decisions
FROM threshold_contexts
WHERE learning_enabled = TRUE
GROUP BY context_type;

-- Enable adaptive learning by default
UPDATE content_moderation_settings
SET adaptive_learning_enabled = true,
    learning_rate = 0.1000,
    exploration_rate = 0.2000,
    min_feedback_threshold = 10,
    max_threshold_adjustment = 0.0500,
    safety_bounds_enabled = true,
    learning_algorithm_version = 'v1.0'
WHERE id = (SELECT id FROM content_moderation_settings LIMIT 1);

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================