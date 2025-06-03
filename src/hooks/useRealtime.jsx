import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import realtimeService from '../services/realtime';

/**
 * Hook for managing real-time subscriptions
 */
export const useRealtime = () => {
  const { user } = useAuth();
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);

  // Clean up subscriptions on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from all subscriptions when component unmounts
      activeSubscriptions.forEach(subId => {
        realtimeService.unsubscribe(subId);
      });
    };
  }, [activeSubscriptions]);

  /**
   * Subscribe to updates for a specific match
   */
  const subscribeToMatch = useCallback((matchId, callback) => {
    const subscriptionId = realtimeService.subscribeToMatch(matchId, callback);
    setActiveSubscriptions(prev => [...prev, subscriptionId]);
    return subscriptionId;
  }, []);

  /**
   * Subscribe to all matches (for discovery page)
   */
  const subscribeToAllMatches = useCallback((callback) => {
    const subscriptionId = realtimeService.subscribeToAllMatches(callback);
    setActiveSubscriptions(prev => [...prev, subscriptionId]);
    return subscriptionId;
  }, []);

  /**
   * Subscribe to user notifications
   */
  const subscribeToNotifications = useCallback(() => {
    if (!user) return null;
    
    const callback = (update) => {
      // Dispatch notification to global notification system
      const event = new CustomEvent('sportea:notification', { 
        detail: update.data 
      });
      window.dispatchEvent(event);
    };
    
    const subscriptionId = realtimeService.subscribeToUserNotifications(user.id, callback);
    setActiveSubscriptions(prev => [...prev, subscriptionId]);
    return subscriptionId;
  }, [user]);

  /**
   * Subscribe to user's match participations
   */
  const subscribeToUserMatches = useCallback((callback) => {
    if (!user) return null;
    
    const subscriptionId = realtimeService.subscribeToUserMatches(user.id, callback);
    setActiveSubscriptions(prev => [...prev, subscriptionId]);
    return subscriptionId;
  }, [user]);

  /**
   * Unsubscribe from a specific subscription
   */
  const unsubscribe = useCallback((subscriptionId) => {
    const success = realtimeService.unsubscribe(subscriptionId);
    if (success) {
      setActiveSubscriptions(prev => prev.filter(id => id !== subscriptionId));
    }
    return success;
  }, []);

  return {
    subscribeToMatch,
    subscribeToAllMatches,
    subscribeToNotifications,
    subscribeToUserMatches,
    unsubscribe
  };
};
