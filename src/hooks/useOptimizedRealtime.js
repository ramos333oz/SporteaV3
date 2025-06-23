import { useState, useEffect, useCallback, useRef } from 'react';
import { optimizedRealtimeService } from '../services/optimizedRealtime';
import { useAuth } from './useAuth';

/**
 * Optimized Real-time Hook
 * 
 * Provides a clean interface to the optimized real-time service
 * Automatically manages subscriptions and cleanup
 * Reduces from 5+ subscriptions to 2 optimized channels
 */
export const useOptimizedRealtime = () => {
  const { user } = useAuth();
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    userActivityConnected: false,
    matchUpdatesConnected: false,
    lastActivity: null
  });
  const [metrics, setMetrics] = useState({});
  const subscriptionsRef = useRef(new Set());

  // Initialize service when user changes
  useEffect(() => {
    if (user?.id) {
      console.log('[useOptimizedRealtime] Initializing for user:', user.id);
      optimizedRealtimeService.initialize(user.id);
      
      // Subscribe to connection events
      const connectionSub = optimizedRealtimeService.subscribe('connected', (data) => {
        console.log('[useOptimizedRealtime] Channel connected:', data.channel);
        setConnectionState(prev => ({
          ...prev,
          [data.channel === 'user_activity' ? 'userActivityConnected' : 'matchUpdatesConnected']: true,
          isConnected: prev.userActivityConnected || prev.matchUpdatesConnected || data.channel === 'user_activity'
        }));
      });
      
      subscriptionsRef.current.add(connectionSub);
      
      // Update metrics periodically
      const metricsInterval = setInterval(() => {
        const currentMetrics = optimizedRealtimeService.getMetrics();
        setMetrics(currentMetrics);
        setConnectionState(prev => ({
          ...prev,
          lastActivity: currentMetrics.lastActivity
        }));
      }, 5000);

      return () => {
        clearInterval(metricsInterval);
        optimizedRealtimeService.unsubscribe(connectionSub);
        subscriptionsRef.current.delete(connectionSub);
      };
    }
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from all subscriptions created by this hook instance
      subscriptionsRef.current.forEach(subId => {
        optimizedRealtimeService.unsubscribe(subId);
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  /**
   * Subscribe to user notifications
   * Replaces the old subscribeToUserNotifications
   */
  const subscribeToUserNotifications = useCallback((callback) => {
    if (!user?.id) {
      console.warn('[useOptimizedRealtime] Cannot subscribe to notifications: No user');
      return null;
    }

    const subscriptionId = optimizedRealtimeService.subscribe('user_notification', callback);
    subscriptionsRef.current.add(subscriptionId);
    
    console.log('[useOptimizedRealtime] Subscribed to user notifications:', subscriptionId);
    return subscriptionId;
  }, [user?.id]);

  /**
   * Subscribe to user's match participation updates
   * Replaces the old subscribeToUserMatches
   */
  const subscribeToUserParticipation = useCallback((callback) => {
    if (!user?.id) {
      console.warn('[useOptimizedRealtime] Cannot subscribe to participation: No user');
      return null;
    }

    const subscriptionId = optimizedRealtimeService.subscribe('user_participation', callback);
    subscriptionsRef.current.add(subscriptionId);
    
    console.log('[useOptimizedRealtime] Subscribed to user participation:', subscriptionId);
    return subscriptionId;
  }, [user?.id]);

  /**
   * Subscribe to all match updates
   * Replaces the old subscribeToAllMatches
   */
  const subscribeToMatchUpdates = useCallback((callback) => {
    const subscriptionId = optimizedRealtimeService.subscribe('match_update', callback);
    subscriptionsRef.current.add(subscriptionId);
    
    console.log('[useOptimizedRealtime] Subscribed to match updates:', subscriptionId);
    return subscriptionId;
  }, []);

  /**
   * Subscribe to all participant updates
   * Replaces participant updates from the old subscribeToAllMatches
   */
  const subscribeToParticipantUpdates = useCallback((callback) => {
    const subscriptionId = optimizedRealtimeService.subscribe('participant_update', callback);
    subscriptionsRef.current.add(subscriptionId);
    
    console.log('[useOptimizedRealtime] Subscribed to participant updates:', subscriptionId);
    return subscriptionId;
  }, []);

  /**
   * Subscribe to errors
   */
  const subscribeToErrors = useCallback((callback) => {
    const subscriptionId = optimizedRealtimeService.subscribe('error', callback);
    subscriptionsRef.current.add(subscriptionId);
    
    console.log('[useOptimizedRealtime] Subscribed to errors:', subscriptionId);
    return subscriptionId;
  }, []);

  /**
   * Unsubscribe from a specific subscription
   */
  const unsubscribe = useCallback((subscriptionId) => {
    if (!subscriptionId) return false;
    
    const success = optimizedRealtimeService.unsubscribe(subscriptionId);
    if (success) {
      subscriptionsRef.current.delete(subscriptionId);
      console.log('[useOptimizedRealtime] Unsubscribed:', subscriptionId);
    }
    return success;
  }, []);

  /**
   * Get current performance metrics
   */
  const getMetrics = useCallback(() => {
    return optimizedRealtimeService.getMetrics();
  }, []);

  /**
   * Force cleanup (for debugging)
   */
  const forceCleanup = useCallback(() => {
    console.log('[useOptimizedRealtime] Force cleanup requested');
    subscriptionsRef.current.forEach(subId => {
      optimizedRealtimeService.unsubscribe(subId);
    });
    subscriptionsRef.current.clear();
    optimizedRealtimeService.cleanup();
    setConnectionState({
      isConnected: false,
      userActivityConnected: false,
      matchUpdatesConnected: false,
      lastActivity: null
    });
  }, []);

  return {
    // Connection state
    connectionState,
    metrics,
    
    // Subscription methods (optimized)
    subscribeToUserNotifications,
    subscribeToUserParticipation,
    subscribeToMatchUpdates,
    subscribeToParticipantUpdates,
    subscribeToErrors,
    
    // Management methods
    unsubscribe,
    getMetrics,
    forceCleanup,
    
    // Backward compatibility helpers
    subscribeToAllMatches: subscribeToMatchUpdates, // Alias for backward compatibility
    subscribeToUserMatches: subscribeToUserParticipation, // Alias for backward compatibility
  };
};

export default useOptimizedRealtime;
