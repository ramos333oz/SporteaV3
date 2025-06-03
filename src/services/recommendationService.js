import { supabase } from './supabase';

/**
 * Recommendation service for fetching and tracking personalized match recommendations
 */
const recommendationService = {
  /**
   * Get personalized match recommendations for the current user
   * @param {string} userId - The user ID to get recommendations for
   * @param {number} limit - Maximum number of recommendations to return
   * @returns {Promise<Array>} - Array of recommended matches with explanation metadata
   */
  getRecommendations: async (userId, limit = 10) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-recommendations', {
        body: { userId, limit },
      });

      if (error) throw error;
      
      return {
        recommendations: data.recommendations || [],
        type: data.type || 'hybrid',
        message: data.message
      };
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
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
