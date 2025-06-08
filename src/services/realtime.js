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
        // Check if we have a realtime transport object
        if (supabase.realtime.transport) {
          // Phoenix websocket-based approach (usually for newer versions)
          if (supabase.realtime.transport.conn) {
            // Log connection info
            log('Realtime transport detected:', {
              type: 'phoenix',
              status: supabase.realtime.transport.conn.connectionState || 'unknown'
            });
            
            // Try accessing websocket through known paths
            const phoenixSocket = supabase.realtime.transport.conn.transport?.ws;
            if (phoenixSocket) {
              const stateMap = {
                0: 'CONNECTING',
                1: 'OPEN', 
                2: 'CLOSING',
                3: 'CLOSED'
              };
              log('Phoenix WebSocket state:', stateMap[phoenixSocket.readyState] || 'UNKNOWN');
              this.connectionStatus = stateMap[phoenixSocket.readyState]?.toLowerCase() || 'unknown';
            }
          } 
        } else if (supabase.realtime.getState) {
          // Legacy approach for older versions
          const state = supabase.realtime.getState();
          log('Realtime connection state (legacy):', state);
          this.connectionStatus = state.toLowerCase();
        } else {
          // Simple connection check
          log('Basic realtime check: Realtime object exists but cannot determine state');
          this.connectionStatus = 'unknown';
        }
        
        // Log realtime client info
        const url = supabase.realtime._options?.url || 'unknown';
        log('Supabase realtime URL:', url);
        
      } catch (error) {
        logError('Error setting up global error handling:', error);
        this.connectionStatus = 'error';
      }
    } else {
      logError('Supabase realtime not available');
      this.connectionStatus = 'unavailable';
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
   * @param {string} subscriptionId - ID to unsubscribe
   */
  unsubscribe(subscriptionId) {
    log(`Unsubscribing from: ${subscriptionId}`);
    
    if (!this.subscriptions.has(subscriptionId)) {
      log(`Subscription not found: ${subscriptionId}`);
      return false;
    }
    
    try {
      const channelName = this.subscriptions.get(subscriptionId).channel;
      
      if (this.channels.has(channelName)) {
        const channel = this.channels.get(channelName);
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
          log(`Successfully unsubscribed from channel: ${channelName}`);
        }
        
        this.channels.delete(channelName);
      }
      
      this.subscriptions.delete(subscriptionId);
      return true;
    } catch (error) {
      logError(`Error unsubscribing from ${subscriptionId}:`, error);
      return false;
    }
  }
  
  /**
   * Reset all subscriptions by unsubscribing and resubscribing
   * Useful for recovering from persistent connection issues
   */
  resetSubscriptions() {
    log('Resetting all realtime subscriptions...');
    
    try {
      // Store current subscriptions in a new array to avoid modification during iteration
      const currentSubscriptions = [...this.subscriptions.entries()];
      
      // Unsubscribe from all channels
      this.channels.forEach((channel, channelName) => {
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
          log(`Unsubscribed from channel during reset: ${channelName}`);
        }
      });
      
      // Clear all channels
      this.channels.clear();
      
      // Wait a small amount of time before resubscribing
      setTimeout(() => {
        // Resubscribe based on stored subscription info
        currentSubscriptions.forEach(([subscriptionId, details]) => {
          if (details.type === 'match') {
            this.subscribeToMatch(details.id, details.callback);
            log(`Resubscribed to match: ${details.id}`);
          } else if (details.type === 'user_notifications') {
            this.subscribeToUserNotifications(details.id, details.callback);
            log(`Resubscribed to user notifications: ${details.id}`);
          }
        });
        
        log('All subscriptions have been reset and reestablished.');
      }, 500); // Wait 500ms before resubscribing
    } catch (error) {
      logError('Error resetting subscriptions:', error);
    }
  }
}

// Create a singleton instance of the RealtimeService
const realtimeService = new RealtimeService();

// Export the instance as the default export
export default realtimeService;