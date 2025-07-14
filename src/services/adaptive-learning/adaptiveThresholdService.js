/**
 * Adaptive Threshold Learning Service
 * SporteaV3 Content Moderation Enhancement
 * 
 * This service implements a contextual multi-armed bandit algorithm for
 * adaptive threshold learning based on admin feedback and user behavior patterns.
 * 
 * Based on research from:
 * - Meta's contextual bandit approach for content moderation
 * - Academic studies on threshold optimization and human-AI collaboration
 * - Educational environment safety standards
 */

import { supabase } from '../supabase.js';

class AdaptiveThresholdService {
  constructor() {
    this.learningEnabled = true;
    this.algorithmVersion = 'v1.0';
    this.safetyBounds = {
      highRisk: { min: 0.7, max: 0.95 },
      mediumRisk: { min: 0.3, max: 0.8 },
      lowRisk: { min: 0.05, max: 0.5 }
    };
  }

  /**
   * Get adaptive thresholds for a specific context
   * @param {Object} context - Context information (sport, user, time, etc.)
   * @returns {Object} Threshold values for risk levels
   */
  async getAdaptiveThresholds(context) {
    try {
      console.log('[Adaptive Learning] Getting thresholds for context:', context);

      // Identify the most specific context match
      const contextMatch = await this.findBestContextMatch(context);
      
      if (contextMatch) {
        console.log('[Adaptive Learning] Using context-specific thresholds:', contextMatch.context_identifier);
        return {
          high_risk: contextMatch.high_risk_threshold,
          medium_risk: contextMatch.medium_risk_threshold,
          low_risk: contextMatch.low_risk_threshold,
          context_id: contextMatch.id,
          learning_enabled: contextMatch.learning_enabled
        };
      }

      // Fallback to global defaults
      console.log('[Adaptive Learning] Using global default thresholds');
      return await this.getGlobalThresholds();

    } catch (error) {
      console.error('[Adaptive Learning] Error getting thresholds:', error);
      // Safety fallback to static thresholds
      return {
        high_risk: 0.8,
        medium_risk: 0.5,
        low_risk: 0.2,
        context_id: null,
        learning_enabled: false
      };
    }
  }

  /**
   * Process admin feedback to adjust thresholds
   * @param {Object} feedbackData - Admin decision and context
   */
  async processFeedback(feedbackData) {
    try {
      const {
        moderationResultId,
        queueItemId,
        adminDecision, // 'approve', 'reject'
        originalScore,
        originalThreshold,
        contextId,
        userPatternId,
        adminNotes
      } = feedbackData;

      console.log('[Adaptive Learning] Processing feedback:', {
        decision: adminDecision,
        score: originalScore,
        threshold: originalThreshold
      });

      // Create learning signal
      const signal = await this.createLearningSignal({
        moderationResultId,
        queueItemId,
        signalType: adminDecision === 'approve' ? 'admin_approval' : 'admin_rejection',
        originalScore,
        originalThreshold,
        contextId,
        userPatternId,
        adminNotes
      });

      // Calculate threshold adjustment
      const adjustment = await this.calculateThresholdAdjustment(signal);

      if (adjustment && Math.abs(adjustment.magnitude) > 0.001) {
        await this.applyThresholdAdjustment(adjustment);
        console.log('[Adaptive Learning] Applied threshold adjustment:', adjustment);
      }

      // Update user behavior pattern
      if (userPatternId) {
        await this.updateUserBehaviorPattern(userPatternId, adminDecision);
      }

      return { success: true, adjustment };

    } catch (error) {
      console.error('[Adaptive Learning] Error processing feedback:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find the best matching context for given parameters
   * @param {Object} context - Context parameters
   * @returns {Object|null} Best matching context
   */
  async findBestContextMatch(context) {
    const { sport_id, user_id, content_length, language_mix, time_period } = context;

    // Priority order: sport_specific > user_pattern > time_based > language_mix
    const contextQueries = [
      { type: 'sport_category', identifier: sport_id },
      { type: 'user_reputation', identifier: await this.getUserReputationLevel(user_id) },
      { type: 'time_period', identifier: time_period || this.getCurrentTimePeriod() },
      { type: 'language_mix', identifier: language_mix || 'mixed_language' }
    ];

    for (const query of contextQueries) {
      if (query.identifier) {
        const { data } = await supabase
          .from('threshold_contexts')
          .select('*')
          .eq('context_type', query.type)
          .eq('context_identifier', query.identifier)
          .eq('learning_enabled', true)
          .single();

        if (data) return data;
      }
    }

    return null;
  }

  /**
   * Calculate threshold adjustment based on learning signal
   * @param {Object} signal - Learning signal data
   * @returns {Object|null} Adjustment parameters
   */
  async calculateThresholdAdjustment(signal) {
    try {
      // Get learning parameters
      const learningRate = await this.getLearningParameter('global_learning_rate', 0.1);
      const explorationRate = await this.getLearningParameter('exploration_rate', 0.2);
      const maxAdjustment = await this.getLearningParameter('max_adjustment_per_cycle', 0.05);

      // Determine adjustment direction and magnitude
      let adjustmentDirection = 0;
      let signalStrength = signal.signal_strength;

      if (signal.signal_type === 'admin_approval' && signal.original_score > signal.original_threshold) {
        // False positive: increase threshold to reduce future false positives
        adjustmentDirection = 1;
      } else if (signal.signal_type === 'admin_rejection' && signal.original_score < signal.original_threshold) {
        // False negative: decrease threshold to catch more violations
        adjustmentDirection = -1;
      } else {
        // Correct decision: small reinforcement adjustment
        adjustmentDirection = signal.signal_type === 'admin_approval' ? -0.1 : 0.1;
        signalStrength *= 0.5; // Reduce impact for correct decisions
      }

      // Calculate adjustment magnitude with exploration
      const explorationFactor = Math.random() < explorationRate ? 1.5 : 1.0;
      const adjustmentMagnitude = learningRate * signalStrength * explorationFactor;
      const clampedAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, 
        adjustmentDirection * adjustmentMagnitude));

      if (Math.abs(clampedAdjustment) < 0.001) {
        return null; // Adjustment too small
      }

      return {
        contextId: signal.context_id,
        thresholdType: this.determineThresholdType(signal.original_score),
        magnitude: clampedAdjustment,
        confidence: this.calculateAdjustmentConfidence(signal),
        reason: this.generateAdjustmentReason(signal, adjustmentDirection),
        signalId: signal.id
      };

    } catch (error) {
      console.error('[Adaptive Learning] Error calculating adjustment:', error);
      return null;
    }
  }

  /**
   * Apply threshold adjustment to database
   * @param {Object} adjustment - Adjustment parameters
   */
  async applyThresholdAdjustment(adjustment) {
    try {
      // Get current threshold context
      const { data: context } = await supabase
        .from('threshold_contexts')
        .select('*')
        .eq('id', adjustment.contextId)
        .single();

      if (!context) {
        throw new Error('Context not found');
      }

      // Calculate new threshold value
      const currentValue = context[`${adjustment.thresholdType}_threshold`];
      const newValue = currentValue + adjustment.magnitude;

      // Apply safety bounds
      const bounds = this.safetyBounds[adjustment.thresholdType.replace('_risk', 'Risk')];
      const clampedValue = Math.max(bounds.min, Math.min(bounds.max, newValue));

      // Update threshold context
      const { error: updateError } = await supabase
        .from('threshold_contexts')
        .update({
          [`${adjustment.thresholdType}_threshold`]: clampedValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', adjustment.contextId);

      if (updateError) throw updateError;

      // Record in threshold history
      await supabase.from('adaptive_threshold_history').insert({
        context_type: context.context_type,
        context_value: adjustment.contextId,
        threshold_type: adjustment.thresholdType,
        old_value: currentValue,
        new_value: clampedValue,
        adjustment_reason: adjustment.reason,
        confidence_score: adjustment.confidence,
        algorithm_version: this.algorithmVersion
      });

      // Mark learning signal as processed
      await supabase
        .from('learning_feedback_signals')
        .update({
          processed: true,
          processing_timestamp: new Date().toISOString(),
          threshold_adjustment_applied: clampedValue - currentValue
        })
        .eq('id', adjustment.signalId);

      console.log(`[Adaptive Learning] Adjusted ${adjustment.thresholdType} threshold from ${currentValue} to ${clampedValue}`);

    } catch (error) {
      console.error('[Adaptive Learning] Error applying adjustment:', error);
      throw error;
    }
  }

  /**
   * Create learning signal record
   * @param {Object} signalData - Signal parameters
   * @returns {Object} Created signal
   */
  async createLearningSignal(signalData) {
    const signalStrength = this.calculateSignalStrength(signalData);
    const confidenceLevel = this.calculateSignalConfidence(signalData);

    const { data, error } = await supabase
      .from('learning_feedback_signals')
      .insert({
        moderation_result_id: signalData.moderationResultId,
        queue_item_id: signalData.queueItemId,
        signal_type: signalData.signalType,
        signal_strength: signalStrength,
        confidence_level: confidenceLevel,
        original_threshold: signalData.originalThreshold,
        original_score: signalData.originalScore,
        context_id: signalData.contextId,
        user_pattern_id: signalData.userPatternId,
        admin_notes: signalData.adminNotes
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Calculate signal strength based on decision context
   * @param {Object} signalData - Signal parameters
   * @returns {number} Signal strength (0-1)
   */
  calculateSignalStrength(signalData) {
    const { originalScore, originalThreshold, signalType } = signalData;

    // Distance from threshold indicates confidence in decision
    const distance = Math.abs(originalScore - originalThreshold);

    // Base strength on distance and decision type
    let strength = Math.min(1.0, distance * 2); // Scale distance to 0-1

    // Adjust based on signal type
    if (signalType === 'admin_approval' && originalScore > originalThreshold) {
      // Strong signal for false positive
      strength = Math.max(0.7, strength);
    } else if (signalType === 'admin_rejection' && originalScore < originalThreshold) {
      // Strong signal for false negative
      strength = Math.max(0.7, strength);
    } else {
      // Weaker signal for correct decisions
      strength *= 0.5;
    }

    return Math.round(strength * 10000) / 10000; // Round to 4 decimal places
  }

  /**
   * Calculate confidence in signal quality
   * @param {Object} signalData - Signal parameters
   * @returns {number} Confidence level (0-1)
   */
  calculateSignalConfidence(signalData) {
    // Base confidence on admin notes quality and decision consistency
    let confidence = 0.8; // Base confidence for admin decisions

    if (signalData.adminNotes && signalData.adminNotes.length > 20) {
      confidence += 0.1; // Detailed notes increase confidence
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Determine which threshold type to adjust based on score
   * @param {number} score - Original moderation score
   * @returns {string} Threshold type
   */
  determineThresholdType(score) {
    if (score >= 0.7) return 'high_risk';
    if (score >= 0.4) return 'medium_risk';
    return 'low_risk';
  }

  /**
   * Calculate confidence in threshold adjustment
   * @param {Object} signal - Learning signal
   * @returns {number} Adjustment confidence (0-1)
   */
  calculateAdjustmentConfidence(signal) {
    return signal.confidence_level * signal.signal_strength;
  }

  /**
   * Generate human-readable reason for adjustment
   * @param {Object} signal - Learning signal
   * @param {number} direction - Adjustment direction
   * @returns {string} Adjustment reason
   */
  generateAdjustmentReason(signal, direction) {
    const action = direction > 0 ? 'increase' : 'decrease';
    const reason = signal.signal_type === 'admin_approval' ? 'false positive' : 'false negative';
    return `Admin feedback indicates ${reason}, ${action} threshold to improve accuracy`;
  }

  /**
   * Get learning parameter value
   * @param {string} paramName - Parameter name
   * @param {number} defaultValue - Default value if not found
   * @returns {number} Parameter value
   */
  async getLearningParameter(paramName, defaultValue) {
    try {
      const { data } = await supabase
        .from('learning_parameters')
        .select('parameter_value')
        .eq('parameter_name', paramName)
        .single();

      return data ? data.parameter_value : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Get global default thresholds
   * @returns {Object} Global threshold values
   */
  async getGlobalThresholds() {
    try {
      const { data } = await supabase
        .from('content_moderation_settings')
        .select('high_risk_threshold, medium_risk_threshold, low_risk_threshold')
        .single();

      return {
        high_risk: data?.high_risk_threshold || 0.8,
        medium_risk: data?.medium_risk_threshold || 0.5,
        low_risk: data?.low_risk_threshold || 0.2,
        context_id: null,
        learning_enabled: false
      };
    } catch {
      return {
        high_risk: 0.8,
        medium_risk: 0.5,
        low_risk: 0.2,
        context_id: null,
        learning_enabled: false
      };
    }
  }

  /**
   * Get user reputation level for context matching
   * @param {string} userId - User ID
   * @returns {string} Reputation level
   */
  async getUserReputationLevel(userId) {
    try {
      // Count user's successful matches
      const { count } = await supabase
        .from('matches')
        .select('*', { count: 'exact' })
        .eq('host_id', userId)
        .eq('status', 'completed');

      if (count >= 10) return 'experienced_user';
      if (count >= 5) return 'regular_user';
      return 'new_user';
    } catch {
      return 'new_user';
    }
  }

  /**
   * Get current time period for context
   * @returns {string} Time period identifier
   */
  getCurrentTimePeriod() {
    const hour = new Date().getHours();
    if (hour >= 19 && hour <= 22) return 'peak_hours';
    if (hour >= 7 && hour <= 18) return 'day_hours';
    return 'off_hours';
  }

  /**
   * Update user behavior pattern based on admin decision
   * @param {string} patternId - User pattern ID
   * @param {string} decision - Admin decision
   */
  async updateUserBehaviorPattern(patternId, decision) {
    try {
      const increment = decision === 'approve' ?
        { admin_approvals: 1 } :
        { admin_rejections: 1 };

      await supabase.rpc('increment_user_pattern_stats', {
        pattern_id: patternId,
        ...increment
      });
    } catch (error) {
      console.error('[Adaptive Learning] Error updating user pattern:', error);
    }
  }

  /**
   * Get learning performance metrics
   * @returns {Object} Performance summary
   */
  async getPerformanceMetrics() {
    try {
      const { data: summary } = await supabase
        .from('learning_performance_summary')
        .select('*');

      const { data: recentAdjustments } = await supabase
        .from('adaptive_threshold_history')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      return {
        summary,
        recentAdjustments,
        totalAdjustments: recentAdjustments?.length || 0,
        avgAdjustmentMagnitude: recentAdjustments?.reduce((sum, adj) =>
          sum + Math.abs(adj.new_value - adj.old_value), 0) / (recentAdjustments?.length || 1)
      };
    } catch (error) {
      console.error('[Adaptive Learning] Error getting performance metrics:', error);
      return { summary: [], recentAdjustments: [], totalAdjustments: 0, avgAdjustmentMagnitude: 0 };
    }
  }
}

// Export singleton instance
export const adaptiveThresholdService = new AdaptiveThresholdService();
export default adaptiveThresholdService;
