import { supabase } from './supabase';

// Debug mode flag for enhanced logging
const DEBUG_MODE = true;
const LOG_PREFIX = '[Sportea Realtime Service]';

/**
 * Enhanced logging function for realtime service
 */
function log(...args) {
  if (DEBUG_MODE) {
    console.log(LOG_PREFIX, ...args);
  }
}

function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

/**
 * Real-time service for Supabase subscriptions
 * Handles WebSocket connections and subscription management
 */
class RealtimeService {
  constructor() {
    this.subscriptions = new Map();
    this.channels = new Map();
    this.connectionStatus = 'disconnected';
    
    // Initialize event tracking
    log('Realtime service initialized');
    this.setupGlobalErrorHandling();
  }
  
  /**
   * Setup global error handling for realtime events
   */
  setupGlobalErrorHandling() {
    if (supabase.realtime) {
      log('Setting up global error handling for realtime events');
      try {
        // Track global connection state
        const stateChangeSubscription = supabase.realtime.onStateChange((state) => {
          log('Global realtime state changed:', state);
          this.connectionStatus = state.toLowerCase();
        });
        
        // Log realtime client info
        const url = supabase.realtime._options?.url || 'unknown';
        log('Supabase realtime URL:', url);
        
      } catch (error) {
        logError('Error setting up global error handling:', error.message);
      }
    } else {
      logError('Supabase realtime not available');
    }
  }

  /**
   * Subscribe to match updates
   * @param {string} matchId - Match ID to subscribe to
   * @param {Function} callback - Callback function to handle updates
   * @returns {string} Subscription ID
   */
  subscribeToMatch(matchId, callback) {
    log(`Subscribing to match updates for matchId: ${matchId}`);
    
    try {
      const channel = supabase
        .channel(`match:${matchId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`
        }, (payload) => {
          log(`Received match update for match ${matchId}:`, payload.eventType);
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
          log(`Received participant update for match ${matchId}:`, payload.eventType);
          callback({
            type: 'participant_update',
            data: payload.new,
            oldData: payload.old,
            eventType: payload.eventType
          });
        })
        .on('error', (error) => {
          logError(`Channel error for match:${matchId}:`, error);
          callback({
            type: 'error',
            error: error
          });
        })
        .on('subscription_error', (error) => {
          logError(`Subscription error for match:${matchId}:`, error);
          callback({
            type: 'subscription_error',
            error: error
          });
        })
        .on('broadcast', { event: 'system' }, (payload) => {
          log(`System broadcast received for match:${matchId}:`, payload);
          if (payload.type === 'system-recovery') {
            callback({
              type: 'system_recovery',
              payload
            });
          }
        });
        
      // Track subscription status
      channel.on('status', (status) => {
        log(`Channel status for match:${matchId}:`, status);
        if (status === 'SUBSCRIBED') {
          log(`Successfully subscribed to match:${matchId}`);
        }
      });
      
      // Subscribe to the channel
      channel.subscribe((status) => {
        log(`Subscription status for match:${matchId}:`, status);
      });
      
      // Generate a subscription ID
      const subscriptionId = `match_${matchId}_${Date.now()}`;
      this.subscriptions.set(subscriptionId, { matchId, callback });
      this.channels.set(subscriptionId, channel);
      
      return subscriptionId;
    } catch (error) {
      logError(`Error subscribing to match ${matchId}:`, error.message);
      // Return a subscription ID anyway so the client can track it
      const errorSubId = `error_match_${matchId}_${Date.now()}`;
      return errorSubId;
    }


  }

  /**
   * Subscribe to all matches (for match discovery)
   * @param {Function} callback - Callback function to handle updates
   * @returns {string} Subscription ID
   */
  subscribeToAllMatches(callback) {
    log('Subscribing to all matches');
    
    try {
      // Modified channel name to ensure it follows Supabase naming convention
      const channel = supabase
        .channel('public:matches:all')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'matches'
        }, (payload) => {
          log('Received all matches update:', payload.eventType);
          callback({
            type: 'match_update',
            data: payload.new,
            oldData: payload.old,
            eventType: payload.eventType
          });
        })
        .on('error', (error) => {
          logError('Channel error for all matches:', error);
          callback({
            type: 'error',
            error: error
          });
        })
        .on('subscription_error', (error) => {
          logError('Subscription error for all matches:', error);
          callback({
            type: 'subscription_error',
            error: error
          });
        });
      
      // Track subscription status
      channel.on('status', (status) => {
        log('Channel status for all matches:', status);
        if (status === 'SUBSCRIBED') {
          log('Successfully subscribed to all matches');
        }
      });
      
      // Subscribe to the channel
      channel.subscribe((status) => {
        log('Subscription status for all matches:', status);
      });
      
      // Generate a subscription ID
      const subscriptionId = `all_matches_${Date.now()}`;
      this.subscriptions.set(subscriptionId, { matchId: 'all', callback });
      this.channels.set(subscriptionId, channel);
      
      return subscriptionId;
    } catch (error) {
      logError('Error subscribing to all matches:', error.message);
      // Return a subscription ID anyway so the client can track it
      const errorSubId = `error_all_matches_${Date.now()}`;
      return errorSubId;
    }


  }

  /**
   * Subscribe to user notifications
   * @param {string} userId - User ID to subscribe to notifications for
   * @param {Function} callback - Callback function to handle notifications
   * @returns {string} Subscription ID
   */
  subscribeToUserNotifications(userId, callback) {
    log(`Subscribing to notifications for userId: ${userId}`);
    
    try {
      const channel = supabase
        .channel(`user:${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          log(`Received notification for user ${userId}:`, payload.eventType);
          callback({
            type: 'notification',
            data: payload.new,
            eventType: payload.eventType
          });
        })
        .on('error', (error) => {
          logError(`Channel error for user:${userId}:`, error);
          callback({
            type: 'error',
            error: error
          });
        })
        .on('subscription_error', (error) => {
          logError(`Subscription error for user:${userId}:`, error);
          callback({
            type: 'subscription_error',
            error: error
          });
        });
      
      // Track subscription status
      channel.on('status', (status) => {
        log(`Channel status for user:${userId}:`, status);
        if (status === 'SUBSCRIBED') {
          log(`Successfully subscribed to user:${userId}`);
        }
      });
      
      // Subscribe to the channel
      channel.subscribe((status) => {
        log(`Subscription status for user:${userId}:`, status);
      });
      
      // Generate a subscription ID
      const subscriptionId = `user_notifications_${userId}_${Date.now()}`;
      this.subscriptions.set(subscriptionId, { userId, callback });
      this.channels.set(subscriptionId, channel);
      
      return subscriptionId;
    } catch (error) {
      logError(`Error subscribing to notifications for user ${userId}:`, error.message);
      // Return a subscription ID anyway so the client can track it
      const errorSubId = `error_notifications_${userId}_${Date.now()}`;
      return errorSubId;
    }
  }

  /**
   * Subscribe to user's participated matches
   * @param {string} userId - User ID to subscribe to
   * @param {Function} callback - Callback function to handle updates
   * @returns {string} Subscription ID
   */
  subscribeToUserMatches(userId, callback) {
    log(`Subscribing to matches for userId: ${userId}`);
    
    try {
      const channel = supabase
        .channel(`user_matches:${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          log(`Received participation update for user ${userId}:`, payload.eventType);
          callback({
            type: 'participation_update',
            data: payload.new,
            oldData: payload.old,
            eventType: payload.eventType
          });
        })
        .on('error', (error) => {
          logError(`Channel error for user_matches:${userId}:`, error);
          callback({
            type: 'error',
            error: error
          });
        })
        .on('subscription_error', (error) => {
          logError(`Subscription error for user_matches:${userId}:`, error);
          callback({
            type: 'subscription_error',
            error: error
          });
        });
      
      // Track subscription status
      channel.on('status', (status) => {
        log(`Channel status for user_matches:${userId}:`, status);
        if (status === 'SUBSCRIBED') {
          log(`Successfully subscribed to user_matches:${userId}`);
        }
      });
      
      // Subscribe to the channel
      channel.subscribe((status) => {
        log(`Subscription status for user_matches:${userId}:`, status);
      });
      
      // Generate a subscription ID
      const subscriptionId = `user_matches_${userId}_${Date.now()}`;
      this.subscriptions.set(subscriptionId, { userId, callback });
      this.channels.set(subscriptionId, channel);
      
      return subscriptionId;
    } catch (error) {
      logError(`Error subscribing to matches for user ${userId}:`, error.message);
      // Return a subscription ID anyway so the client can track it
      const errorSubId = `error_user_matches_${userId}_${Date.now()}`;
      return errorSubId;
    }
  }

  /**
   * Unsubscribe from a subscription
   * @param {string} subscriptionId - ID of the subscription to remove
   */
  unsubscribe(subscriptionId) {
    log(`Unsubscribing from subscription: ${subscriptionId}`);
    if (this.channels.has(subscriptionId)) {
      const channel = this.channels.get(subscriptionId);
      try {
        supabase.removeChannel(channel);
        log(`Successfully removed channel for subscription: ${subscriptionId}`);
      } catch (error) {
        logError(`Error removing channel for subscription: ${subscriptionId}`, error.message);
      }
      this.channels.delete(subscriptionId);
      this.subscriptions.delete(subscriptionId);
      return true;
    } else {
      log(`Subscription not found: ${subscriptionId}`);
      return false;
    }
  }

  /**
   * Unsubscribe all subscriptions
   */
  unsubscribeAll() {
    log(`Unsubscribing from all channels: ${this.channels.size} active channels`);
    this.channels.forEach((channel, subscriptionId) => {
      try {
        supabase.removeChannel(channel);
        log(`Removed channel for subscription: ${subscriptionId}`);
      } catch (error) {
        logError(`Error removing channel for subscription: ${subscriptionId}`, error.message);
      }
    });
    this.channels.clear();
    this.subscriptions.clear();
    log('All channels unsubscribed');
  }
  
  /**
   * Reset all channels - disconnect, reconnect, and resubscribe
   * Use this when experiencing persistent connection issues
   */
  resetChannels() {
    log('Resetting all real-time channels...');
    
    // Store current subscriptions for resubscribing
    const currentSubscriptions = Array.from(this.subscriptions.entries());
    
    // Unsubscribe all current channels
    this.unsubscribeAll();
    
    // Force reconnection of the Supabase client
    if (supabase.realtime) {
      try {
        // Disconnect the realtime client
        log('Disconnecting Supabase realtime client...');
        supabase.realtime.disconnect();
        
        // Small delay to ensure clean disconnection
        setTimeout(() => {
          try {
            // Reconnect
            log('Reconnecting Supabase realtime client...');
            supabase.realtime.connect();
            
            // Allow time for reconnection before resubscribing
            setTimeout(() => {
              // Resubscribe to previous subscriptions
              log(`Resubscribing to ${currentSubscriptions.length} previous subscriptions...`);
              currentSubscriptions.forEach(([id, subscription]) => {
                try {
                  // Determine subscription type and resubscribe appropriately
                  if (subscription.matchId === 'all') {
                    this.subscribeToAllMatches(subscription.callback);
                  } else if (subscription.matchId) {
                    this.subscribeToMatch(subscription.matchId, subscription.callback);
                  } else if (subscription.userId) {
                    if (id.includes('notifications')) {
                      this.subscribeToUserNotifications(subscription.userId, subscription.callback);
                    } else if (id.includes('matches')) {
                      this.subscribeToUserMatches(subscription.userId, subscription.callback);
                    }
                  }
                } catch (subError) {
                  logError(`Error resubscribing to ${id}:`, subError.message);
                }
              });
              
              log('Channel reset complete');
            }, 1000);
          } catch (connectError) {
            logError('Error reconnecting realtime client:', connectError.message);
          }
        }, 500);
      } catch (error) {
        logError('Error disconnecting realtime client:', error.message);
      }
    } else {
      logError('Supabase realtime client not available');
    }
    
    return true;
  }
}

// Export singleton instance
const realtimeService = new RealtimeService();

// Initialize the service to ensure global error handling is setup
log('Exporting realtime service singleton');

export default realtimeService;
