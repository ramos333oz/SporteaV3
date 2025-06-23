import { supabase } from './supabase';

/**
 * Optimized Real-time Service for Supabase
 * 
 * OPTIMIZATION GOALS:
 * - Reduce from 5+ subscriptions per user to 2 optimized channels
 * - Eliminate duplicate subscriptions across components
 * - Centralized subscription management
 * - Smart cleanup and memory management
 * - Better error handling and reconnection
 * 
 * ARCHITECTURE:
 * - Channel 1: user-activity:${userId} - User notifications + participation updates
 * - Channel 2: match-updates:all - All match updates (shared across components)
 */

class OptimizedRealtimeService {
  constructor() {
    this.channels = new Map();
    this.subscribers = new Map();
    this.connectionStatus = 'disconnected';
    this.currentUserId = null;
    this.eventEmitter = new EventTarget();
    
    // Performance tracking
    this.metrics = {
      channelsCreated: 0,
      messagesReceived: 0,
      subscribersCount: 0,
      lastActivity: null
    };
    
    console.log('[OptimizedRealtime] Service initialized');
  }

  /**
   * Initialize the service with user context
   * @param {string} userId - Current user ID
   */
  initialize(userId) {
    if (this.currentUserId === userId) {
      console.log('[OptimizedRealtime] Already initialized for user:', userId);
      return;
    }

    // Cleanup previous user's subscriptions
    if (this.currentUserId) {
      this.cleanup();
    }

    this.currentUserId = userId;
    console.log('[OptimizedRealtime] Initializing for user:', userId);
    
    // Create the two optimized channels
    this.createUserActivityChannel(userId);
    this.createMatchUpdatesChannel();
  }

  /**
   * Create Channel 1: User Activity (notifications + participation)
   * Combines user notifications and user match participation into one channel
   */
  createUserActivityChannel(userId) {
    const channelName = `user-activity:${userId}`;
    
    if (this.channels.has(channelName)) {
      console.log('[OptimizedRealtime] User activity channel already exists');
      return;
    }

    console.log('[OptimizedRealtime] Creating user activity channel:', channelName);

    const channel = supabase
      .channel(channelName)
      // Listen to user notifications
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleUserNotification(payload);
      })
      // Listen to user's match participation changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleUserParticipation(payload);
      })
      .on('error', (error) => {
        console.error('[OptimizedRealtime] User activity channel error:', error);
        this.emitEvent('error', { type: 'user_activity', error });
      })
      .on('subscription_error', (error) => {
        console.error('[OptimizedRealtime] User activity subscription error:', error);
        this.emitEvent('subscription_error', { type: 'user_activity', error });
      });

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log('[OptimizedRealtime] User activity channel status:', status);
      if (status === 'SUBSCRIBED') {
        this.connectionStatus = 'connected';
        this.emitEvent('connected', { channel: 'user_activity' });
      }
    });

    this.channels.set(channelName, channel);
    this.metrics.channelsCreated++;
  }

  /**
   * Create Channel 2: Match Updates (shared across all components)
   * Handles all match and participant updates for all matches
   */
  createMatchUpdatesChannel() {
    const channelName = 'match-updates:all';
    
    if (this.channels.has(channelName)) {
      console.log('[OptimizedRealtime] Match updates channel already exists');
      return;
    }

    console.log('[OptimizedRealtime] Creating match updates channel:', channelName);

    const channel = supabase
      .channel(channelName)
      // Listen to all match changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches'
      }, (payload) => {
        this.handleMatchUpdate(payload);
      })
      // Listen to all participant changes
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants'
      }, (payload) => {
        this.handleParticipantUpdate(payload);
      })
      .on('error', (error) => {
        console.error('[OptimizedRealtime] Match updates channel error:', error);
        this.emitEvent('error', { type: 'match_updates', error });
      })
      .on('subscription_error', (error) => {
        console.error('[OptimizedRealtime] Match updates subscription error:', error);
        this.emitEvent('subscription_error', { type: 'match_updates', error });
      });

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log('[OptimizedRealtime] Match updates channel status:', status);
      if (status === 'SUBSCRIBED') {
        this.emitEvent('connected', { channel: 'match_updates' });
      }
    });

    this.channels.set(channelName, channel);
    this.metrics.channelsCreated++;
  }

  /**
   * Handle user notification updates
   */
  handleUserNotification(payload) {
    console.log('[OptimizedRealtime] User notification:', payload.eventType, payload.new);
    this.metrics.messagesReceived++;
    this.metrics.lastActivity = new Date();
    
    this.emitEvent('user_notification', {
      type: 'notification',
      eventType: payload.eventType,
      data: payload.new,
      oldData: payload.old
    });
  }

  /**
   * Handle user participation updates
   */
  handleUserParticipation(payload) {
    console.log('[OptimizedRealtime] User participation:', payload.eventType, payload.new);
    this.metrics.messagesReceived++;
    this.metrics.lastActivity = new Date();
    
    this.emitEvent('user_participation', {
      type: 'participation',
      eventType: payload.eventType,
      data: payload.new,
      oldData: payload.old
    });
  }

  /**
   * Handle match updates
   */
  handleMatchUpdate(payload) {
    console.log('[OptimizedRealtime] Match update:', payload.eventType, payload.new?.id);
    this.metrics.messagesReceived++;
    this.metrics.lastActivity = new Date();
    
    this.emitEvent('match_update', {
      type: 'match',
      eventType: payload.eventType,
      data: payload.new,
      oldData: payload.old
    });
  }

  /**
   * Handle participant updates (for all matches)
   */
  handleParticipantUpdate(payload) {
    console.log('[OptimizedRealtime] Participant update:', payload.eventType, payload.new);
    this.metrics.messagesReceived++;
    this.metrics.lastActivity = new Date();
    
    this.emitEvent('participant_update', {
      type: 'participant',
      eventType: payload.eventType,
      data: payload.new,
      oldData: payload.old
    });
  }

  /**
   * Subscribe to specific event types
   * @param {string} eventType - Event type to listen for
   * @param {Function} callback - Callback function
   * @returns {string} Subscription ID
   */
  subscribe(eventType, callback) {
    const subscriptionId = `${eventType}_${Date.now()}_${Math.random()}`;
    
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Map());
    }
    
    this.subscribers.get(eventType).set(subscriptionId, callback);
    this.metrics.subscribersCount++;
    
    console.log('[OptimizedRealtime] New subscription:', eventType, subscriptionId);
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   * @param {string} subscriptionId - Subscription ID to remove
   */
  unsubscribe(subscriptionId) {
    for (const [eventType, callbacks] of this.subscribers.entries()) {
      if (callbacks.has(subscriptionId)) {
        callbacks.delete(subscriptionId);
        this.metrics.subscribersCount--;
        console.log('[OptimizedRealtime] Unsubscribed:', subscriptionId);
        
        // Clean up empty event types
        if (callbacks.size === 0) {
          this.subscribers.delete(eventType);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Emit events to subscribers
   */
  emitEvent(eventType, data) {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error('[OptimizedRealtime] Error in callback:', error);
        }
      });
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeChannels: this.channels.size,
      activeSubscribers: this.metrics.subscribersCount,
      connectionStatus: this.connectionStatus
    };
  }

  /**
   * Cleanup all subscriptions and channels
   */
  cleanup() {
    console.log('[OptimizedRealtime] Cleaning up all subscriptions');
    
    // Unsubscribe from all channels
    for (const [channelName, channel] of this.channels.entries()) {
      try {
        supabase.removeChannel(channel);
        console.log('[OptimizedRealtime] Removed channel:', channelName);
      } catch (error) {
        console.error('[OptimizedRealtime] Error removing channel:', channelName, error);
      }
    }
    
    // Clear all data
    this.channels.clear();
    this.subscribers.clear();
    this.connectionStatus = 'disconnected';
    this.currentUserId = null;
    this.metrics.subscribersCount = 0;
  }
}

// Create singleton instance
const optimizedRealtimeService = new OptimizedRealtimeService();

export { optimizedRealtimeService };
