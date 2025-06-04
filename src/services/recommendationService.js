import { supabase } from './supabase';

/**
 * Recommendation service for fetching and tracking personalized match recommendations
 */

// Enable debug mode for detailed logging
const DEBUG_MODE = true;
const LOG_PREFIX = '[Sportea Recommendation Service]';

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
      // Validate input parameters to prevent 400 Bad Request errors
      if (!userId) {
        logError('Missing required userId parameter');
        return {
          recommendations: [],
          type: 'default',
          message: 'Default recommendations (missing userId)',
          error: 'Missing required userId parameter'
        };
      }
      
      // Ensure limit is a valid number
      const normalizedLimit = Number(limit) || 10;
      
      // Log the request details for debugging
      log('Fetching recommendations for user:', userId, 'with limit:', normalizedLimit);
      log('Using Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      
      // Add timestamp for tracing request-response flow
      const requestTime = new Date().toISOString();
      log(`Request initiated at ${requestTime}`);
      
      // Attempt to invoke the function with extended timeout and headers
      const { data, error } = await supabase.functions.invoke('get-recommendations', {
        body: { 
          userId, 
          limit: normalizedLimit,
          requestTime // Include timestamp for correlation
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (error) {
        logError(`Error in recommendation function (code: ${error.code || 'unknown'})`, error);
        
        // Provide additional diagnostic information based on error type
        if (error.message?.includes('The request failed with status code 400')) {
          logError('Bad Request error (400) detected. This may indicate invalid parameters or parsing issues.');
          log('Request payload was:', { userId, limit: normalizedLimit });
        } else if (error.message?.includes('timeout')) {
          logError('Timeout detected. The Edge Function may be taking too long to respond.');
        } else if (error.message?.includes('NetworkError')) {
          logError('Network error detected. Check internet connectivity or Supabase service status.');
        }
        
        throw error;
      }
      
      log('Recommendation request successful', {
        count: data?.recommendations?.length || 0,
        type: data?.type || 'unknown'
      });
      
      return {
        recommendations: data?.recommendations || [],
        type: data?.type || 'hybrid',
        message: data?.message || 'Based on your activity'
      };
    } catch (error) {
      logError('Error fetching recommendations:', error);
      
      // Construct a more informative error message for logging
      const errorDetails = {
        message: error.message,
        code: error.code,
        status: error.status,
        timestamp: new Date().toISOString()
      };
      
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
