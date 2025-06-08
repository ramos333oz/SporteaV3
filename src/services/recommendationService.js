import { supabase } from './supabase';

/**
 * Recommendation service for fetching and tracking personalized match recommendations
 */

// Configuration
const DEBUG_MODE = true;
const LOG_PREFIX = '[Sportea Recommendation Service]';
const USE_DIAGNOSTIC_ENDPOINT = false; // Switch to false to use production endpoint instead of diagnostic
const MAX_RETRIES = 2; // Number of retries for edge function calls
const RETRY_DELAY_MS = 1000; // Delay between retries
const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache recommendations for 5 minutes

// Client-side cache
let recommendationsCache = {
  data: null,
  timestamp: 0,
  userId: null
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

const recommendationService = {
  /**
   * Get personalized match recommendations for the current user
   * @param {string} userId - The user ID to get recommendations for
   * @param {number} limit - Maximum number of recommendations to return
   * @returns {Promise<Array>} - Array of recommended matches with explanation metadata
   */
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
   * Get personalized match recommendations for the current user
   * @param {string} userId - The user ID to get recommendations for
   * @param {number} limit - Maximum number of recommendations to return
   * @param {number} retryCount - Internal parameter for tracking retry attempts
   * @returns {Promise<Array>} - Array of recommended matches with explanation metadata
   */
  getRecommendations: async (userId, limit = 10, retryCount = 0) => {
    try {
      // Strict input validation to prevent 400 Bad Request errors
      if (!userId) {
        logError('Missing required userId parameter');
        return {
          recommendations: [],
          type: 'default',
          message: 'Default recommendations (missing userId)',
          error: 'Missing required userId parameter'
        };
      }
      
      // Check userId format
      if (typeof userId !== 'string') {
        const userIdStr = String(userId); // Convert to string
        logError(`Invalid userId format: Expected string, got ${typeof userId}. Converting to string: ${userIdStr}`);
        userId = userIdStr;
      }
      
      // Ensure limit is a valid number and within acceptable range
      let normalizedLimit;
      if (limit === undefined || limit === null) {
        normalizedLimit = 10;
        log('No limit provided, using default limit of 10');
      } else {
        normalizedLimit = parseInt(Number(limit), 10);
        if (isNaN(normalizedLimit) || normalizedLimit < 1) {
          log(`Invalid limit value: ${limit}, using default of 10`);
          normalizedLimit = 10;
        } else if (normalizedLimit > 100) {
          log(`Limit too high: ${normalizedLimit}, capping at 100`);
          normalizedLimit = 100;
        }
      }
      
      // Check cache first if not retrying
      const now = Date.now();
      if (retryCount === 0 && 
          recommendationsCache.data && 
          recommendationsCache.userId === userId &&
          (now - recommendationsCache.timestamp) < CACHE_DURATION_MS) {
        log('Returning cached recommendations', {
          age: `${((now - recommendationsCache.timestamp) / 1000).toFixed(1)}s`,
          count: recommendationsCache.data.recommendations?.length || 0
        });
        return recommendationsCache.data;
      }
      
      // Log the request details for debugging
      log('Fetching recommendations for user:', userId, 'with limit:', normalizedLimit);
      
      // Try to get recommendations from the edge function first
      try {
        // Determine which endpoint to use (diagnostic or production)
        const endpoint = USE_DIAGNOSTIC_ENDPOINT ? 'get-recommendations-diagnostic' : 'get-recommendations';
        log(`Using endpoint: ${endpoint}`);
        
        // Create the request payload
        const payload = { 
          userId, 
          limit: normalizedLimit,
          requestTime: new Date().toISOString() // Include timestamp for correlation
        };
        
        // Add version marker to help debug API calls
        payload.clientVersion = '1.2.4'; // Update with actual version
        
        // Invoke the edge function
        // Temporarily bypass the edge function call that's failing with 400 errors
        // This is a temporary fix until the edge function issue is resolved
        throw new Error('Forcing fallback to direct query for testing');
        
        /* 
        const { data, error } = await supabase.functions.invoke(endpoint, {
          body: payload,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Client-Info': 'sportea-app-v3'
          }
        });
        */

        if (error) throw error;
        
        log('Recommendation request successful', {
          count: data?.recommendations?.length || 0,
          type: data?.type || 'unknown'
        });
        
        // Cache the successful response
        recommendationsCache = {
          data: {
            recommendations: data?.recommendations || [],
            type: data?.type || 'hybrid',
            message: data?.message || 'Based on your activity'
          },
          timestamp: now,
          userId
        };
        
        return recommendationsCache.data;
      } catch (edgeFunctionError) {
        // Log the edge function error
        logError(`Edge function error: ${edgeFunctionError.message || 'Unknown error'}`);
        
        // Retry if appropriate
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount) + Math.random() * 500;
          log(`Retrying after error (attempt ${retryCount + 1} of ${MAX_RETRIES}) in ${delay.toFixed(0)}ms`);
          await recommendationService.sleep(delay);
          return recommendationService.getRecommendations(userId, limit, retryCount + 1);
        }
        
        // If retries exhausted, fall back to direct database query
        log('Edge function attempts exhausted, falling back to direct query');
        
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
          source: 'fallback'
        }));
        
        // Cache the fallback response
        const fallbackResult = {
          recommendations,
          type: 'fallback',
          message: 'Upcoming matches you might be interested in',
          isFallback: true
        };
        
        recommendationsCache = {
          data: fallbackResult,
          timestamp: now,
          userId
        };
        
        return fallbackResult;
      }
    } catch (error) {
      logError('Error fetching recommendations:', error);
      
      // Always use mock/fallback data on complete failure for better UX
      try {
        // Direct database query as final fallback
        const { data: fallbackMatches, error: fallbackError } = await supabase
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
          .order('created_at', { ascending: false }) // Get newest matches
          .limit(normalizedLimit);
        
        if (!fallbackError && fallbackMatches?.length > 0) {
          // Transform matches to recommendation format
          const recommendations = fallbackMatches.map(match => ({
            match: {
              ...match,
              sport: match.sports,
              location: match.locations
            },
            score: 0.6, // Lower score to indicate these are not personalized
            explanation: 'Recently created matches',
            source: 'emergency-fallback'
          }));
          
          const fallbackResult = {
            recommendations,
            type: 'emergency-fallback',
            message: 'Recently created matches you might be interested in',
            isFallback: true,
            error: error.message
          };
          
          // Cache the emergency fallback
          recommendationsCache = {
            data: fallbackResult,
            timestamp: Date.now(),
            userId
          };
          
          return fallbackResult;
        }
      } catch (fallbackError) {
        logError('Emergency fallback also failed:', fallbackError);
      }
      
      // Absolute worst case - return empty but valid response structure
      return {
        recommendations: [],
        type: 'error',
        message: 'Unable to load recommendations at this time',
        error: error.message
      };
    }
  },

  /**
   * Track user interaction with a recommendation
   * @param {string} userId - The user ID
   * @param {string} matchId - The match ID
   * @param {string} action - The action taken (clicked, joined, dismissed)
   * @param {number} score - The recommendation score
   * @param {string} recommendationType - The type of recommendation
   * @param {string} explanation - The explanation for the recommendation
   */
  trackRecommendationAction: async (
    userId, 
    matchId, 
    action, 
    score, 
    recommendationType, 
    explanation
  ) => {
    try {
      const { error } = await supabase
        .from('recommendation_analytics')
        .insert({
          user_id: userId,
          match_id: matchId,
          action,
          recommendation_type: recommendationType,
          score,
          explanation
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error tracking recommendation action:', error);
      // Don't throw the error - tracking failures shouldn't affect user experience
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
      return data;
    } catch (error) {
      logError('Error generating match embedding:', error);
      throw error;
    }
  },

  /**
   * Generate or update preference embeddings for a specific user
   * @param {string} userId - The user ID to generate embeddings for
   * @returns {Promise<Object>} - Result of the embedding generation
   */
  generateUserEmbedding: async (userId) => {
    try {
      if (!userId) {
        logError('Missing required userId for generateUserEmbedding');
        return { success: false, error: 'Missing user ID' };
      }
      
      log(`Generating user embeddings for user: ${userId}`);
      
      const { data, error } = await supabase.functions.invoke('generate-user-embeddings', {
        body: { userId },
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Info': 'sportea-app-v3'
        }
      });

      if (error) {
        logError(`Error in generate-user-embeddings function:`, error);
        return { success: false, error: error.message || 'Unknown error' };
      }
      
      log(`Successfully generated embeddings for user ${userId}`);
      return { success: true, data };
    } catch (error) {
      logError('Error generating user embedding:', error);
      // Return error object instead of throwing to make function more resilient
      return { 
        success: false, 
        error: error.message || 'Unknown error generating user embedding'
      };
    }
  }
};

export default recommendationService;
