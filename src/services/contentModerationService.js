import { supabase } from './supabase';

/**
 * Content Moderation Service - ML-Powered Administrative Oversight
 *
 * PURPOSE: Unified interface for content moderation that proxies to ML-enabled edge function
 *
 * ARCHITECTURE CHANGE (v3.0):
 * - This service now acts as a proxy to the edge function for moderation processing
 * - Edge function handles actual ML integration with Hugging Face toxic-bert
 * - Maintains backward compatibility for admin dashboard and existing integrations
 * - Eliminates dual implementation inconsistency
 *
 * FEATURES:
 * - ML-powered toxic content detection via edge function
 * - Configuration-driven moderation (reads from database)
 * - Robust fallback mechanisms (ML -> rule-based -> manual review)
 * - Admin dashboard integration and workflow management
 *
 * RISK LEVELS:
 * - HIGH: Auto-reject + admin alert
 * - MEDIUM: Queue for manual review
 * - LOW: Auto-approve with monitoring
 * - MINIMAL: Auto-approve
 */

const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const LOG_PREFIX = '[Content Moderation Service v3.0]';

// Helper logging functions
function log(...args) {
  if (DEBUG_MODE) {
    console.log(LOG_PREFIX, ...args);
  }
}

function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

/**
 * Main content moderation function - Now proxies to ML-enabled edge function
 *
 * ARCHITECTURE CHANGE: This function now calls the edge function instead of
 * performing local rule-based processing. This eliminates the dual implementation
 * inconsistency and enables actual ML integration.
 */
async function moderateContent(title, description, matchData = {}) {
  try {
    log(`=== CONTENT MODERATION START (Edge Function Proxy) ===`);
    log(`Title: "${title}"`);
    log(`Description: "${description}"`);

    // Ensure we have a match ID for the edge function
    if (!matchData.id) {
      throw new Error('Match ID is required for content moderation');
    }

    // Call the ML-enabled edge function
    const { data: moderationResult, error: edgeFunctionError } = await supabase.functions.invoke(
      'moderate-match-content',
      {
        body: {
          matchId: matchData.id,
          // Optional: Pass additional context if needed
          title,
          description,
          sport_id: matchData.sport_id
        }
      }
    );

    if (edgeFunctionError) {
      logError('Edge function error:', edgeFunctionError);
      throw new Error(`Edge function failed: ${edgeFunctionError.message}`);
    }

    if (!moderationResult || !moderationResult.success) {
      throw new Error('Edge function returned invalid result');
    }

    const result = moderationResult.data;

    log(`Risk Level: ${result.overall_risk_level}`);
    log(`ML Model Used: ${result.model_confidence?.toxic_detection || 'unknown'}`);
    log(`Processing Time: ${result.processing_time_ms}ms`);
    log(`=== CONTENT MODERATION END ===`);

    // Transform edge function result to match expected interface
    return {
      riskLevel: result.overall_risk_level,
      overallScore: result.inappropriate_score || 0,
      details: {
        inappropriate: {
          score: result.inappropriate_score || 0,
          confidence: result.model_confidence?.toxic_detection || 'medium',
          flaggedKeywords: result.flagged_content?.toxic_words || [],
          details: `ML-powered toxic content detection (${result.model_confidence?.system_version || 'v3.0'})`
        },
        consistency: {
          score: 0, // Removed in v3.0 as per user preference
          confidence: 'not_applicable',
          details: 'Title-description consistency removed in v3.0 (toxic-only focus)'
        },
        sports: {
          score: result.sports_validation_score || 0,
          confidence: result.model_confidence?.sports_validation || 'medium',
          details: `Sports validation score: ${(result.sports_validation_score || 0).toFixed(2)}`
        }
      },
      action: result.auto_approved ? 'auto_approve' : 'manual_review',
      requiresReview: result.requires_review,
      autoApproved: result.auto_approved,
      // Additional ML-specific metadata
      mlMetadata: {
        modelUsed: result.flagged_content?.model_used || 'unknown',
        processingTime: result.processing_time_ms,
        fallbackUsed: result.flagged_content?.fallback_used || false,
        systemVersion: result.model_confidence?.system_version || 'v3.0'
      }
    };

  } catch (error) {
    logError('Error in content moderation proxy:', error);

    // Fallback to local rule-based processing if edge function fails
    log('Falling back to local rule-based processing...');

    try {
      const fallbackResult = await moderateContentFallback(title, description, matchData);
      return {
        ...fallbackResult,
        mlMetadata: {
          modelUsed: 'rule-based-fallback',
          processingTime: 0,
          fallbackUsed: true,
          systemVersion: 'v3.0-fallback',
          fallbackReason: error.message
        }
      };
    } catch (fallbackError) {
      logError('Fallback moderation also failed:', fallbackError);

      // Ultimate fallback - manual review
      return {
        riskLevel: 'medium',
        overallScore: 0.5,
        details: {
          error: `Both ML and fallback moderation failed: ${error.message}`,
          fallbackError: fallbackError.message
        },
        action: 'manual_review',
        requiresReview: true,
        autoApproved: false,
        mlMetadata: {
          modelUsed: 'error-fallback',
          processingTime: 0,
          fallbackUsed: true,
          systemVersion: 'v3.0-error',
          fallbackReason: 'Complete system failure'
        }
      };
    }
  }
}

/**
 * Fallback content moderation using local rule-based processing
 * Used when the ML-enabled edge function is unavailable
 */
async function moderateContentFallback(title, description, matchData = {}) {
  log('Using fallback rule-based moderation...');

  // Simple rule-based toxic content detection
  const content = (title + ' ' + description).toLowerCase();
  let toxicScore = 0;
  const flaggedKeywords = [];

  // Basic inappropriate keywords
  const inappropriateKeywords = [
    'spam', 'promotion', 'advertisement', 'buy', 'sell', 'money',
    'inappropriate', 'offensive', 'hate', 'discrimination', 'fuck', 'shit'
  ];

  for (const keyword of inappropriateKeywords) {
    if (content.includes(keyword)) {
      toxicScore += 0.3;
      flaggedKeywords.push(keyword);
    }
  }

  // Check for excessive capitalization
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.5) {
    toxicScore += 0.2;
    flaggedKeywords.push('excessive_caps');
  }

  // Normalize score
  toxicScore = Math.min(toxicScore, 1.0);

  // Determine risk level
  let riskLevel, action, requiresReview, autoApproved;

  if (toxicScore >= 0.8) {
    riskLevel = 'high';
    action = 'auto_reject';
    requiresReview = true;
    autoApproved = false;
  } else if (toxicScore >= 0.5) {
    riskLevel = 'medium';
    action = 'manual_review';
    requiresReview = true;
    autoApproved = false;
  } else if (toxicScore >= 0.2) {
    riskLevel = 'low';
    action = 'auto_approve_monitor';
    requiresReview = false;
    autoApproved = true;
  } else {
    riskLevel = 'minimal';
    action = 'auto_approve';
    requiresReview = false;
    autoApproved = true;
  }

  return {
    riskLevel,
    overallScore: toxicScore,
    details: {
      inappropriate: {
        score: toxicScore,
        confidence: toxicScore > 0.5 ? 'high' : 'medium',
        flaggedKeywords,
        details: `Rule-based fallback detection: ${toxicScore.toFixed(2)}`
      },
      consistency: {
        score: 0,
        confidence: 'not_applicable',
        details: 'Consistency check disabled in fallback mode'
      },
      sports: {
        score: 0,
        confidence: 'not_applicable',
        details: 'Sports validation disabled in fallback mode'
      }
    },
    action,
    requiresReview,
    autoApproved
  };
}

/**
 * Legacy function - Check for inappropriate content using rule-based detection
 * DEPRECATED: Now used only as fallback when ML edge function fails
 */
async function checkInappropriateContent(title, description) {
  const content = (title + ' ' + description).toLowerCase();
  
  // Rule-based inappropriate content detection
  let inappropriateScore = 0;
  const flaggedKeywords = [];

  for (const keyword of INAPPROPRIATE_KEYWORDS) {
    if (content.includes(keyword)) {
      inappropriateScore += 0.3;
      flaggedKeywords.push(keyword);
    }
  }

  // Check for excessive capitalization (potential spam)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.5) {
    inappropriateScore += 0.2;
    flaggedKeywords.push('excessive_caps');
  }

  // Check for repeated characters (spam pattern)
  if (/(.)\1{4,}/.test(content)) {
    inappropriateScore += 0.3;
    flaggedKeywords.push('repeated_chars');
  }

  // Check for promotional patterns
  if (content.includes('http') || content.includes('www.') || content.includes('.com')) {
    inappropriateScore += 0.4;
    flaggedKeywords.push('external_links');
  }

  // Normalize score to 0-1 range
  inappropriateScore = Math.min(inappropriateScore, 1.0);

  return {
    score: inappropriateScore,
    confidence: inappropriateScore > 0.5 ? 'high' : inappropriateScore > 0.2 ? 'medium' : 'low',
    flaggedKeywords,
    details: `Inappropriate content score: ${inappropriateScore.toFixed(2)}`
  };
}

/**
 * Check title-description consistency using simple similarity
 */
async function checkTitleDescriptionConsistency(title, description) {
  if (!title || !description) {
    return {
      score: 0.5,
      confidence: 'medium',
      details: 'Missing title or description'
    };
  }

  // Simple word overlap similarity
  const titleWords = new Set(title.toLowerCase().split(/\s+/));
  const descWords = new Set(description.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...titleWords].filter(word => descWords.has(word)));
  const union = new Set([...titleWords, ...descWords]);
  
  const similarity = intersection.size / union.size;
  
  // Inverse score - high similarity = low risk
  const riskScore = 1 - similarity;

  return {
    score: riskScore,
    confidence: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
    similarity: similarity,
    details: `Title-description similarity: ${similarity.toFixed(2)}, risk: ${riskScore.toFixed(2)}`
  };
}

/**
 * Validate sports content terminology
 */
async function validateSportsContent(title, description, matchData) {
  const content = (title + ' ' + description).toLowerCase();
  
  // Check if content contains sports-related terms
  const sportsTermsFound = SPORTS_TERMS.filter(term => content.includes(term));
  
  // Check if declared sport matches content
  let sportMismatch = false;
  if (matchData.sport_name) {
    const declaredSport = matchData.sport_name.toLowerCase();
    if (!content.includes(declaredSport)) {
      sportMismatch = true;
    }
  }

  // Calculate sports validation score
  let validationScore = 0;
  
  if (sportsTermsFound.length === 0) {
    validationScore += 0.3; // No sports terms found
  }
  
  if (sportMismatch) {
    validationScore += 0.4; // Sport mismatch
  }

  // Check for non-sports content
  const nonSportsKeywords = ['party', 'social', 'dating', 'business', 'academic'];
  const nonSportsFound = nonSportsKeywords.filter(term => content.includes(term));
  if (nonSportsFound.length > 0) {
    validationScore += 0.3;
  }

  validationScore = Math.min(validationScore, 1.0);

  return {
    score: validationScore,
    confidence: validationScore > 0.5 ? 'high' : validationScore > 0.2 ? 'medium' : 'low',
    sportsTermsFound,
    sportMismatch,
    nonSportsFound,
    details: `Sports validation score: ${validationScore.toFixed(2)}`
  };
}

/**
 * Calculate overall risk level and determine action
 */
function calculateRiskLevel(results) {
  const { inappropriate, consistency, sports } = results;
  
  // Weighted average of all scores
  const overallScore = (
    inappropriate.score * 0.5 +  // 50% weight - most important
    consistency.score * 0.3 +    // 30% weight - important for quality
    sports.score * 0.2           // 20% weight - sports relevance
  );

  let level, action, requiresReview, autoApproved;

  if (overallScore >= RISK_THRESHOLDS.HIGH) {
    level = 'high';
    action = 'auto_reject';
    requiresReview = true;
    autoApproved = false;
  } else if (overallScore >= RISK_THRESHOLDS.MEDIUM) {
    level = 'medium';
    action = 'manual_review';
    requiresReview = true;
    autoApproved = false;
  } else if (overallScore >= RISK_THRESHOLDS.LOW) {
    level = 'low';
    action = 'auto_approve_monitor';
    requiresReview = false;
    autoApproved = true;
  } else {
    level = 'minimal';
    action = 'auto_approve';
    requiresReview = false;
    autoApproved = true;
  }

  return {
    level,
    score: overallScore,
    action,
    requiresReview,
    autoApproved
  };
}

/**
 * Store moderation results in database
 */
async function storeModerationResult(matchId, moderationResult) {
  try {
    const { data, error } = await supabase
      .from('content_moderation_results')
      .insert({
        match_id: matchId,
        inappropriate_score: moderationResult.details.inappropriate.score,
        consistency_score: moderationResult.details.consistency.score,
        sports_validation_score: moderationResult.details.sports.score,
        overall_risk_level: moderationResult.riskLevel,
        auto_approved: moderationResult.autoApproved,
        requires_review: moderationResult.requiresReview
      })
      .select()
      .single();

    if (error) throw error;

    // If requires review, add to admin queue
    if (moderationResult.requiresReview) {
      await addToAdminQueue(matchId, data.id, moderationResult.riskLevel);
    }

    return data;

  } catch (error) {
    logError('Error storing moderation result:', error);
    throw error;
  }
}

/**
 * Add content to admin review queue
 */
async function addToAdminQueue(matchId, moderationResultId, riskLevel) {
  try {
    const priority = riskLevel === 'high' ? 3 : riskLevel === 'medium' ? 2 : 1;

    const { error } = await supabase
      .from('admin_review_queue')
      .insert({
        match_id: matchId,
        moderation_result_id: moderationResultId,
        priority,
        status: 'pending'
      });

    if (error) throw error;

    log(`Added match ${matchId} to admin review queue with priority ${priority}`);

  } catch (error) {
    logError('Error adding to admin queue:', error);
    throw error;
  }
}

/**
 * Get pending admin reviews
 */
async function getPendingReviews(limit = 20) {
  try {
    const { data, error } = await supabase
      .from('admin_review_queue')
      .select(`
        *,
        matches(title, description, sport_id, sports(name)),
        content_moderation_results(*)
      `)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data;

  } catch (error) {
    logError('Error fetching pending reviews:', error);
    return [];
  }
}

/**
 * Process admin review decision
 */
async function processAdminDecision(reviewId, decision, adminId, notes = '') {
  try {
    // Update review queue
    const { error: queueError } = await supabase
      .from('admin_review_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (queueError) throw queueError;

    // Update moderation result
    const { error: moderationError } = await supabase
      .from('content_moderation_results')
      .update({
        admin_reviewed: true,
        admin_decision: decision,
        admin_notes: notes,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (moderationError) throw moderationError;

    log(`Admin decision processed: ${decision} for review ${reviewId}`);

  } catch (error) {
    logError('Error processing admin decision:', error);
    throw error;
  }
}

/**
 * Get moderation queue with filters for admin dashboard
 */
async function getModerationQueue(filters = {}) {
  try {
    log(`=== FETCHING MODERATION QUEUE ===`);
    log(`Filters:`, JSON.stringify(filters, null, 2));

    let query = supabase
      .from('admin_moderation_dashboard')
      .select('*')
      .order('queued_at', { ascending: false });

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    } else {
      // By default, exclude completed items (approved/rejected) unless specifically requested
      if (!filters.includeCompleted) {
        query = query.not('status', 'in', '(approved,rejected)');
        log('Filtering out completed items (approved/rejected)');
      }
    }

    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }
    if (filters.risk_level && filters.risk_level !== 'all') {
      query = query.eq('overall_risk_level', filters.risk_level);
    }
    if (filters.assigned_admin) {
      query = query.eq('assigned_admin_id', filters.assigned_admin);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      logError('Error fetching moderation queue:', error);
      return { success: false, error: error.message };
    }

    log(`Fetched ${data?.length || 0} items from moderation queue`);
    return { success: true, data: data || [] };
  } catch (error) {
    logError('Error in getModerationQueue:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get moderation statistics for dashboard
 */
async function getModerationStatistics() {
  try {
    const [queueResult, resultsResult, settingsResult] = await Promise.all([
      supabase.from('admin_review_queue').select('status, priority, created_at'),
      supabase.from('content_moderation_results').select('overall_risk_level, auto_approved, requires_review, created_at'),
      supabase.from('content_moderation_settings').select('*').single()
    ]);

    const queueData = queueResult.data || [];
    const resultsData = resultsResult.data || [];
    const settings = settingsResult.data;

    // Calculate statistics
    const totalQueue = queueData.length;
    const pendingReviews = queueData.filter(q => q.status === 'pending').length;
    const urgentReviews = queueData.filter(q => q.priority === 'urgent').length;
    const highPriorityReviews = queueData.filter(q => q.priority === 'high').length;

    const totalModerated = resultsData.length;
    const autoApproved = resultsData.filter(r => r.auto_approved).length;
    const requiresReview = resultsData.filter(r => r.requires_review).length;

    // Risk level breakdown
    const riskLevels = {
      high: resultsData.filter(r => r.overall_risk_level === 'high').length,
      medium: resultsData.filter(r => r.overall_risk_level === 'medium').length,
      low: resultsData.filter(r => r.overall_risk_level === 'low').length,
      minimal: resultsData.filter(r => r.overall_risk_level === 'minimal').length
    };

    // Recent activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentModeration = resultsData.filter(r => new Date(r.created_at) > weekAgo).length;
    const recentQueue = queueData.filter(q => new Date(q.created_at) > weekAgo).length;

    return {
      success: true,
      data: {
        queue: {
          total: totalQueue,
          pending: pendingReviews,
          urgent: urgentReviews,
          high_priority: highPriorityReviews,
          recent: recentQueue
        },
        moderation: {
          total: totalModerated,
          auto_approved: autoApproved,
          requires_review: requiresReview,
          recent: recentModeration
        },
        risk_levels: riskLevels,
        settings: settings,
        performance: {
          auto_approval_rate: totalModerated > 0 ? Math.round((autoApproved / totalModerated) * 100) : 0,
          review_rate: totalModerated > 0 ? Math.round((requiresReview / totalModerated) * 100) : 0
        }
      }
    };
  } catch (error) {
    logError('Error in getModerationStatistics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enhanced APPROVE functionality for admin review workflow
 */
async function approveMatch(queueId, adminId, notes = '') {
  try {
    log(`=== ENHANCED APPROVE WORKFLOW START ===`);
    log(`Queue ID: ${queueId}, Admin ID: ${adminId}`);

    // Get queue item with related data
    const { data: queueItem, error: fetchError } = await supabase
      .from('admin_review_queue')
      .select(`
        *,
        moderation_result:content_moderation_results(*),
        match:matches(*)
      `)
      .eq('id', queueId)
      .single();

    if (fetchError || !queueItem) {
      throw new Error('Review queue item not found');
    }

    // Update queue item to approved
    const { error: queueUpdateError } = await supabase
      .from('admin_review_queue')
      .update({
        status: 'approved',
        assigned_admin_id: adminId,
        assigned_at: new Date().toISOString(),
        admin_decision: 'approve',
        admin_notes: notes,
        completed_at: new Date().toISOString(),
        user_notified: false
      })
      .eq('id', queueId);

    if (queueUpdateError) throw queueUpdateError;

    // Update moderation result to approved
    const { error: moderationUpdateError } = await supabase
      .from('content_moderation_results')
      .update({
        auto_approved: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueItem.moderation_result_id);

    if (moderationUpdateError) throw moderationUpdateError;

    // Ensure match status is 'upcoming' (optimistic approval means it should already be visible)
    const { error: matchUpdateError } = await supabase
      .from('matches')
      .update({
        status: 'upcoming',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueItem.match_id);

    if (matchUpdateError) throw matchUpdateError;

    // NOTE: No notifications sent for approved matches as per requirements
    log('Match approved - no notification sent to host as per policy');

    log(`Match approved successfully: ${queueItem.match_id}`);
    log(`=== ENHANCED APPROVE WORKFLOW END ===`);

    return {
      success: true,
      message: 'Match approved successfully',
      matchId: queueItem.match_id,
      matchTitle: queueItem.match?.title
    };

  } catch (error) {
    logError('Error in enhanced approve workflow:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enhanced REJECT functionality for admin review workflow
 */
async function rejectMatch(queueId, adminId, actionReason, notes = '') {
  try {
    log(`=== ENHANCED REJECT WORKFLOW START ===`);
    log(`Queue ID: ${queueId}, Admin ID: ${adminId}, Reason: ${actionReason}`);

    // Get queue item with related data including flagged content
    const { data: queueItem, error: fetchError } = await supabase
      .from('admin_review_queue')
      .select(`
        *,
        moderation_result:content_moderation_results(*),
        match:matches(*)
      `)
      .eq('id', queueId)
      .single();

    if (fetchError || !queueItem) {
      throw new Error('Review queue item not found');
    }

    // Update queue item to rejected
    const { error: queueUpdateError } = await supabase
      .from('admin_review_queue')
      .update({
        status: 'rejected',
        assigned_admin_id: adminId,
        assigned_at: new Date().toISOString(),
        admin_decision: 'reject',
        admin_notes: notes,
        admin_action_reason: actionReason,
        completed_at: new Date().toISOString(),
        user_notified: false
      })
      .eq('id', queueId);

    if (queueUpdateError) throw queueUpdateError;

    // Update match status to rejected/cancelled and hide from public listings
    const { error: matchUpdateError } = await supabase
      .from('matches')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueItem.match_id);

    if (matchUpdateError) throw matchUpdateError;

    // Prepare comprehensive rejection notification with detailed flagged content
    const flaggedContent = queueItem.moderation_result?.flagged_content || {};
    const toxicWords = flaggedContent.toxic_words || [];
    const riskFactors = flaggedContent.risk_factors || {};
    const toxicScore = queueItem.moderation_result?.inappropriate_score || 0;
    const riskLevel = queueItem.moderation_result?.overall_risk_level || 'unknown';

    let detailedReason = `${actionReason}\n\n=== DETAILED MODERATION ANALYSIS ===`;

    // Add risk assessment
    detailedReason += `\n\n📊 RISK ASSESSMENT:`;
    detailedReason += `\n• Risk Level: ${riskLevel.toUpperCase()}`;
    detailedReason += `\n• Toxic Content Score: ${(toxicScore * 100).toFixed(1)}%`;

    // Add specific flagged words
    if (toxicWords.length > 0) {
      detailedReason += `\n\n🚨 FLAGGED CONTENT:`;
      detailedReason += `\n• Inappropriate language detected: ${toxicWords.join(', ')}`;
      detailedReason += `\n• Total flagged words: ${toxicWords.length}`;
    }

    // Add risk factors
    if (Object.keys(riskFactors).length > 0) {
      detailedReason += `\n\n⚠️ RISK FACTORS:`;
      if (riskFactors.high_toxicity) {
        detailedReason += '\n• High toxicity content detected';
      }
      if (riskFactors.medium_toxicity) {
        detailedReason += '\n• Medium toxicity content detected';
      }
      if (riskFactors.sports_context_detected) {
        detailedReason += '\n• Sports context detected but overridden by explicit content';
      }
    }

    // Add policy reminder
    detailedReason += `\n\n📋 POLICY REMINDER:`;
    detailedReason += `\nPlease ensure future match content follows our community guidelines:`;
    detailedReason += `\n• Use appropriate language suitable for all participants`;
    detailedReason += `\n• Avoid explicit profanity and offensive terms`;
    detailedReason += `\n• Create welcoming and inclusive match descriptions`;
    detailedReason += `\n\nYou may create a new match with appropriate content.`;

    // Send comprehensive rejection notification to host with detailed analysis
    try {
      const notificationResult = await sendEnhancedHostNotification(
        queueItem.match_id,
        queueItem.moderation_result_id,
        'rejected',
        '🚨 Match Rejected - Content Policy Violation',
        `Your match "${queueItem.match?.title}" has been rejected by our moderation team.\n\n${detailedReason}${notes ? `\n\n💬 ADMIN NOTES:\n${notes}` : ''}`,
        {
          flagged_words: toxicWords,
          risk_factors: riskFactors,
          toxic_score: toxicScore,
          risk_level: riskLevel,
          total_flagged_words: toxicWords.length,
          policy_violation_type: 'explicit_language',
          action_required: 'create_new_match_with_appropriate_content'
        }
      );

      if (!notificationResult.success) {
        logError('Failed to send enhanced rejection notification:', notificationResult.error);
      } else {
        log('Enhanced rejection notification with detailed analysis sent successfully');
      }
    } catch (notificationError) {
      logError('Error sending enhanced rejection notification:', notificationError);
    }

    log(`Match rejected successfully: ${queueItem.match_id}`);
    log(`=== ENHANCED REJECT WORKFLOW END ===`);

    return {
      success: true,
      message: 'Match rejected successfully',
      matchId: queueItem.match_id,
      matchTitle: queueItem.match?.title
    };

  } catch (error) {
    logError('Error in enhanced reject workflow:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get detailed match information for review modal
 */
async function getMatchReviewDetails(queueId) {
  try {
    log(`=== FETCHING MATCH REVIEW DETAILS ===`);
    log(`Queue ID: ${queueId}`);

    // First get the queue item with moderation result
    const { data: queueData, error: queueError } = await supabase
      .from('admin_review_queue')
      .select(`
        *,
        moderation_result:content_moderation_results(*)
      `)
      .eq('id', queueId)
      .single();

    if (queueError) {
      logError('Error fetching queue data:', queueError);
      throw new Error(`Queue query error: ${queueError.message}`);
    }

    if (!queueData) {
      throw new Error('Queue item not found');
    }

    log(`Queue data fetched for match: ${queueData.match_id}`);

    // Then get the match details with related data
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        sport:sports(*),
        location:locations(*)
      `)
      .eq('id', queueData.match_id)
      .single();

    if (matchError) {
      logError('Error fetching match data:', matchError);
      throw new Error(`Match query error: ${matchError.message}`);
    }

    // Get host profile separately
    const { data: hostData, error: hostError } = await supabase
      .from('profiles')
      .select('id, full_name, email, faculty, avatar_url')
      .eq('id', matchData.host_id)
      .single();

    if (hostError) {
      logError('Error fetching host data:', hostError);
      // Don't throw here, just log the error and continue without host data
      log('Continuing without host data due to error');
    }

    // Combine all data
    const combinedData = {
      ...queueData,
      match: {
        ...matchData,
        host: hostData || null
      }
    };

    log(`=== MATCH REVIEW DETAILS FETCHED SUCCESSFULLY ===`);
    return { success: true, data: combinedData };

  } catch (error) {
    logError('Error fetching match review details:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enhanced host notification system with detailed warning information
 */
async function sendEnhancedHostNotification(matchId, moderationResultId, notificationType, title, message, warningDetails = null) {
  try {
    log(`=== SENDING ENHANCED HOST NOTIFICATION ===`);
    log(`Match ID: ${matchId}`);
    log(`Notification Type: ${notificationType}`);
    log(`Title: ${title}`);

    // Get host ID from match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('host_id')
      .eq('id', matchId)
      .single();

    if (matchError) {
      logError('Error fetching match for notification:', matchError);
      throw new Error(`Match query error: ${matchError.message}`);
    }

    if (!match) {
      throw new Error('Match not found for notification');
    }

    log(`Host ID found: ${match.host_id}`);

    // Insert notification
    const notificationData = {
      host_id: match.host_id,
      match_id: matchId,
      moderation_result_id: moderationResultId,
      notification_type: notificationType,
      title: title,
      message: message,
      warning_details: warningDetails,
      is_read: false,
      created_at: new Date().toISOString()
    };

    log('Inserting notification with data:', JSON.stringify(notificationData, null, 2));

    const { data: insertedNotification, error: notificationError } = await supabase
      .from('host_notifications')
      .insert(notificationData)
      .select('id')
      .single();

    if (notificationError) {
      logError('Error inserting notification:', notificationError);
      throw new Error(`Notification insert error: ${notificationError.message}`);
    }

    log(`Notification inserted successfully with ID: ${insertedNotification.id}`);

    // Update queue item to mark as notified
    const { error: queueUpdateError } = await supabase
      .from('admin_review_queue')
      .update({
        user_notified: true,
        notification_sent_at: new Date().toISOString()
      })
      .eq('match_id', matchId);

    if (queueUpdateError) {
      logError('Error updating queue notification status:', queueUpdateError);
      // Don't throw here as notification was sent successfully
    } else {
      log('Queue item marked as notified successfully');
    }

    log(`=== ENHANCED NOTIFICATION SENT SUCCESSFULLY ===`);
    return { success: true, notificationId: insertedNotification.id };

  } catch (error) {
    logError('Error sending enhanced host notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update review queue item status with enhanced admin actions (legacy compatibility)
 */
async function updateReviewStatus(queueId, decision, adminId, notes = '', actionReason = '') {
  try {
    // Route to enhanced functions based on decision
    if (decision === 'approve') {
      return await approveMatch(queueId, adminId, notes);
    } else if (decision === 'reject') {
      return await rejectMatch(queueId, adminId, actionReason || 'Content violates community guidelines', notes);
    } else {
      // For other decisions, use the original logic
      const { data: queueItem, error: fetchError } = await supabase
        .from('admin_review_queue')
        .select('*')
        .eq('id', queueId)
        .single();

      if (fetchError || !queueItem) {
        throw new Error('Review queue item not found');
      }

      // Update queue item
      const { error: updateError } = await supabase
        .from('admin_review_queue')
        .update({
          status: 'in_review',
          assigned_admin_id: adminId,
          assigned_at: new Date().toISOString(),
          admin_decision: decision,
          admin_notes: notes,
          admin_action_reason: actionReason
        })
        .eq('id', queueId);

      if (updateError) throw updateError;

      return { success: true, message: 'Review status updated successfully' };
    }
  } catch (error) {
    logError('Error updating review status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notification to user about moderation decision
 */
async function sendUserNotification(matchId, decision, reason = '') {
  try {
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('host_id, title')
      .eq('id', matchId)
      .single();

    if (matchError || !matchData) {
      throw new Error('Match not found');
    }

    let title, content;
    if (decision === 'approved') {
      title = 'Match Approved';
      content = `Your match "${matchData.title}" has been approved and is now live.`;
      if (reason) content += ` Admin note: ${reason}`;
    } else if (decision === 'rejected') {
      title = 'Match Rejected';
      content = `Your match "${matchData.title}" has been rejected due to content policy violations.`;
      if (reason) content += ` Reason: ${reason}`;
      content += ' Please review our community guidelines and try again.';
    }

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: matchData.host_id,
        type: `match_${decision}`,
        title,
        content,
        is_read: false
      });

    if (notificationError) {
      logError('Error sending notification:', notificationError);
    }

    // Mark as notified
    await supabase
      .from('admin_review_queue')
      .update({
        user_notified: true,
        notification_sent_at: new Date().toISOString()
      })
      .eq('match_id', matchId);

  } catch (error) {
    logError('Error sending user notification:', error);
  }
}

// Export functions
export {
  moderateContent,
  storeModerationResult,
  getPendingReviews,
  processAdminDecision,
  getModerationQueue,
  getModerationStatistics,
  updateReviewStatus,
  sendUserNotification,
  // Enhanced admin review workflow functions
  approveMatch,
  rejectMatch,
  getMatchReviewDetails,
  sendEnhancedHostNotification
};
