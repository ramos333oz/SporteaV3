import { supabase } from './supabase';

/**
 * Optimized Real-time Service for managing Supabase subscriptions
 * Implements connection pooling, retry logic, and proper cleanup
 */
class OptimizedRealtimeService {
  constructor() {
    this.subscriptions = new Map();
    this.connectionState = 'disconnected';
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000; // Start with 1 second
    this.heartbeatInterval = null;
    this.reconnectTimeout = null;
    this.isDestroyed = false;
    
    // Bind methods to preserve context
    this.handleConnectionStateChange = this.handleConnectionStateChange.bind(this);
    this.heartbeat = this.heartbeat.bind(this);
    
    // Initialize connection monitoring
    this.initializeConnectionMonitoring();
  }

  /**
   * Initialize connection state monitoring
   */
  initializeConnectionMonitoring() {
    // Monitor connection state changes
    supabase.realtime.onOpen(() => {
      this.connectionState = 'connected';
      this.retryCount = 0;
      this.retryDelay = 1000;
      console.log('✅ Realtime connection established');
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Resubscribe to all channels
      this.resubscribeAll();
    });

    supabase.realtime.onClose(() => {
      this.connectionState = 'disconnected';
      console.log('❌ Realtime connection closed');
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Attempt reconnection
      this.scheduleReconnect();
    });

    supabase.realtime.onError((error) => {
      console.error('🔥 Realtime connection error:', error);
      this.connectionState = 'error';
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Attempt reconnection
      this.scheduleReconnect();
    });
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(this.heartbeat, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send heartbeat ping
   */
  heartbeat() {
    if (this.connectionState === 'connected') {
      // Send a lightweight ping to keep connection alive
      supabase.realtime.send({
        type: 'heartbeat',
        topic: 'phoenix',
        event: 'heartbeat',
        payload: {},
        ref: Date.now()
      });
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.isDestroyed || this.retryCount >= this.maxRetries) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(this.retryDelay * Math.pow(2, this.retryCount), 30000);
    
    console.log(`🔄 Scheduling reconnection in ${delay}ms (attempt ${this.retryCount + 1}/${this.maxRetries})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.retryCount++;
      this.retryDelay = delay;
      this.reconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect
   */
  async reconnect() {
    if (this.isDestroyed) return;
    
    try {
      console.log('🔄 Attempting to reconnect...');
      
      // Disconnect existing connection
      await supabase.realtime.disconnect();
      
      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reconnect
      supabase.realtime.connect();
      
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Resubscribe to all active channels
   */
  resubscribeAll() {
    console.log(`🔄 Resubscribing to ${this.subscriptions.size} channels`);
    
    for (const [key, subscription] of this.subscriptions) {
      try {
        // Remove old subscription
        if (subscription.channel) {
          supabase.removeChannel(subscription.channel);
        }
        
        // Create new subscription
        this.createSubscription(key, subscription.config);
      } catch (error) {
        console.error(`❌ Failed to resubscribe to ${key}:`, error);
      }
    }
  }

  /**
   * Subscribe to a table with optimized settings
   */
  subscribe(table, config = {}) {
    const key = `${table}_${JSON.stringify(config.filter || {})}`;
    
    // Check if already subscribed
    if (this.subscriptions.has(key)) {
      console.log(`⚠️ Already subscribed to ${key}`);
      return this.subscriptions.get(key);
    }

    return this.createSubscription(key, { table, ...config });
  }

  /**
   * Create a new subscription
   */
  createSubscription(key, config) {
    const { table, filter, onInsert, onUpdate, onDelete, onError } = config;
    
    try {
      // Create channel with optimized settings
      const channel = supabase
        .channel(`${table}_changes_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: filter
          },
          (payload) => {
            try {
              switch (payload.eventType) {
                case 'INSERT':
                  onInsert?.(payload.new);
                  break;
                case 'UPDATE':
                  onUpdate?.(payload.new, payload.old);
                  break;
                case 'DELETE':
                  onDelete?.(payload.old);
                  break;
              }
            } catch (error) {
              console.error(`❌ Error handling ${payload.eventType} for ${table}:`, error);
              onError?.(error);
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 Subscription status for ${table}:`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Successfully subscribed to ${table}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Channel error for ${table}`);
            onError?.(new Error(`Channel error for ${table}`));
          } else if (status === 'TIMED_OUT') {
            console.error(`⏰ Subscription timeout for ${table}`);
            onError?.(new Error(`Subscription timeout for ${table}`));
          }
        });

      const subscription = {
        channel,
        config,
        createdAt: Date.now()
      };

      this.subscriptions.set(key, subscription);
      
      console.log(`✅ Created subscription for ${key}`);
      return subscription;
      
    } catch (error) {
      console.error(`❌ Failed to create subscription for ${key}:`, error);
      config.onError?.(error);
      return null;
    }
  }

  /**
   * Unsubscribe from a table
   */
  unsubscribe(table, filter = {}) {
    const key = `${table}_${JSON.stringify(filter)}`;
    const subscription = this.subscriptions.get(key);
    
    if (subscription) {
      try {
        supabase.removeChannel(subscription.channel);
        this.subscriptions.delete(key);
        console.log(`✅ Unsubscribed from ${key}`);
      } catch (error) {
        console.error(`❌ Failed to unsubscribe from ${key}:`, error);
      }
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    console.log(`🧹 Unsubscribing from ${this.subscriptions.size} channels`);
    
    for (const [key, subscription] of this.subscriptions) {
      try {
        supabase.removeChannel(subscription.channel);
      } catch (error) {
        console.error(`❌ Failed to unsubscribe from ${key}:`, error);
      }
    }
    
    this.subscriptions.clear();
  }

  /**
   * Get connection status
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Get active subscriptions count
   */
  getSubscriptionCount() {
    return this.subscriptions.size;
  }

  /**
   * Destroy the service and cleanup all resources
   */
  destroy() {
    console.log('🧹 Destroying OptimizedRealtimeService');
    
    this.isDestroyed = true;
    
    // Clear timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Unsubscribe from all channels
    this.unsubscribeAll();
    
    // Disconnect
    supabase.realtime.disconnect();
  }
}

// Create singleton instance
const optimizedRealtimeService = new OptimizedRealtimeService();

export default optimizedRealtimeService;
