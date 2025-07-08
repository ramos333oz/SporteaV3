import { supabase } from './supabase';

/**
 * Recommendation service for fetching and tracking personalized match recommendations
 */

// Configuration
const DEBUG_MODE = process.env.NODE_ENV !== 'production'; // Only log in development
const LOG_PREFIX = '[Sportea Recommendation Service]';
const USE_SIMPLIFIED_VECTOR_RECOMMENDATIONS = true; // Use the simplified vector-based system for academic demonstration
const USE_COMBINED_RECOMMENDATIONS = false; // Use the new combined system (Direct + Collaborative)
const USE_DIRECT_PREFERENCE_MATCHING = false;

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
   * Get simplified vector-based recommendations (for academic demonstration)
   */
  getSimplifiedVectorRecommendations: async (userId, options = {}) => {
    return getCachedOrNewRequest(`simplified-vector-${userId}`, async () => {
      try {
        const { limit = 10, offset = 0, minSimilarity = 0.00001 } = options;
        const requestId = generateRequestId();

        log('Starting simplified vector recommendation request', requestId, { userId, limit, minSimilarity });

        const { data, error } = await supabase.functions.invoke('simplified-recommendations', {
          body: { userId, limit, offset, minSimilarity }
        });

        if (error) {
          logError('Error getting simplified vector recommendations:', error);
          return {
            recommendations: [],
            metadata: {
              count: 0,
              type: 'error',
              message: 'Unable to load vector-based recommendations',
              error: error.message,
              algorithm: 'simplified-vector-similarity'
            }
          };
        }

        log('Received simplified vector recommendations', requestId, {
          count: data?.count || 0,
          algorithm: data?.algorithm || 'simplified-vector-similarity',
          totalAnalyzed: data?.total_matches_analyzed || 0,
          totalSimilar: data?.total_similar_matches || 0
        });

        // Transform the recommendations to match the expected format
        const transformedRecommendations = (data.recommendations || []).map(rec => ({
          match: rec.match,
          score: rec.similarity_score,
          explanation: rec.explanation,
          source: 'simplified-vector-similarity',
          mathematical_breakdown: rec.mathematical_breakdown,
          similarity_percentage: rec.similarity_percentage
        }));

        return {
          recommendations: transformedRecommendations,
          metadata: {
            count: data.count || 0,
            algorithm: data.algorithm || 'simplified-vector-similarity',
            mathematical_approach: data.mathematical_approach || 'Pure cosine similarity',
            total_matches_analyzed: data.total_matches_analyzed || 0,
            total_similar_matches: data.total_similar_matches || 0,
            min_similarity_threshold: data.min_similarity_threshold || minSimilarity,
            vector_dimensions: data.vector_dimensions || 384,
            using: 'simplified-vector-system',
            requestId
          }
        };
      } catch (error) {
        logError('Unexpected error in getSimplifiedVectorRecommendations:', error);
        return recommendationService.getFallbackRecommendations(userId, options.limit || 10);
      }
    });
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

      if (USE_SIMPLIFIED_VECTOR_RECOMMENDATIONS) {
        log('Using simplified vector-based recommendation system for academic demonstration');
        return recommendationService.getSimplifiedVectorRecommendations(userId, { limit, offset, minSimilarity: 0.00001 });
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
   * Generate user embedding by calling the queue processing function
   * This triggers vector regeneration based on current user preferences
   */
  generateUserEmbedding: async (userId) => {
    log('generateUserEmbedding called for user:', userId);

    try {
      // First, ensure there's a queue entry for this user
      const { error: queueError } = await supabase
        .from('embedding_queue')
        .upsert({
          entity_id: userId,
          entity_type: 'user',
          status: 'pending',
          priority: 10, // High priority for manual triggers
          attempts: 0,
          max_attempts: 3,
          error: null
        }, {
          onConflict: 'entity_id,entity_type'
        });

      if (queueError) {
        logError('Failed to create queue entry:', queueError);
        return {
          success: false,
          error: `Failed to queue vector update: ${queueError.message}`
        };
      }

      // Call the process-embedding-queue function to process it
      const { data, error } = await supabase.functions.invoke('process-embedding-queue', {
        body: { batchSize: 1, dryRun: false }
      });

      if (error) {
        logError('Queue processing error in generateUserEmbedding:', error);
        return {
          success: false,
          error: `Queue processing error: ${error.message}`
        };
      }

      // Check if the processing was successful
      if (data && data.results && data.results.processed > 0) {
        log('User embedding generated successfully for user:', userId);
        return {
          success: true,
          message: 'User preferences updated successfully',
          data: data
        };
      } else {
        logError('Queue processing returned no results:', data);
        return {
          success: false,
          error: `Queue processing failed: ${JSON.stringify(data)}`
        };
      }
    } catch (error) {
      logError('Exception in generateUserEmbedding:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
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
