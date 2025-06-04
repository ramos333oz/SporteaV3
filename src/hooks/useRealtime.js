import { useState, useEffect, useCallback, useRef } from 'react';
import realtimeService from '../services/realtime';
import { supabase } from '../services/supabase';

// Enhanced debug logging for real-time connections
const DEBUG_MODE = true;
const LOG_PREFIX = '[Sportea Realtime]';

function log(...args) {
  if (DEBUG_MODE) {
    console.log(LOG_PREFIX, ...args);
  }
}

function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

/**
 * Custom hook for accessing real-time features
 * Provides connection status and simplified subscription methods
 * Handles cleanup automatically when component unmounts
 * Implements exponential backoff for reconnection attempts
 */
export const useRealtime = () => {
  // Connection state
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    lastConnected: null,
    reconnecting: false,
    connectionAttempts: 0
  });

  // Track active subscriptions for this component
  const [subscriptions, setSubscriptions] = useState([]);
  
  // Using refs to track timeouts and intervals
  const reconnectTimeout = useRef(null);
  const heartbeatInterval = useRef(null);
  const maxReconnectAttempts = 10;

  // Calculate backoff delay based on attempts (exponential with jitter)
  const getBackoffDelay = useCallback((attempts) => {
    // Base delay: 2 seconds, doubles each attempt, max 30 seconds
    // Adding jitter (±20%) to prevent thundering herd problem
    const baseDelay = Math.min(2000 * Math.pow(2, attempts), 30000);
    const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
    return baseDelay + jitter;
  }, []);

  // Check connection status
  const checkConnectionStatus = useCallback(() => {
    const { realtime } = supabase;
    let isConnected = false;
    
    // Add safety check for realtime and getState method
    if (realtime && typeof realtime.getState === 'function') {
      isConnected = realtime.getState() === 'CONNECTED';
    }
    
    setConnectionState(prev => ({
      ...prev,
      isConnected,
      lastConnected: isConnected ? new Date() : prev.lastConnected,
      reconnecting: !isConnected && prev.isConnected
    }));
    
    return isConnected;
  }, []);

  // Schedule reconnection with backoff
  const scheduleReconnect = useCallback(() => {
    // Check if we've hit the max reconnect attempts
    if (connectionState.connectionAttempts >= maxReconnectAttempts) {
      logError(`Maximum reconnection attempts (${maxReconnectAttempts}) reached. Please refresh the page.`);
      return;
    }
    
    // Clear any existing reconnect timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    // Calculate delay based on current attempt count
    const delay = getBackoffDelay(connectionState.connectionAttempts);
    log(`Scheduling reconnection attempt ${connectionState.connectionAttempts + 1} in ${Math.round(delay/1000)}s`);
    
    // Set the reconnect timeout
    reconnectTimeout.current = setTimeout(() => {
      // Increment attempt counter
      setConnectionState(prev => {
        const newState = {
          ...prev,
          connectionAttempts: prev.connectionAttempts + 1,
          reconnecting: true
        };
        log('Connection state updated:', newState);
        return newState;
      });
      
      // Execute reconnection
      if (supabase.realtime && typeof supabase.realtime.connect === 'function') {
        log(`Executing reconnection attempt ${connectionState.connectionAttempts + 1}`);
        
        // Log WebSocket options being used (helpful for debugging)
        if (supabase.realtime._options) {
          log('WebSocket connection options:', {
            url: supabase.realtime._options.url,
            timeout: supabase.realtime._options.timeout,
            params: supabase.realtime._options.params,
            headers: supabase.realtime._options.headers,
            heartbeatIntervalMs: supabase.realtime._options.heartbeatIntervalMs
          });
        }
        
        supabase.realtime.connect();
      } else {
        logError('Unable to reconnect: supabase.realtime.connect is not available');
      }
    }, delay);
  }, [connectionState.connectionAttempts, getBackoffDelay]);

  // Force reconnection with reset of attempt counter
  const reconnect = useCallback(() => {
    // Reset connection attempts when manually triggering reconnect
    setConnectionState(prev => ({ 
      ...prev, 
      reconnecting: true,
      connectionAttempts: 0 
    }));
    
    // Safety checks for realtime methods
    if (supabase.realtime && typeof supabase.realtime.disconnect === 'function') {
      // First disconnect from Supabase (needed to clean up before reconnecting)
      supabase.realtime.disconnect();
      
      // Short timeout to ensure disconnect completes
      setTimeout(() => {
        // Reconnect to Supabase realtime
        if (typeof supabase.realtime.connect === 'function') {
          console.log('Manually reconnecting to Supabase real-time...');
          supabase.realtime.connect();
        }
        
        // Check connection after a short delay to allow time to reconnect
        setTimeout(() => {
          const connected = checkConnectionStatus();
          if (!connected) {
            // If still not connected, start the backoff process
            scheduleReconnect();
          }
        }, 1000);
      }, 500);
    } else {
      // If realtime is not available, just reset the state
      setTimeout(() => {
        checkConnectionStatus();
        setConnectionState(prev => ({ ...prev, reconnecting: false }));
      }, 500);
    }
  }, [checkConnectionStatus, scheduleReconnect]);

  // Subscribe to match updates
  const subscribeToMatch = useCallback((matchId, callback) => {
    log(`Subscribing to match updates for matchId: ${matchId}`);
    const subscriptionId = realtimeService.subscribeToMatch(matchId, callback);
    log(`Subscription created with ID: ${subscriptionId}`);
    
    // Track subscription
    setSubscriptions(prev => {
      const newSubs = [...prev, subscriptionId];
      log(`Updated subscriptions list, now tracking ${newSubs.length} subscriptions`);
      return newSubs;
    });
    
    return subscriptionId;
  }, []);

  // Subscribe to all matches
  const subscribeToAllMatches = useCallback((callback) => {
    log('Subscribing to all matches');
    const subscriptionId = realtimeService.subscribeToAllMatches(callback);
    log(`All matches subscription created with ID: ${subscriptionId}`);
    
    // Track subscription
    setSubscriptions(prev => {
      const newSubs = [...prev, subscriptionId];
      log(`Updated subscriptions list, now tracking ${newSubs.length} subscriptions`);
      return newSubs;
    });
    
    return subscriptionId;
  }, []);

  // Subscribe to user notifications
  const subscribeToUserNotifications = useCallback((userId, callback) => {
    const subscriptionId = realtimeService.subscribeToUserNotifications(userId, callback);
    setSubscriptions(prev => [...prev, subscriptionId]);
    return subscriptionId;
  }, []);

  // Subscribe to user's participated matches
  const subscribeToUserMatches = useCallback((userId, callback) => {
    const subscriptionId = realtimeService.subscribeToUserMatches(userId, callback);
    setSubscriptions(prev => [...prev, subscriptionId]);
    return subscriptionId;
  }, []);

  // Unsubscribe from a specific subscription
  const unsubscribe = useCallback((subscriptionId) => {
    log(`Unsubscribing from subscription ID: ${subscriptionId}`);
    const success = realtimeService.unsubscribe(subscriptionId);
    
    if (success) {
      log(`Successfully unsubscribed from ID: ${subscriptionId}`);
      setSubscriptions(prev => {
        const newSubs = prev.filter(id => id !== subscriptionId);
        log(`Updated subscriptions list, now tracking ${newSubs.length} subscriptions`);
        return newSubs;
      });
    } else {
      logError(`Failed to unsubscribe from ID: ${subscriptionId}`);
    }
    
    return success;
  }, []);

  // Setup initial connection check and monitoring
  useEffect(() => {
    log('Setting up real-time connection monitoring with exponential backoff');
    
    // Log initial connection settings
    if (supabase.realtime) {
      log('Supabase realtime client configuration:', {
        url: supabase.realtime._options?.url || 'Not available',
        eventsPerSecond: supabase.realtime._options?.eventsPerSecond || 'Not available',
        heartbeatIntervalMs: supabase.realtime._options?.heartbeatIntervalMs || 'Not available',
        params: supabase.realtime._options?.params || 'Not available',
        headers: supabase.realtime._options?.headers || 'Not available',
      });
    } else {
      logError('Supabase realtime client is not initialized');
    }
    
    // Initial connection attempt
    if (supabase.realtime && typeof supabase.realtime.connect === 'function') {
      log('Initiating connection to Supabase real-time...');
      
      // Try to get socket URL to validate endpoint
      try {
        const socketUrl = new URL(supabase.realtime._options?.url || '');
        log('Socket URL:', socketUrl.href);
        
        // Verify WebSocket protocol
        if (!socketUrl.protocol.startsWith('ws')) {
          logError('Invalid WebSocket URL protocol:', socketUrl.protocol);
        }
      } catch (error) {
        logError('Error parsing WebSocket URL:', error.message);
      }
      
      supabase.realtime.connect();
    } else {
      logError('Unable to connect: supabase.realtime.connect is not available');
    }
    
    // Initial check after short delay to allow connection
    setTimeout(() => {
      const status = checkConnectionStatus();
      log('Initial connection status:', status ? 'Connected' : 'Disconnected');
      
      // If not connected on initial check, start backoff reconnection process
      if (!status) {
        log('Initial connection failed, starting reconnection process');
        setConnectionState(prev => {
          const newState = {
            ...prev,
            connectionAttempts: 1 // Start at attempt 1 since we already tried once
          };
          log('Connection state updated:', newState);
          return newState;
        });
        scheduleReconnect();
      }
    }, 1000);

    // Setup listeners for connection state changes
    const onStateChange = (event) => {
      log('Supabase real-time state changed:', event);
      
      // Inspect browser WebSocket state if available
      if (supabase.realtime && supabase.realtime.socket) {
        const socketState = supabase.realtime.socket.readyState;
        const stateMap = {
          0: 'CONNECTING',
          1: 'OPEN',
          2: 'CLOSING',
          3: 'CLOSED'
        };
        log('WebSocket raw state:', socketState, stateMap[socketState] || 'UNKNOWN');
      }
      
      if (event === 'CONNECTED') {
        // Successfully connected, reset attempt counter and update state
        log('Successfully connected to Supabase real-time');
        setConnectionState(prev => {
          const newState = {
            ...prev,
            isConnected: true,
            lastConnected: new Date(),
            reconnecting: false,
            connectionAttempts: 0 // Reset counter on successful connection
          };
          log('Connection state updated:', newState);
          return newState;
        });
        
        // Clear any pending reconnect timeout
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
          log('Cleared pending reconnect timeout');
        }
      } else if (event === 'CONNECTING') {
        // Currently attempting to connect
        log('Attempting to connect to Supabase real-time');
        setConnectionState(prev => {
          const newState = {
            ...prev,
            isConnected: false,
            reconnecting: true
          };
          log('Connection state updated:', newState);
          return newState;
        });
      } else if (event === 'DISCONNECTED') {
        // Disconnected, update state but don't increment attempts yet
        logError('Disconnected from Supabase real-time');
        setConnectionState(prev => {
          const newState = {
            ...prev,
            isConnected: false,
            reconnecting: false
          };
          log('Connection state updated:', newState);
          return newState;
        });
        
        // Schedule reconnection with backoff
        scheduleReconnect();
      } else { // Handle error or other states
        logError('Unknown connection state:', event);
        setConnectionState(prev => {
          const newState = {
            ...prev,
            isConnected: false,
            reconnecting: false
          };
          log('Connection state updated:', newState);
          return newState;
        });
        scheduleReconnect();
      }
    };

    // Use the official Supabase state change API if available
    let subscription;
    if (supabase.realtime && typeof supabase.realtime.onStateChange === 'function') {
      subscription = supabase.realtime.onStateChange(onStateChange);
    }

    // Heartbeat check every 15 seconds to detect stale connections
    heartbeatInterval.current = setInterval(() => {
      log('Performing heartbeat connection check...');
      const connected = checkConnectionStatus();
      log('Heartbeat connection status:', connected ? 'Connected' : 'Disconnected');
      
      // Inspect WebSocket state if available
      if (supabase.realtime && supabase.realtime.socket) {
        const socketState = supabase.realtime.socket.readyState;
        const stateMap = {
          0: 'CONNECTING',
          1: 'OPEN',
          2: 'CLOSING',
          3: 'CLOSED'
        };
        log('WebSocket raw state during heartbeat:', socketState, stateMap[socketState] || 'UNKNOWN');
      } else {
        logError('WebSocket not available during heartbeat');
      }
      
      // If we think we're connected but aren't actually, trigger reconnect
      if (!connected && connectionState.isConnected) {
        logError('Connection lost during heartbeat check - state inconsistency detected');
        setConnectionState(prev => {
          const newState = {
            ...prev,
            isConnected: false,
            reconnecting: true
          };
          log('Connection state updated:', newState);
          return newState;
        });
        scheduleReconnect();
      }
    }, 15000);

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time connection monitoring');
      
      // Unsubscribe from state changes
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
      
      // Clear intervals and timeouts
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [checkConnectionStatus, scheduleReconnect, connectionState.isConnected]);


  // Cleanup subscriptions when component unmounts
  useEffect(() => {
    return () => {
      // Unsubscribe all subscriptions created by this hook instance
      subscriptions.forEach(id => {
        realtimeService.unsubscribe(id);
      });
    };
  }, [subscriptions]);

  return {
    connectionState,
    reconnect,
    subscribeToMatch,
    subscribeToAllMatches,
    subscribeToUserNotifications,
    subscribeToUserMatches,
    unsubscribe
  };
};

// We're now using a named export instead of default export
