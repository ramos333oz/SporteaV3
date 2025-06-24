import { supabase } from './supabase';

// Debug mode flag for enhanced logging
const DEBUG_MODE = process.env.NODE_ENV !== 'production'; // Only log in development
const VERBOSE_DEBUG = false; // Set to true only when actively debugging realtime issues
const LOG_PREFIX = '[Sportea Realtime Service]';

/**
 * Enhanced logging function for realtime service
 */
function log(...args) {
  if (DEBUG_MODE) {
    console.log(LOG_PREFIX, ...args);
  }
}

// For verbose logs (frequent status updates)
function logVerbose(...args) {
  if (DEBUG_MODE && VERBOSE_DEBUG) {
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
    this.connectionMonitoringInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.lastResetTime = 0;
    
    // Initialize event tracking
    log('Realtime service initialized');
    this.setupGlobalErrorHandling();
    
    // Start connection monitoring
    this.connectionMonitoringInterval = this.monitorConnection();
    log('Auto connection monitoring started');
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
          logVerbose(`Received match update for match ${matchId}:`, payload.eventType);
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
          logVerbose(`Received participant update for match ${matchId}:`, payload.eventType);
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
        logVerbose(`Channel status for match:${matchId}:`, status);
        if (status === 'SUBSCRIBED') {
          log(`Successfully subscribed to match:${matchId}`);
        }
      });
      
      // Subscribe to the channel
      channel.subscribe((status) => {
        logVerbose(`Subscription status for match:${matchId}:`, status);
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
    log('Subscribing to all matches and participants');

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
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'participants'
        }, (payload) => {
          log('Received participant update for all matches:', payload.eventType);
          callback({
            type: 'participant_update',
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
    // Implement rate limiting to prevent too many resets
    const now = Date.now();
    const timeSinceLastReset = now - this.lastResetTime;
    
    // Don't allow resets more often than every 30 seconds
    if (timeSinceLastReset < 30000) {
      log(`Reset suppressed - too soon after last reset (${Math.round(timeSinceLastReset/1000)}s ago)`);
      return false;
    }
    
    this.lastResetTime = now;
    this.reconnectAttempts++;
    
    log(`Resetting all realtime subscriptions... (attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts})`);
    
    try {
      // Implement exponential backoff for reconnection timing
      const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 60000);
      log(`Using exponential backoff delay of ${backoffDelay}ms before reconnection`);
      
      // Store current subscriptions in a new array to avoid modification during iteration
      const currentSubscriptions = [...this.subscriptions.entries()];
      log(`Found ${currentSubscriptions.length} active subscriptions to reset`);
      
      // Attempt to reconnect the base supabase realtime connection first
      if (supabase?.realtime?.connect && typeof supabase.realtime.connect === 'function') {
        try {
          log('Attempting to reconnect Supabase realtime base connection...');
          supabase.realtime.connect();
        } catch (connError) {
          logError('Error reconnecting base realtime connection:', connError);
          // Continue with reset process regardless
        }
      }
      
      // Unsubscribe from all channels
      let unsubscribed = 0;
      this.channels.forEach((channel, channelId) => {
        try {
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
            unsubscribed++;
          }
        } catch (e) {
          logError(`Error unsubscribing from channel ${channelId}:`, e);
        }
      });
      log(`Unsubscribed from ${unsubscribed} channels during reset`);
      
      // Clear all channels and subscriptions
      this.channels.clear();
      this.subscriptions.clear();
      
      // Wait with exponential backoff before resubscribing
      setTimeout(() => {
        let resubscribed = 0;
        // Resubscribe based on stored subscription info
        currentSubscriptions.forEach(([subscriptionId, details]) => {
          try {
            if (details.matchId && details.matchId !== 'all') {
              this.subscribeToMatch(details.matchId, details.callback);
              resubscribed++;
            } else if (details.matchId === 'all') {
              this.subscribeToAllMatches(details.callback);
              resubscribed++;
            } else if (details.userId && details.type === 'notifications') {
              this.subscribeToUserNotifications(details.userId, details.callback);
              resubscribed++;
            } else if (details.userId && details.type === 'user_matches') {
              this.subscribeToUserMatches(details.userId, details.callback);
              resubscribed++;
            }
          } catch (e) {
            logError(`Error resubscribing to ${subscriptionId}:`, e);
          }
        });
        
        log(`Successfully resubscribed to ${resubscribed} out of ${currentSubscriptions.length} subscriptions.`);
        
        // Reset reconnection attempt counter if we succeeded
        if (resubscribed > 0) {
          this.reconnectAttempts = 0;
        }
      }, backoffDelay); // Wait with exponential backoff before resubscribing
      
      return true;
    } catch (error) {
      logError('Error resetting subscriptions:', error);
      return false;
    }
  }

  /**
   * Start monitoring connection status
   * Will automatically try to recover the connection when issues are detected
   * @returns {Object} The monitoring interval object
   */
  monitorConnection() {
    log('Starting realtime connection monitoring');
    
    // Store the last log time to reduce spam
    let lastLogTime = 0;
    let recoveryAttempts = 0;
    let consecutiveErrorsDetected = 0;
    
    // Monitor every 30 seconds
    const monitorInterval = setInterval(() => {
      // Only log detailed information every 5 minutes (reduced from 2 minutes)
      const now = Date.now();
      const shouldLog = now - lastLogTime > 300000;
      
      if (shouldLog) {
        log('Checking realtime connection health');
        lastLogTime = now;
      }
      
      try {
        // Check if client exists and channels are active
        if (!supabase?.realtime) {
          if (shouldLog) logError('Realtime client not available during monitoring');
          return;
        }
        
        // Check connection status using different approaches based on Supabase version
        let isConnected = false;
        
        // Check Phoenix transport's WebSocket (v2.39.0+ structure)
        if (supabase.realtime?.transport?.conn?.transport?.ws) {
          const ws = supabase.realtime.transport.conn.transport.ws;
          isConnected = ws.readyState === 1; // WebSocket.OPEN
        } 
        // Check transport connection state as fallback
        else if (supabase.realtime.transport && 
                typeof supabase.realtime.transport.connectionState === 'string') {
          const internalState = supabase.realtime.transport.connectionState;
          isConnected = internalState === 'open' || internalState === 'connected';
        }
        // Legacy getState method as final fallback
        else if (typeof supabase.realtime.getState === 'function') {
          const state = supabase.realtime.getState();
          isConnected = state === 'CONNECTED';
        }
        
        // Check if any channels are connected
        const channels = supabase.realtime.channels || [];
        const activeChannels = channels.filter(ch => 
          ch.state === 'joined' || ch.state === 'joining'
        ).length;
        
        const haveChannels = channels.length > 0;
        const channelsActive = activeChannels > 0;
        
        if (shouldLog) {
          log('Connection state:', {
            isConnected,
            haveChannels,
            channelsActive,
            channelCount: channels.length,
            activeChannelCount: activeChannels
          });
        }
        
        // Auto-recovery logic with improved error detection
        if ((haveChannels && !channelsActive) || (!isConnected && haveChannels)) {
          consecutiveErrorsDetected++;
          
          // Only attempt recovery after multiple consecutive issues to avoid false positives
          if (consecutiveErrorsDetected >= 3) {
            // Don't attempt more reconnections than our limit
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              log('Connection issues detected - attempting recovery');
              this.resetSubscriptions();
            } else {
              logError(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Manual intervention may be required.`);
            }
            
            // Reset consecutive error counter after attempting recovery
            consecutiveErrorsDetected = 0;
          }
        } else if (isConnected && channelsActive) {
          // Reset error counters when everything looks good
          consecutiveErrorsDetected = 0;
        }
      } catch (error) {
        logError('Error in connection monitoring:', error);
      }
    }, 30000); // Check every 30 seconds
    
    return monitorInterval;
  }
  
  /**
   * Stop connection monitoring
   * @param {Object} monitorInterval - The interval to clear
   */
  stopConnectionMonitoring(monitorInterval) {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      log('Stopped connection monitoring');
    }
  }

  /**
   * Alias for resetSubscriptions to maintain backward compatibility
   * @deprecated Use resetSubscriptions() instead
   */
  resetChannels() {
    log('resetChannels called (alias for resetSubscriptions)');
    return this.resetSubscriptions();
  }
}

// Create a singleton instance of the RealtimeService
const realtimeService = new RealtimeService();

// Export the instance as the default export
export default realtimeService;