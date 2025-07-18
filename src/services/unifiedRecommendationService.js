import { getRecommendations as getSimplifiedRecommendations } from './simplifiedRecommendationService';

/**
 * Unified Recommendation Service
 *
 * Routes between two distinct recommendation approaches:
 * 1. **Simplified Match Recommendation**: Direct match-to-user preference matching
 * 2. **KNN User Recommendation**: Find similar users, recommend their matches (TEMPLATE.md)
 *
 * Selection based on:
 * - User vector completeness (KNN requires sufficient data)
 * - System configuration
 * - Fallback mechanisms
 *
 * Maintains compatibility with existing frontend components
 */

const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const LOG_PREFIX = '[Unified Recommendation Service]';

// Configuration
const CONFIG = {
  // Default algorithm preference - only simplified for match recommendations
  DEFAULT_ALGORITHM: 'simplified',

  // Fallback settings
  ENABLE_FALLBACK: true,
  FALLBACK_TIMEOUT: 10000 // 10 seconds
};

// Helper logging functions
function log(...args) {
  if (DEBUG_MODE) {
    console.log(LOG_PREFIX, ...args);
  }
}

function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

// KNN functions removed - User Recommendation System is completely separate
// Match recommendations only use simplified algorithm

/**
 * Determine which algorithm to use for a user
 */
async function determineAlgorithm(userId, preferredAlgorithm = CONFIG.DEFAULT_ALGORITHM) {
  try {
    log(`Match recommendation algorithm for user ${userId}: simplified (only option)`);

    // Match recommendations always use simplified algorithm
    // User recommendations (for finding similar users) are handled separately
    return {
      algorithm: 'simplified',
      reason: 'Match recommendations use simplified algorithm only. User recommendations are separate.',
      confidence: 1.0,
      system_type: 'match_recommendation'
    };

  } catch (error) {
    logError('Error determining algorithm:', error);
    return {
      algorithm: 'simplified',
      reason: 'Error in algorithm selection, using simplified fallback',
      confidence: 1.0,
      error: error.message
    };
  }
}

/**
 * Main unified recommendation function
 */
async function getRecommendations(userId, options = {}) {
  try {
    const { 
      algorithm: preferredAlgorithm = CONFIG.DEFAULT_ALGORITHM,
      limit = 10, 
      offset = 0, 
      minScore = 0.15,
      enableFallback = CONFIG.ENABLE_FALLBACK,
      ...otherOptions 
    } = options;

    log(`=== UNIFIED RECOMMENDATIONS START ===`);
    log(`User: ${userId}, Preferred Algorithm: ${preferredAlgorithm}`);

    // Determine which algorithm to use
    const algorithmDecision = await determineAlgorithm(userId, preferredAlgorithm);
    log(`Algorithm decision:`, algorithmDecision);

    let primaryResult = null;
    let primaryError = null;

    // Match recommendations always use simplified algorithm only
    try {
      log('Using simplified algorithm for match recommendations');
      primaryResult = await getSimplifiedRecommendations(userId, {
        limit,
        offset,
        minScore,
        ...otherOptions
      });

      // Add algorithm metadata
      primaryResult.algorithm_used = 'simplified';
      primaryResult.algorithm_reason = algorithmDecision.reason;
      primaryResult.system_type = 'match_recommendation';

      log(`Simplified algorithm succeeded with ${primaryResult.recommendations?.length || 0} recommendations`);

    } catch (error) {
      primaryError = error;
      logError('Simplified algorithm failed:', error);
      throw error; // No fallback for match recommendations - keep it simple
    }

    // primaryResult should be set from the try block above, or error thrown

    // Normalize response format for frontend compatibility
    const normalizedResult = {
      recommendations: primaryResult.recommendations || [],
      metadata: {
        ...primaryResult.metadata,
        algorithm_used: primaryResult.algorithm_used,
        algorithm_reason: primaryResult.algorithm_reason,
        vector_completeness: primaryResult.vector_completeness,
        fallback_used: primaryResult.fallback_used || false,
        primary_error: primaryResult.primary_error || null,
        unified_service_version: '1.0.0'
      },
      type: primaryResult.type || primaryResult.algorithm_used,
      algorithm_used: primaryResult.algorithm_used,
      fallback_used: primaryResult.fallback_used || false
    };

    log(`=== UNIFIED RECOMMENDATIONS END ===`);
    log(`Returning ${normalizedResult.recommendations.length} recommendations using ${normalizedResult.algorithm_used} algorithm`);
    
    return normalizedResult;

  } catch (error) {
    logError('Error in unified recommendations:', error);
    throw error;
  }
}

/**
 * Get algorithm statistics for monitoring
 */
async function getAlgorithmStats(userId) {
  try {
    const algorithmDecision = await determineAlgorithm(userId);

    return {
      recommended_algorithm: algorithmDecision.algorithm,
      reason: algorithmDecision.reason,
      system_type: 'match_recommendation',
      note: 'Match recommendations use simplified algorithm only. User recommendations are separate.'
    };
  } catch (error) {
    logError('Error getting algorithm stats:', error);
    return {
      recommended_algorithm: 'simplified',
      reason: 'error_getting_stats',
      error: error.message
    };
  }
}

// Note: Vector building functions removed - User Recommendation System is separate
// Match recommendations only use simplified algorithm

export {
  getRecommendations,
  determineAlgorithm,
  getAlgorithmStats,
  CONFIG
};
