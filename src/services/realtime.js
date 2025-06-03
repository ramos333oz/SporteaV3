import { supabase } from './supabase';

/**
 * Real-time service for Supabase subscriptions
 * Handles WebSocket connections and subscription management
 */
class RealtimeService {
  constructor() {
    this.subscriptions = new Map();
    this.channels = new Map();
  }

  /**
   * Subscribe to match updates
   * @param {string} matchId - Match ID to subscribe to
   * @param {Function} callback - Callback function to handle updates
   * @returns {string} Subscription ID
   */
  subscribeToMatch(matchId, callback) {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`
      }, (payload) => {
        callback({
          type: 'match_update',
          data: payload.new,
          oldData: payload.old,
          eventType: payload.eventType
        });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        callback({
          type: 'participant_update',
          data: payload.new,
          oldData: payload.old,
          eventType: payload.eventType
        });
      })
      .subscribe();

    // Generate a subscription ID
    const subscriptionId = `match_${matchId}_${Date.now()}`;
    this.subscriptions.set(subscriptionId, { matchId, callback });
    this.channels.set(subscriptionId, channel);
    
    return subscriptionId;
  }

  /**
   * Subscribe to all matches (for match discovery)
   * @param {Function} callback - Callback function to handle updates
   * @returns {string} Subscription ID
   */
  subscribeToAllMatches(callback) {
    const channel = supabase
      .channel('public:matches')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches'
      }, (payload) => {
        callback({
          type: 'match_update',
          data: payload.new,
          oldData: payload.old,
          eventType: payload.eventType
        });
      })
      .subscribe();

    // Generate a subscription ID
    const subscriptionId = `all_matches_${Date.now()}`;
    this.subscriptions.set(subscriptionId, { matchId: 'all', callback });
    this.channels.set(subscriptionId, channel);
    
    return subscriptionId;
  }

  /**
   * Subscribe to user notifications
   * @param {string} userId - User ID to subscribe to notifications for
   * @param {Function} callback - Callback function to handle notifications
   * @returns {string} Subscription ID
   */
  subscribeToUserNotifications(userId, callback) {
    const channel = supabase
      .channel(`user:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        callback({
          type: 'notification',
          data: payload.new,
          eventType: payload.eventType
        });
      })
      .subscribe();

    // Generate a subscription ID
    const subscriptionId = `user_notifications_${userId}_${Date.now()}`;
    this.subscriptions.set(subscriptionId, { userId, callback });
    this.channels.set(subscriptionId, channel);
    
    return subscriptionId;
  }

  /**
   * Subscribe to user's participated matches
   * @param {string} userId - User ID to subscribe to
   * @param {Function} callback - Callback function to handle updates
   * @returns {string} Subscription ID
   */
  subscribeToUserMatches(userId, callback) {
    const channel = supabase
      .channel(`user_matches:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        callback({
          type: 'participation_update',
          data: payload.new,
          oldData: payload.old,
          eventType: payload.eventType
        });
      })
      .subscribe();

    // Generate a subscription ID
    const subscriptionId = `user_matches_${userId}_${Date.now()}`;
    this.subscriptions.set(subscriptionId, { userId, callback });
    this.channels.set(subscriptionId, channel);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from a subscription
   * @param {string} subscriptionId - ID of the subscription to remove
   */
  unsubscribe(subscriptionId) {
    if (this.channels.has(subscriptionId)) {
      const channel = this.channels.get(subscriptionId);
      supabase.removeChannel(channel);
      this.channels.delete(subscriptionId);
      this.subscriptions.delete(subscriptionId);
      return true;
    }
    return false;
  }

  /**
   * Unsubscribe all subscriptions
   */
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.subscriptions.clear();
  }
}

// Export singleton instance
const realtimeService = new RealtimeService();
export default realtimeService;
