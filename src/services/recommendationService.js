import { supabase } from './supabase';

/**
 * Recommendation service for fetching and tracking personalized match recommendations
 */

// Configuration
const DEBUG_MODE = true;
const LOG_PREFIX = '[Sportea Recommendation Service]';
const USE_DIAGNOSTIC_ENDPOINT = false; // Set to false to use production endpoint
const USE_SIMPLIFIED_ENDPOINT = true; // Set to true to use simplified recommendation system
const USE_DIRECT_DB_QUERY = false; // Set to false to use the new Edge Function
const USE_LIGHTWEIGHT_RECOMMENDATIONS = true; // Set to true to use the new lightweight recommendation system
const MAX_RETRIES = 2; // Number of retries for edge function calls
const RETRY_DELAY_MS = 1000; // Delay between retries
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const EMBEDDING_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REQUEST_THROTTLE_MS = 500; // Reduced from default (likely 2000-5000ms) to 500ms

// Client-side cache
let recommendationsCache = {
  data: null,
  timestamp: 0,
  userId: null
};

// Request throttling
let lastRequestTime = 0;
let pendingRequests = new Map(); // Map of request promises indexed by userId

// Cache for user embedding status to avoid unnecessary refreshes
let userEmbeddingCache = {
  userId: null,
  lastRefreshed: 0
};

// Debug tracking objects
const requestDebugInfo = new Map();

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
 * Check if a function call is being throttled, and if not, record the timestamp
 * @returns {boolean} true if throttled, false if allowed to proceed
 */
function isThrottled() {
  const now = Date.now();
  if (now - lastRequestTime < REQUEST_THROTTLE_MS) {
    return true;
  }
  lastRequestTime = now;
  return false;
}

/**
 * Get a cached or new promise for a request
 * @param {string} userId - The user ID for this request
 * @param {Function} requestFn - Function to call that returns a promise 
 * @returns {Promise} - Either a cached promise or a new one
 */
function getCachedOrNewRequest(userId, requestFn) {
  // If there's already a pending request for this user, return it
  if (pendingRequests.has(userId)) {
    log(`Returning existing promise for user ${userId}`);
    return pendingRequests.get(userId);
  }
  
  // Otherwise create a new request and cache it
  const promise = requestFn().finally(() => {
    // Remove this request from pending once it completes
    pendingRequests.delete(userId);
  });
  
  pendingRequests.set(userId, promise);
  return promise;
}

/**
 * Generate a unique request ID for tracking requests through the system
 * @returns {string} A unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log a message with optional data if debug mode is enabled
 * @param  {...any} args Arguments to log
 */
function logDebug(...args) {
  if (!DEBUG_MODE) return;
  
  // Initialize request debug info if it doesn't exist
  const requestId = generateRequestId();
  if (!requestDebugInfo.has(requestId)) {
    requestDebugInfo.set(requestId, {
      id: requestId, 
      startTime: Date.now(),
      stages: []
    });
  }
  
  const info = requestDebugInfo.get(requestId);
  info.stages.push({
    stage: args[0],
    timestamp: Date.now(),
    elapsed: Date.now() - info.startTime,
    data: args.slice(1)
  });
  
  // Log to console
  log(...args);
  
  // Store updated info
  requestDebugInfo.set(requestId, info);
}

/**
 * Summarize debug information for a request and log it
 * @param {string} requestId - The unique request ID
 * @param {string} outcome - The final outcome of the request
 */
function summarizeRequestDebug(requestId, outcome) {
  if (!DEBUG_MODE || !requestDebugInfo.has(requestId)) return;
  
  const info = requestDebugInfo.get(requestId);
  const totalTime = Date.now() - info.startTime;
  
  log(`[DEBUG SUMMARY for ${requestId}]`, {
    outcome,
    totalTimeMs: totalTime,
    stages: info.stages.map(s => `${s.stage} (${s.elapsed}ms)`)
  });
  
  // Clean up old debug info after a while to prevent memory leaks
  setTimeout(() => {
    requestDebugInfo.delete(requestId);
  }, 60000);
}

const recommendationService = {
  /**
   * Sleep utility for retry delay
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Clear the recommendations cache
   */
  clearCache: () => {
    recommendationsCache = {
      data: null,
      timestamp: 0,
      userId: null
    };
    log('Recommendations cache cleared');
  },
  
  /**
   * Invalidate cache for a specific user
   * @param {string} userId - The user ID to invalidate cache for
   */
  invalidateUserCache: (userId) => {
    if (recommendationsCache.userId === userId) {
      recommendationsCache.timestamp = 0; // This will force a refresh on next fetch
      log(`Cache invalidated for user ${userId}`);
    } else {
      log(`No cache found for user ${userId} to invalidate`);
    }
    
    // Also mark that user's embeddings should be refreshed
    userEmbeddingCache = {
      userId: null,
      lastRefreshed: 0
    };
    
    // Remove any stored embedding error state to allow retries
    localStorage.removeItem('sportea_embedding_error');
    localStorage.removeItem('sportea_embedding_error_time');
    
    // Clear any pending requests for this user
    if (pendingRequests.has(userId)) {
      log(`Clearing pending request for user ${userId}`);
      pendingRequests.delete(userId);
    }
  },
  
  /**
   * Check if user embeddings need refreshing based on time threshold
   * @param {string} userId - The user ID to check
   * @returns {boolean} - True if embeddings should be refreshed
   */
  shouldRefreshEmbeddings: (userId) => {
    // If it's a different user or we've never refreshed, we should refresh
    if (userEmbeddingCache.userId !== userId) {
      return true;
    }
    
    // Check if it's been long enough since the last refresh
    const now = Date.now();
    return (now - userEmbeddingCache.lastRefreshed) > EMBEDDING_REFRESH_INTERVAL_MS;
  },
  
  /**
   * Get lightweight recommendations using the new direct preference matching system
   * @param {string} userId - The user ID to get recommendations for
   * @param {Object} options - Additional options
   * @param {number} [options.limit=10] - Maximum number of recommendations to return
   * @param {number} [options.offset=0] - Offset for pagination
   * @returns {Promise<Object>} - Recommendations and metadata
   */
  getLightweightRecommendations: async (userId, options = {}) => {
    try {
      const { limit = 10, offset = 0 } = options;
      const requestId = generateRequestId();
      
      logDebug('Starting lightweight recommendation request', requestId, { userId, limit, offset });
      
      // Call the get-recommendations-light Edge Function
      const { data, error } = await supabase.functions.invoke('get-recommendations-light', {
        body: { limit, offset }
      });

      if (error) {
        logError('Error getting lightweight recommendations:', error);
        summarizeRequestDebug(requestId, 'error');
        throw error;
      }

      logDebug('Received lightweight recommendations', requestId, { 
        count: data?.count || 0,
        total: data?.total || 0
      });
      
      summarizeRequestDebug(requestId, 'success');
      
      return {
        recommendations: data.data || [],
        metadata: {
          count: data.count || 0,
          total: data.total || 0,
          using: 'lightweight',
          requestId
        }
      };
    } catch (error) {
      logError('Unexpected error in getLightweightRecommendations:', error);
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total: 0,
          error: error.message,
          using: 'lightweight'
        }
      };
    }
  },

  /**
   * Get personalized recommendations for a user
   * @param {string} userId - The user ID to get recommendations for
   * @param {Object} options - Additional options
   * @param {number} [options.limit=10] - Maximum number of recommendations to return
   * @param {Array<string>} [options.excludeIds=[]] - Match IDs to exclude from recommendations
   * @param {boolean} [options.prioritizeRawPreferences=false] - Whether to prioritize raw preferences over vector similarity
   * @param {Object} [options.filters] - Additional filters to apply
   * @param {string} [options.filters.ageRange] - Filter by age range (e.g. "18-25")
   * @param {string} [options.filters.participantCount] - Filter by participant count preference ("small", "medium", "large")
   * @param {string} [options.filters.duration] - Filter by duration preference ("short", "medium", "long")
   * @param {string} [options.filters.skillLevel] - Filter by skill level ("beginner", "intermediate", "advanced", "professional")
   * @param {string} [options.filters.playStyle] - Filter by play style ("casual" or "competitive")
   * @param {string} [options.filters.gender] - Filter by gender preference
   * @param {string} [options.filters.facility] - Filter by facility ID
   * @param {string} [options.filters.dateFilter] - Filter by date range ("today", "tomorrow", "thisWeek", "nextWeek")
   * @param {Array} [options.filters.availableDays] - Filter by days of week user is available
   * @param {Object} [options.filters.availableHours] - Filter by time slots user is available
   * @returns {Promise<Object>} - Recommendations and metadata
   */
  getRecommendations: async (userId, options = {}) => {
    try {
      const {
        limit = 10,
        excludeIds = [],
        prioritizeRawPreferences = false,
        filters = {},
        offset = 0
      } = options;
      
      log(`Getting recommendations for user ${userId} with options:`, { 
        limit, 
        offset,
        excludeIdsCount: excludeIds.length,
        prioritizeRawPreferences,
        filters: Object.keys(filters)
      });
      
      // Use the new lightweight recommendation system if enabled
      if (USE_LIGHTWEIGHT_RECOMMENDATIONS) {
        log('Using lightweight recommendation system');
        return recommendationService.getLightweightRecommendations(userId, { limit, offset });
      }
      
      // Generate a unique request ID for tracking
      const requestId = generateRequestId();
      logDebug(requestId, 'get_recommendations_start', { userId, options });
      
      // If direct DB query approach is enabled, use it first
      if (USE_DIRECT_DB_QUERY) {
        try {
          log('Using direct DB query approach for recommendations');
          const directResult = await recommendationService.getDirectDbRecommendations(userId, options);
          
          if (directResult && directResult.recommendations) {
            logDebug(requestId, 'get_recommendations_success', { 
              source: 'direct_db_query',
              recommendationsCount: directResult.recommendations.length,
              type: directResult.type
            });
            
            // Log summary of the request
            summarizeRequestDebug(requestId, 'complete_direct_db');
            return directResult;
          }
        } catch (directDbError) {
          logError('Direct DB query approach failed:', directDbError);
          // Continue to edge function approach
        }
      }
      
      // Call the edge function to get recommendations
      let result;
      let retryCount = 0;
      const maxRetries = MAX_RETRIES;
      
      while (retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            log(`Retry attempt ${retryCount} for user ${userId}`);
            await recommendationService.sleep(RETRY_DELAY_MS);
          }
          
          // Select which endpoint to use based on configuration
          const endpoint = USE_DIAGNOSTIC_ENDPOINT 
            ? 'get-recommendations-diagnostic' 
            : USE_SIMPLIFIED_ENDPOINT 
              ? 'get-recommendations-light'
              : 'get-recommendations';
          
          log(`Using recommendation endpoint: ${endpoint}`);
              
          // Try using the Supabase SDK first
          const { data, error } = await supabase.functions.invoke(endpoint, {
            body: { 
              userId, 
              limit, 
              excludeIds,
              prioritizeRawPreferences,
              filters
            }
          });
          
          if (error) {
            logError(`Supabase SDK error (attempt ${retryCount + 1}):`, error);
            throw error;
          }
          
          // If we got data, use it
          if (data) {
            result = data;
            logDebug(requestId, 'get_recommendations_success', { 
              source: 'supabase_sdk',
              recommendationsCount: data.recommendations?.length,
              type: data.type
            });
            break;
          } else {
            throw new Error('Empty response from Supabase SDK');
          }
        } catch (invokeError) {
          // If we've reached max retries, try the direct fetch method as a last resort
          if (retryCount === maxRetries) {
            log('Trying direct fetch method as fallback');
            
            // Use the same endpoint we determined earlier
            const directResult = await recommendationService.directEdgeFunctionCall(
              endpoint, // Use the endpoint variable defined above
              { 
                userId, 
                limit, 
                excludeIds,
                prioritizeRawPreferences,
                filters
              },
              requestId
            );
            
            if (directResult.error) {
              logError('Direct fetch method also failed:', directResult.error);
              throw directResult.error;
            }
            
            result = directResult.data;
            logDebug(requestId, 'get_recommendations_success', { 
              source: 'direct_fetch',
              recommendationsCount: directResult.data.recommendations?.length,
              type: directResult.data.type
            });
            break;
          }
          
          retryCount++;
        }
      }
      
      // If we still don't have a result, try the fallback method
      if (!result) {
        log('All methods failed, using database fallback');
        result = await recommendationService.getFallbackRecommendations(userId, limit);
        logDebug(requestId, 'get_recommendations_fallback', { 
          recommendationsCount: result.recommendations?.length
        });
      }
      
      // Log summary of the request
      summarizeRequestDebug(requestId, 'complete');
      
      return result;
    } catch (error) {
      console.error('Exception in getRecommendations:', error);
      
      // Try to get fallback recommendations
      try {
        log('Error occurred, using database fallback');
        const fallbackResult = await recommendationService.getFallbackRecommendations(userId, options.limit || 10);
        return fallbackResult;
      } catch (fallbackError) {
        // If even the fallback fails, return an error response
        return { 
          error: error.message || 'An unexpected error occurred',
          recommendations: [],
          type: 'error',
          message: 'Failed to get recommendations'
        };
      }
    }
  },

  /**
   * Track when a user interacts with a recommendation
   * @param {string} userId - The user ID
   * @param {string} matchId - The match ID
   * @param {string} action - The action taken (e.g., "click", "join", "dismiss")
   * @param {string} recommendationType - The type of recommendation that was shown
   * @param {number} score - The recommendation score
   */
  trackRecommendationAction: async (
    userId, 
    matchId, 
    action, 
    recommendationType = 'unknown',
    score = 0
  ) => {
    try {
      const { error } = await supabase
        .from('recommendation_analytics')
        .insert({
          user_id: userId,
          match_id: matchId,
          action,
          recommendation_type: recommendationType,
          score
        });
      
      if (error) {
        console.error('Error tracking recommendation action:', error);
      }
    } catch (error) {
      console.error('Exception tracking recommendation action:', error);
    }
  },

  /**
   * Generate or update embeddings for a specific match
   * @param {string} matchId - The match ID to generate embeddings for
   * @returns {Promise<Object>} - Result of the embedding generation
   */
  generateMatchEmbedding: async (matchId) => {
    try {
      log(`Generating embeddings for match: ${matchId}`);
      
      // Check if this request is throttled
      if (isThrottled()) {
        log('Match embedding generation throttled');
        return { 
          success: false, 
          error: 'Request throttled, try again later', 
          throttled: true 
        };
      }
      
      const { data, error } = await supabase.functions.invoke('generate-match-embeddings', {
        body: { matchId },
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Info': 'sportea-app-v3'
        }
      });

      if (error) {
        logError(`Error in generate-match-embeddings function:`, error);
        throw error;
      }
      
      log(`Successfully generated embeddings for match ${matchId}`);
      return { success: true, data };
    } catch (error) {
      logError('Error generating match embedding:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error' 
      };
    }
  },

  /**
   * Generate or refresh user preference embedding for better recommendations
   * @param {string} userId - The user ID to generate embeddings for
   * @returns {Promise<object>} Status result
   */
  generateUserEmbedding: async (userId) => {
    try {
      if (!userId) {
        logError('Missing required userId for generateUserEmbedding');
        return { success: false, error: 'Missing user ID' };
      }
      
      // Check if we need to throttle this request
      if (isThrottled()) {
        log('User embedding generation throttled');
        return { 
          success: false, 
          error: 'Request throttled, try again later', 
          throttled: true 
        };
      }
      
      // Check if we recently had a fatal error with the embedding function
      const lastEmbeddingError = localStorage.getItem('sportea_embedding_error');
      const lastErrorTime = parseInt(localStorage.getItem('sportea_embedding_error_time') || '0');
      const now = Date.now();
      
      // If we've had a fatal error in the last 4 hours, don't retry
      if (lastEmbeddingError === 'fatal' && lastErrorTime && (now - lastErrorTime < 4 * 60 * 60 * 1000)) {
        log('Skipping embedding generation due to recent fatal error');
        return { 
          success: false, 
          error: 'Embedding service temporarily unavailable', 
          skipReason: 'recent_error'
        };
      }
      
      // Use cached promise approach to prevent duplicate calls
      return getCachedOrNewRequest(`embedding-${userId}`, async () => {
        log(`Generating user embeddings for user: ${userId}`);
        
        try {
          // Include explicit reference to new preference fields in the payload
          const { data, error } = await supabase.functions.invoke('generate-user-embeddings', {
            body: { 
              userId,
              includeFields: [
                'sport_preferences',
                'available_days',
                'available_hours',
                'preferred_facilities',
                'faculty_info', // New faculty field
                'home_location',
                'play_style'
              ] 
            },
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Info': 'sportea-app-v3'
            }
          });

          if (error) {
            // Check if this is a 500 error (likely transformer model issue)
            if (error.message && error.message.includes('Edge Function returned a non-2xx status code')) {
              // Record the error to prevent immediate retries
              localStorage.setItem('sportea_embedding_error', 'fatal');
              localStorage.setItem('sportea_embedding_error_time', now.toString());
              logError(`Fatal error in generate-user-embeddings function:`, error);
            } else {
              // For other errors, just log but don't mark as fatal
              logError(`Error in generate-user-embeddings function:`, error);
            }
            
            // Return failure but allow the app to continue
            return { success: false, error: error.message || 'Unknown error' };
          }
          
          log(`Successfully generated embeddings for user ${userId}`);
          
          // Clear any previous error state
          localStorage.removeItem('sportea_embedding_error');
          localStorage.removeItem('sportea_embedding_error_time');
          
          // Record successful embedding generation time
          localStorage.setItem('sportea_last_embedding_time', now.toString());
          
          // Update the embedding cache timestamp
          userEmbeddingCache = {
            userId,
            lastRefreshed: Date.now()
          };
          
          // Invalidate recommendations cache for this user
          if (recommendationsCache.userId === userId) {
            log('Invalidating recommendations cache due to embedding update');
            recommendationsCache.timestamp = 0;
          }
          
          return { success: true, data };
        } catch (invokeError) {
          // Handle unexpected errors
          logError('Exception while generating user embedding:', invokeError);
          return { success: false, error: invokeError.message || 'Unknown error' };
        }
      });
    } catch (error) {
      logError('Error generating user embedding:', error);
      // Return error object instead of throwing to make function more resilient
      return { 
        success: false, 
        error: error.message || 'Unknown error generating user embedding'
      };
    }
  },

  /**
   * Make a direct fetch API call to the Supabase edge function
   * This bypasses the Supabase SDK's invoke method which may be causing empty request issues
   * @param {string} endpoint - The edge function endpoint name
   * @param {object} payload - The request payload
   * @param {string} requestId - Unique request ID for tracking
   * @returns {Promise<object>} - The response data
   */
  directEdgeFunctionCall: async (endpoint, payload, requestId) => {
    try {
      const anon_key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anon_key) {
        throw new Error('Missing Supabase anon key');
      }
      
      const projectId = supabase.projectId || 'fcwwuiitsghknsvnsrxp'; // Fallback to hardcoded project ID if needed
      const url = `https://${projectId}.supabase.co/functions/v1/${endpoint}`;
      
      logDebug(requestId, 'direct_fetch_start', { url, payloadSize: JSON.stringify(payload).length });
      
      // Stringify payload manually to ensure proper JSON format
      const jsonPayload = JSON.stringify(payload);
      logDebug(requestId, 'direct_fetch_payload_stringified', { 
        jsonPayload,
        length: jsonPayload.length,
        valid: !!jsonPayload && jsonPayload.startsWith('{') && jsonPayload.endsWith('}')
      });
      
      // Make the direct fetch call
      const fetchStart = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anon_key}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client-Info': 'sportea-app-v3'
        },
        body: jsonPayload
      });
      
      const fetchTime = Date.now() - fetchStart;
      logDebug(requestId, 'direct_fetch_response', { 
        status: response.status, 
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        time: fetchTime
      });
      
      // Check for non-2xx status codes
      if (!response.ok) {
        const errorText = await response.text();
        logDebug(requestId, 'direct_fetch_error', { errorText });
        throw new Error(`Edge Function returned status code ${response.status}`);
      }
      
      // Attempt to parse the response as JSON
      try {
        const responseText = await response.text();
        logDebug(requestId, 'direct_fetch_response_text', { 
          text: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
          length: responseText.length 
        });
        
        const data = JSON.parse(responseText);
        logDebug(requestId, 'direct_fetch_success', { 
          recommendationsCount: data?.recommendations?.length,
          type: data?.type
        });
        
        return { data, error: null };
      } catch (parseError) {
        logDebug(requestId, 'direct_fetch_parse_error', { error: parseError.toString() });
        throw parseError;
      }
    } catch (error) {
      logDebug(requestId, 'direct_fetch_fatal_error', { error: error.toString() });
      return { data: null, error };
    }
  },

  /**
   * Check the connection status to Supabase
   * @returns {object} Connection status information
   */
  checkConnectionStatus: () => {
    try {
      // Try to get connection status from our realtime service if available
      if (window.realtimeService && typeof window.realtimeService.getConnectionStatus === 'function') {
        return window.realtimeService.getConnectionStatus();
      }
      
      // Check if there's a recent connection error recorded
      const lastConnectionError = localStorage.getItem('sportea_last_connection_error');
      const lastConnectionTime = localStorage.getItem('sportea_last_connection_time');
      
      if (lastConnectionError && lastConnectionTime) {
        const errorTime = parseInt(lastConnectionTime);
        const now = Date.now();
        
        // If there was a connection error in the last 60 seconds, consider it a connection issue
        if (now - errorTime < 60000) {
          return {
            status: 'error',
            lastError: lastConnectionError,
            lastErrorTime: new Date(errorTime).toISOString()
          };
        }
      }
      
      // Default to connected if we can't determine otherwise
      return { status: 'connected' };
    } catch (e) {
      // If checking status fails, assume connected to avoid unnecessary fallbacks
      return { status: 'connected' };
    }
  },
  
  /**
   * Get fallback recommendations via direct database query
   * @param {string} userId - The user ID to get recommendations for
   * @param {number} limit - Maximum number of recommendations to return
   * @returns {Promise<object>} - Recommendations object
   */
  getFallbackRecommendations: async (userId, limit = 10) => {
    log('Getting fallback recommendations via direct database query');
    
    try {
      const normalizedLimit = Math.min(Math.max(1, Number(limit) || 10), 20);
      
      // Fetch upcoming matches directly from the database
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
        .order('start_time', { ascending: true })
        .limit(normalizedLimit);
        
      if (matchError) throw matchError;
      
      // Transform the match data to match the recommendation format
      const recommendations = matchData.map(match => ({
        match: {
          ...match,
          sport: match.sports,
          location: match.locations
        },
        score: 0.75, // Default score for fallback recommendations
        explanation: 'Upcoming matches you might be interested in',
        source: 'direct-query-fallback'
      }));
      
      // Return the fallback result
      return {
        recommendations,
        type: 'fallback',
        message: 'Upcoming matches you might be interested in',
        isFallback: true,
        source: 'direct-query'
      };
    } catch (fallbackError) {
      logError('Error in fallback recommendations:', fallbackError);
      throw fallbackError;
    }
  },

  /**
   * Apply client-side filtering to recommendations
   * @param {Array} recommendations - The recommendations to filter
   * @param {Object} filters - Filters to apply
   * @param {string} [filters.ageRange] - Filter by age range
   * @param {string} [filters.participantCount] - Filter by participant count
   * @param {string} [filters.duration] - Filter by duration
   * @param {string} [filters.skillLevel] - Filter by skill level
   * @param {string} [filters.playStyle] - Filter by play style
   * @param {string} [filters.gender] - Filter by gender preference
   * @param {string} [filters.facility] - Filter by facility ID
   * @param {string} [filters.dateFilter] - Filter by date range
   * @param {Array} [filters.availableDays] - Filter by days of week user is available
   * @param {Object} [filters.availableHours] - Filter by time slots user is available
   * @returns {Array} - Filtered recommendations
   */
  filterRecommendations: (recommendations, filters = {}) => {
    if (!recommendations || !recommendations.length) return [];
    if (!filters || Object.keys(filters).length === 0) return recommendations;
    
    const { 
      ageRange, participantCount, duration, skillLevel, 
      playStyle, gender, facility, dateFilter,
      availableDays, availableHours
    } = filters;
    
    // Define participant count ranges
    const countRanges = {
      'small': [2, 6],
      'medium': [7, 12],
      'large': [13, 100]
    };
    
    // Define duration ranges in minutes
    const durationRanges = {
      'short': [15, 45],
      'medium': [46, 90],
      'long': [91, 180]
    };
    
    return recommendations.filter(rec => {
      const match = rec.match;
      let passesFilter = true;
      
      // Filter by age range if specified
      if (ageRange && match.age_range) {
        passesFilter = passesFilter && (match.age_range === ageRange);
      }
      
      // Filter by participant count if specified
      if (participantCount && match.max_participants && countRanges[participantCount]) {
        const [min, max] = countRanges[participantCount];
        passesFilter = passesFilter && (match.max_participants >= min && match.max_participants <= max);
      }
      
      // Filter by duration if specified
      if (duration && match.duration_minutes && durationRanges[duration]) {
        const [min, max] = durationRanges[duration];
        passesFilter = passesFilter && (match.duration_minutes >= min && match.duration_minutes <= max);
      }
      
      // Skill level filter
      if (skillLevel && match.skill_level) {
        passesFilter = passesFilter && (match.skill_level.toLowerCase() === skillLevel.toLowerCase());
      }
      
      // Play style filter
      if (playStyle && match.skill_level) {
        const matchSkillToStyle = {
          'beginner': 'casual',
          'intermediate': null,
          'advanced': 'competitive',
          'professional': 'competitive'
        };
        const matchStyle = matchSkillToStyle[match.skill_level.toLowerCase()];
        
        // If skill level maps to a specific play style, check it matches
        // For intermediate (null), we'll count it as a match regardless of play style
        if (matchStyle !== null) {
          passesFilter = passesFilter && (playStyle === matchStyle);
        }
      }
      
      // Gender filter
      if (gender && match.gender_preference) {
        passesFilter = passesFilter && 
          (match.gender_preference === 'any' || match.gender_preference === gender);
      }
      
      // Facility filter
      if (facility && match.location_id) {
        passesFilter = passesFilter && (match.location_id.toString() === facility.toString());
      }
      
      // Date filter
      if (dateFilter && match.start_time) {
        const matchDate = new Date(match.start_time);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (dateFilter === 'today') {
          const endOfDay = new Date(today);
          endOfDay.setHours(23, 59, 59, 999);
          passesFilter = passesFilter && (matchDate >= today && matchDate <= endOfDay);
        } else if (dateFilter === 'tomorrow') {
          const endOfTomorrow = new Date(tomorrow);
          endOfTomorrow.setHours(23, 59, 59, 999);
          passesFilter = passesFilter && (matchDate >= tomorrow && matchDate <= endOfTomorrow);
        } else if (dateFilter === 'thisWeek') {
          const endOfWeek = new Date(today);
          endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
          endOfWeek.setHours(23, 59, 59, 999);
          passesFilter = passesFilter && (matchDate >= today && matchDate <= endOfWeek);
        } else if (dateFilter === 'nextWeek') {
          const startOfNextWeek = new Date(today);
          startOfNextWeek.setDate(startOfNextWeek.getDate() + (7 - startOfNextWeek.getDay()));
          const endOfNextWeek = new Date(startOfNextWeek);
          endOfNextWeek.setDate(endOfNextWeek.getDate() + 6);
          endOfNextWeek.setHours(23, 59, 59, 999);
          passesFilter = passesFilter && (matchDate >= startOfNextWeek && matchDate <= endOfNextWeek);
        }
      }
      
      return passesFilter;
    });
  },

  /**
   * Get recommendations using a direct database query approach
   * This implements the simplified recommendation system directly in the frontend
   * as a fallback when the edge function is not available
   * 
   * @param {string} userId - The user ID to get recommendations for
   * @param {Object} options - Additional options 
   * @returns {Promise<Object>} - Recommendations and metadata
   */
  getDirectDbRecommendations: async (userId, options = {}) => {
    try {
      const startTime = Date.now();
      const { limit = 10, excludeIds = [] } = options;
      let directMatches = 0;
      let collaborativeMatches = 0;
      let popularMatches = 0;
      
      log(`Getting direct DB recommendations for user ${userId}`);
      
      // 1. Get user profile and preferences
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError || !userProfile) {
        throw new Error(`User not found: ${userError?.message || 'Unknown error'}`);
      }
      
      // 2. Get user preferences
      const { data: userPreferences, error: prefError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      // 3. Get all active matches (not expired, not full, not created by user)
      const now = new Date().toISOString();
      const { data: allMatches, error: matchError } = await supabase
        .from('matches')
        .select('*, profiles(username, avatar_url)')
        .neq('creator_id', userId) // Exclude matches created by user
        .gt('date', now.split('T')[0]) // Match hasn't happened yet
        .eq('is_active', true); // Match is active
      
      if (matchError) {
        throw new Error(`Failed to fetch matches: ${matchError.message}`);
      }
      
      if (!allMatches || allMatches.length === 0) {
        return {
          recommendations: [],
          timestamp: new Date().toISOString(),
          count: 0,
          stats: {
            directMatches: 0,
            collaborativeMatches: 0,
            popularMatches: 0,
            processingTimeMs: Date.now() - startTime
          }
        };
      }
      
      // 4. Get user's previous activity
      const { data: userActivity } = await supabase
        .from('match_participants')
        .select('match_id')
        .eq('user_id', userId);
      
      // 5. Find other users with similar preferences
      const { data: similarUsers } = await supabase
        .from('user_preferences')
        .select('user_id')
        .in('preferred_sports', userPreferences?.preferred_sports || [])
        .neq('user_id', userId)
        .limit(20);
      
      // 6. Get matches that similar users participated in
      let similarUsersMatches = [];
      if (similarUsers && similarUsers.length > 0) {
        const similarUserIds = similarUsers.map(u => u.user_id);
        const { data: similarParticipations } = await supabase
          .from('match_participants')
          .select('match_id')
          .in('user_id', similarUserIds);
        
        if (similarParticipations) {
          similarUsersMatches = similarParticipations.map(p => p.match_id);
        }
      }
      
      // 7. Score and rank matches
      const scoredMatches = allMatches
        .filter(match => !excludeIds.includes(match.id)) // Filter out excluded matches
        .map(match => {
          // Initialize scores for different factors
          let directMatchScore = 0;
          let collaborativeScore = 0;
          let activityScore = 0;
          let explanations = [];
          
          // A. Direct preference matching (60% weight)
          // Sport preference match
          if (userPreferences?.preferred_sports?.includes(match.sport)) {
            directMatchScore += 30;
            explanations.push(`Matches your preferred sport: ${match.sport}`);
          }
          
          // Skill level match
          if (userPreferences?.skill_level === match.skill_level) {
            directMatchScore += 15;
            explanations.push(`Matches your skill level: ${match.skill_level}`);
          } else if (
            (userPreferences?.skill_level === 'beginner' && match.skill_level === 'intermediate') ||
            (userPreferences?.skill_level === 'intermediate' && 
            (match.skill_level === 'beginner' || match.skill_level === 'advanced')) ||
            (userPreferences?.skill_level === 'advanced' && match.skill_level === 'intermediate')
          ) {
            directMatchScore += 5; // Partial match for adjacent skill levels
            explanations.push(`Similar to your skill level: ${match.skill_level}`);
          }
          
          // Location preference if available
          if (userPreferences?.preferred_locations?.includes(match.location)) {
            directMatchScore += 10;
            explanations.push(`At your preferred location: ${match.location}`);
          }
          
          // Availability match (day of week)
          const matchDate = new Date(match.date);
          const dayOfWeek = matchDate.getDay();
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          if (userPreferences?.availability?.includes(dayNames[dayOfWeek].toLowerCase())) {
            directMatchScore += 5;
            explanations.push(`On ${dayNames[dayOfWeek]}, which matches your availability`);
          }
          
          // B. Collaborative filtering (30% weight)
          if (similarUsersMatches.includes(match.id)) {
            collaborativeScore = 30;
            explanations.push('Players with similar interests joined this match');
            collaborativeMatches++;
          }
          
          // C. Activity-based scoring (10% weight)
          // More participants = more popular
          const participantRatio = match.current_participants / match.max_participants;
          if (participantRatio > 0.5) {
            activityScore += 5;
            explanations.push('Popular match that\'s filling up');
            popularMatches++;
          } else if (participantRatio > 0.25) {
            activityScore += 3;
            explanations.push('Match has some players already');
          }
          
          // Recently created matches
          const createdDate = new Date(match.created_at);
          const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceCreation < 3) {
            activityScore += 5;
            explanations.push('Recently created match');
          }
          
          // Calculate total score (weights: 60% direct, 30% collaborative, 10% activity)
          const totalScore = (directMatchScore * 0.6) + (collaborativeScore * 0.3) + (activityScore * 0.1);
          
          // Track direct matches
          if (directMatchScore > 0) {
            directMatches++;
          }
          
          return {
            id: crypto.randomUUID(),
            match_id: match.id,
            user_id: userId,
            score: Math.round(totalScore),
            explanation: explanations.join('. '),
            created_at: new Date().toISOString(),
            title: match.title,
            description: match.description,
            location: match.location,
            sport: match.sport,
            skill_level: match.skill_level,
            date: match.date,
            time: match.time,
            match_details: match
          };
        });
      
      // Sort by score and limit
      const sortedRecommendations = scoredMatches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;
      
      // Return recommendations
      return {
        recommendations: sortedRecommendations,
        timestamp: new Date().toISOString(),
        count: sortedRecommendations.length,
        type: 'direct_db',
        stats: {
          directMatches,
          collaborativeMatches,
          popularMatches,
          processingTimeMs
        }
      };
    } catch (error) {
      logError('Error getting direct DB recommendations:', error);
      throw error;
    }
  },
};

export default recommendationService;
