import { supabase } from './supabase';

/**
 * Recommendation service for fetching and tracking personalized match recommendations
 */

// Enable debug mode for detailed logging
const DEBUG_MODE = true;
const LOG_PREFIX = '[Sportea Recommendation Service]';
const USE_DIAGNOSTIC_ENDPOINT = true; // Toggle to use diagnostic version of the Edge Function

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
  getRecommendations: async (userId, limit = 10) => {
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
      
      // Log the request details for debugging
      log('Fetching recommendations for user:', userId, 'with limit:', normalizedLimit);
      log('Using Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      
      // Add timestamp for tracing request-response flow
      const requestTime = new Date().toISOString();
      log(`Request initiated at ${requestTime}`);

      // Create the request payload
      const payload = { 
        userId, 
        limit: normalizedLimit,
        requestTime // Include timestamp for correlation
      };
      
      // Log the full request payload for debugging
      log('Full request payload:', JSON.stringify(payload));
      
      // Determine which endpoint to use (diagnostic or production)
      const endpoint = USE_DIAGNOSTIC_ENDPOINT ? 'get-recommendations-diagnostic' : 'get-recommendations';
      log(`Using endpoint: ${endpoint}`);
      
      // Attempt to invoke the function with headers
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // Handle errors with enhanced diagnostics
      if (error) {
        logError(`Error in recommendation function (code: ${error.code || 'unknown'})`, error);
        
        // Provide additional diagnostic information based on error type
        if (error.message?.includes('The request failed with status code 400')) {
          logError('Bad Request error (400) detected. This may indicate invalid parameters or parsing issues.');
          logError(`PAYLOAD INSPECTION: userId type=${typeof userId}, userId value=${userId}, limit type=${typeof normalizedLimit}, limit value=${normalizedLimit}`);
          logError('Full request payload sent:', JSON.stringify(payload));
          
          // Try to parse potential error response
          if (error.data) {
            try {
              const errorResponseBody = typeof error.data === 'string' ? JSON.parse(error.data) : error.data;
              logError('Error response body:', JSON.stringify(errorResponseBody, null, 2));
            } catch (parseError) {
              logError('Could not parse error response:', error.data);
            }
          }
        } else if (error.message?.includes('timeout')) {
          logError('Timeout detected. The Edge Function may be taking too long to respond.');
        } else if (error.message?.includes('NetworkError')) {
          logError('Network error detected. Check internet connectivity or Supabase service status.');
        }
        
        // If we're in diagnostic mode, show more details rather than failing
        if (USE_DIAGNOSTIC_ENDPOINT) {
          logError('Error occurred in diagnostic mode - returning empty recommendations');
          return {
            recommendations: [],
            type: 'diagnostic-error',
            message: `Diagnostic error: ${error.message}`,
            error: error
          };
        }
        
        throw error;
      }
      
      log('Recommendation request successful', {
        count: data?.recommendations?.length || 0,
        type: data?.type || 'unknown'
      });
      
      // Log the successful response
      log('Edge Function response:', JSON.stringify(data, null, 2));
      
      return {
        recommendations: data?.recommendations || [],
        type: data?.type || 'hybrid',
        message: data?.message || 'Based on your activity',
        diagnostic: USE_DIAGNOSTIC_ENDPOINT ? data : undefined
      };
    } catch (error) {
      logError('Error fetching recommendations:', error);
      
      // Construct a more informative error message for logging
      const errorDetails = {
        message: error.message,
        code: error.code,
        status: error.status,
        data: error.data, // Include raw response data if available
        timestamp: new Date().toISOString()
      };
      
      // Try to parse and log response body if it exists
      if (error.data || error.error) {
        try {
          const rawData = error.data || error.error;
          const responseBody = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          errorDetails.responseBody = responseBody;
          logError('API error response body:', JSON.stringify(responseBody, null, 2));
        } catch (parseError) {
          logError('Could not parse error response body:', error.data || error.error);
        }
      }
      
      log('Full error details:', errorDetails);
      
      // Return default recommendations on error instead of failing completely
      return {
        recommendations: [],
        type: 'default',
        message: `Default recommendations (error: ${error.message?.substring(0, 30)}...)`,
        error: errorDetails
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
      const { data, error } = await supabase.functions.invoke('generate-match-embeddings', {
        body: { matchId },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating match embedding:', error);
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
      const { data, error } = await supabase.functions.invoke('generate-user-embeddings', {
        body: { userId },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating user embedding:', error);
      throw error;
    }
  }
};

export default recommendationService;
