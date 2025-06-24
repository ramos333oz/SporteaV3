import { supabase } from './supabase';

/**
 * Recommendation service for fetching and tracking personalized match recommendations
 */

// Configuration
const DEBUG_MODE = process.env.NODE_ENV !== 'production'; // Only log in development
const LOG_PREFIX = '[Sportea Recommendation Service]';
const USE_COMBINED_RECOMMENDATIONS = true; // Use the new combined system (Direct + Collaborative)
const USE_DIRECT_PREFERENCE_MATCHING = true;

// Client-side cache
let recommendationsCache = {
  data: null,
  timestamp: 0,
  userId: null
};

// Request throttling
let pendingRequests = new Map();

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
 * Get a cached or new promise for a request
 */
function getCachedOrNewRequest(userId, requestFn) {
  if (pendingRequests.has(userId)) {
    log(`Returning existing promise for user ${userId}`);
    return pendingRequests.get(userId);
  }
  
  const promise = requestFn().finally(() => {
    pendingRequests.delete(userId);
  });
  
  pendingRequests.set(userId, promise);
  return promise;
}

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const recommendationService = {
  /**
   * Clear the recommendations cache and error states
   */
  clearCache: () => {
    recommendationsCache = {
      data: null,
      timestamp: 0,
      userId: null
    };
    
    // Clear error states
    localStorage.removeItem('sportea_embedding_error');
    localStorage.removeItem('sportea_embedding_error_time');
    localStorage.removeItem('sportea_last_connection_error');
    localStorage.removeItem('sportea_last_connection_time');
    
    log('Recommendations cache and error states cleared');
  },

  /**
   * Get direct preference matching recommendations
   */
  getDirectPreferenceRecommendations: async (userId, options = {}) => {
    return getCachedOrNewRequest(`direct-pref-${userId}`, async () => {
      try {
        const { limit = 10 } = options;
        const requestId = generateRequestId();
        
        log('Starting direct preference recommendation request', requestId, { userId, limit });
        
        const { data, error } = await supabase.functions.invoke('direct-preference-v2', {
          body: { userId, limit }
        });

        if (error) {
          logError('Error getting direct preference recommendations:', error);
          return {
            recommendations: [],
            metadata: {
              count: 0,
              type: 'error',
              message: 'Unable to load personalized recommendations',
              error: error.message
            }
          };
        }

        log('Received direct preference recommendations', requestId, { 
          count: data?.count || 0,
          algorithm: data?.algorithm || 'unknown'
        });
        
        return {
          recommendations: data.recommendations || [],
          metadata: {
            count: data.count || 0,
            algorithm: data.algorithm || 'direct-preference-matching',
            component_weight: data.component_weight || '60%',
            using: 'direct-preference-v2',
            requestId
          }
        };
      } catch (error) {
        logError('Unexpected error in getDirectPreferenceRecommendations:', error);
        return {
          recommendations: [],
          metadata: {
            count: 0,
            type: 'error',
            message: 'Unable to load personalized recommendations',
            error: error.message
          }
        };
      }
    });
  },

  /**
   * Get fallback recommendations via direct database query
   */
  getFallbackRecommendations: async (userId, limit = 10) => {
    log('Getting fallback recommendations via direct database query');
    
    try {
      const normalizedLimit = Math.min(Math.max(1, Number(limit) || 10), 20);
      
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          id,
          title,
          start_time,
          end_time,
          max_participants,
          status,
          locations(id, name),
          sports(id, name),
          host_id,
          host:host_id(id, full_name, avatar_url)
        `)
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'completed')
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(normalizedLimit);
        
      if (matchError) throw matchError;
      
      const recommendations = matchData.map(match => ({
        match: {
          ...match,
          sport: match.sports,
          location: match.locations
        },
        score: 0.75,
        explanation: 'Upcoming matches you might be interested in',
        source: 'direct-query-fallback'
      }));
      
      return {
        recommendations,
        metadata: {
          count: recommendations.length,
          type: 'fallback',
          message: 'Upcoming matches you might be interested in',
          isFallback: true,
          source: 'direct-query'
        }
      };
    } catch (fallbackError) {
      logError('Error in fallback recommendations:', fallbackError);
      return {
        recommendations: [],
        metadata: {
          count: 0,
          error: fallbackError.message,
          type: 'error'
        }
      };
    }
  },

  /**
   * Main recommendation function
   */
  getRecommendations: async (userId, options = {}) => {
    try {
      const { limit = 10, offset = 0 } = options;

      log(`Getting recommendations for user ${userId} with options:`, { limit, offset });

      if (USE_COMBINED_RECOMMENDATIONS) {
        log('Using combined recommendation system (Direct Preference + Collaborative Filtering)');
        return recommendationService.getCombinedRecommendations(userId, { limit, offset });
      }

      if (USE_DIRECT_PREFERENCE_MATCHING) {
        log('Using direct preference matching recommendation system');
        return recommendationService.getDirectPreferenceRecommendations(userId, { limit, offset });
      }

      // Return empty recommendations instead of fallback
      return {
        recommendations: [],
        metadata: {
          count: 0,
          type: 'empty',
          message: 'No recommended matches found for you'
        }
      };

    } catch (error) {
      logError('Exception in getRecommendations:', error);
      return {
        recommendations: [],
        metadata: {
          count: 0,
          type: 'error',
          message: 'Unable to load recommendations',
          error: error.message
        }
      };
    }
  },

  /**
   * Get combined recommendations (Direct Preference + Collaborative Filtering)
   */
  getCombinedRecommendations: async (userId, options = {}) => {
    return getCachedOrNewRequest(`combined-${userId}`, async () => {
      try {
        const { limit = 10 } = options;
        const requestId = generateRequestId();

        log('Starting combined recommendation request', requestId, { userId, limit });

        const { data, error } = await supabase.functions.invoke('combined-recommendations', {
          body: { userId, limit }
        });

        if (error) {
          logError('Error getting combined recommendations:', error);
          return recommendationService.getDirectPreferenceRecommendations(userId, { limit });
        }

        log('Received combined recommendations', requestId, {
          count: data?.count || 0,
          algorithm: data?.algorithm || 'unknown'
        });

        return {
          recommendations: data.recommendations || [],
          metadata: {
            count: data.count || 0,
            algorithm: data.algorithm || 'combined-recommendations',
            system_weights: data.system_weights || {},
            component_status: data.component_status || {},
            using: 'combined-system',
            requestId
          }
        };
      } catch (error) {
        logError('Unexpected error in getCombinedRecommendations:', error);
        return recommendationService.getDirectPreferenceRecommendations(userId, options.limit || 10);
      }
    });
  },

  /**
   * Generate user embedding (placeholder for compatibility)
   */
  generateUserEmbedding: async (userId) => {
    log('generateUserEmbedding called - this is a placeholder function');
    return { success: true, message: 'Embedding generation not implemented in this version' };
  },

  /**
   * Force clear all caches and refresh recommendations
   */
  forceRefresh: () => {
    // Clear all caches
    recommendationService.clearCache();
    pendingRequests.clear();
    log('All caches and pending requests cleared - ready for fresh data');
  }
};

export default recommendationService;
