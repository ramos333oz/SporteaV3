import { supabase } from './supabase';

/**
 * Interaction service for tracking user interactions with matches
 * This helps improve recommendation quality through collaborative filtering
 */
const interactionService = {
  /**
   * Track a user interaction with a match
   * @param {string} userId - The user ID
   * @param {string} matchId - The match ID
   * @param {string} interactionType - The type of interaction (view, join, host, leave, click)
   * @returns {Promise<Object>} - Result of the interaction tracking
   */
  trackInteraction: async (userId, matchId, interactionType) => {
    try {
      if (!userId || !matchId || !interactionType) {
        console.error('Missing required parameters for tracking interaction');
        return { success: false, error: 'Missing required parameters' };
      }
      
      // Insert the interaction
      const { data, error } = await supabase
        .from('user_interactions')
        .insert({
          user_id: userId,
          match_id: matchId,
          interaction_type: interactionType
        });
      
      if (error) throw error;
      
      // If the interaction is significant (join, host), trigger an update to user embeddings
      if (['join', 'host'].includes(interactionType)) {
        try {
          // Non-blocking call to update user embeddings with v3 function
          supabase.functions.invoke('generate-user-vectors-v3', {
            body: { userId },
          }).catch(err => {
            console.warn('Background user embedding update failed:', err);
          });
        } catch (e) {
          // Don't let embedding generation failure affect the interaction tracking
          console.warn('Failed to trigger user embedding update:', e);
        }
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Error tracking interaction:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Get a user's recent interactions
   * @param {string} userId - The user ID
   * @param {number} limit - Maximum number of interactions to return
   * @returns {Promise<Array>} - Array of recent interactions
   */
  getUserInteractions: async (userId, limit = 20) => {
    try {
      const { data, error } = await supabase
        .from('user_interactions')
        .select(`
          id,
          interaction_type,
          created_at,
          match_id,
          matches (
            id,
            title,
            sport_id,
            sports (name),
            start_time,
            location_id,
            locations (name)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      throw error;
    }
  },
  
  /**
   * Register match view to track impressions
   * @param {string} userId - The user ID
   * @param {string} matchId - The match ID
   */
  registerMatchView: async (userId, matchId) => {
    if (!userId || !matchId) return;
    
    try {
      // Non-blocking call to track the view
      interactionService.trackInteraction(userId, matchId, 'view')
        .catch(err => console.warn('Failed to track match view:', err));
    } catch (e) {
      // Don't let this affect the UI
      console.warn('Error in registerMatchView:', e);
    }
  }
};

export default interactionService;
