import { useState, useEffect, useCallback, useRef } from 'react';
import realtimeService from '../services/realtime';
import { supabase } from '../services/supabase';

// Enhanced debug logging for real-time connections
const DEBUG_MODE = false; // Set to false to reduce logging in production
const LOG_PREFIX = '[Sportea Realtime]';

/**
 * Enhanced logging function for realtime hook
 */
function log(...args) {
  if (DEBUG_MODE) {
    console.log(LOG_PREFIX, ...args);
  }
}

/**
 * Error logging function for realtime hook
 */
function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

/**
 * Custom hook for accessing real-time features
 * Provides connection status and simplified subscription methods
 * Handles cleanup automatically when component unmounts
 * Implements exponential backoff for reconnection attempts
 */
const useRealtime = () => {
  // Import URL and API key from environment for direct access
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  // Initial state for the connection status
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    reconnecting: false,
    connectionAttempts: 0,
    lastConnected: null
  });
  
  // Constants for reconnection
  const baseReconnectDelay = 2000; // 2 seconds - increased for better stability
  const maxReconnectAttempts = 20; // Increased from 10 to 20 for more persistent reconnection
  
  // Track active subscriptions for this component
  const [subscriptions, setSubscriptions] = useState([]);
  
  // Using refs to track timeouts and intervals
  const reconnectTimeout = useRef(null);
  const heartbeatInterval = useRef(null);
  const heartbeatFailureCounter = useRef(0); // Add a ref to track failure count

  // Calculate backoff delay based on attempts (exponential with jitter)
  const getBackoffDelay = useCallback((attempts) => {
    // Base delay: 1 second for first attempt, then doubles each attempt, max 15 seconds
    // Adding jitter (±20%) to prevent thundering herd problem
    const baseDelay = Math.min(1000 * Math.pow(2, attempts), 15000);
    const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
    return baseDelay + jitter;
  }, []);

  // Check connection status using WebSocket readyState if available
  const checkConnectionStatus = useCallback(() => {
    if (!supabase?.realtime) {
      logError('Realtime client not available');
      return false;
    }
    
    try {
      // DEBUG: Log the entire realtime object structure to see what's available
      log('Current Supabase realtime object structure:', 
          Object.keys(supabase.realtime || {}).join(', '));
      
      // ----- CONNECTION CHECK PRIORITY ORDER -----
      // Supabase v2.39.0+ has different paths for WebSocket objects
      
      // Method 1: First check for socket in transport.conn
      if (supabase.realtime?.transport?.conn) {
        const conn = supabase.realtime.transport.conn;
        
        if (conn.transport && conn.transport.ws) {
          // Phoenix transport's WebSocket
          const wsState = conn.transport.ws.readyState;
          const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
          const stateName = stateNames[wsState] || 'UNKNOWN';
          const connected = wsState === 1; // WebSocket.OPEN
          
          log(`Phoenix WebSocket state: ${wsState} (${stateName}) - Connected: ${connected}`);
          return connected;
        }
      }
      
      // Method 2: Original socket path (older versions)
      const hasSocket = supabase.realtime?.socket !== undefined;
      log(`Traditional socket object exists: ${hasSocket}`);
      
      if (hasSocket && typeof supabase.realtime.socket.readyState === 'number') {
        const socketState = supabase.realtime.socket.readyState;
        const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
        const stateName = stateNames[socketState] || 'UNKNOWN';
        const connected = socketState === 1; // 1 = OPEN (WebSocket.OPEN)
        
        log(`WebSocket readyState: ${socketState} (${stateName}) - Connected: ${connected}`);
        return connected;
      }
      
      // Method 3: Check the internal transport connection state
      if (supabase.realtime.transport && 
          typeof supabase.realtime.transport.connectionState === 'string') {
        
        const internalState = supabase.realtime.transport.connectionState;
        const transportConnected = internalState === 'open' || internalState === 'connected';
        
        if (transportConnected) {
          log('Connected based on transport connection state');
          return true;
        }
      }
      
      // Method 4: Last resort - check channel state but ONLY if we haven't determined socket is closed
      if (supabase.realtime.channels && Array.isArray(supabase.realtime.channels) && 
          supabase.realtime.channels.length > 0) {
          
        const channelStates = supabase.realtime.channels.map(ch => ch.state || 'unknown');
        
        const anyChannelConnected = channelStates.some(state => 
          state === 'joined' || state === 'joining');
        
        if (anyChannelConnected) {
          log('At least one channel is connected/joining');
          // This is risky but might work for some clients
          return true;
        }
      } else {
        log('No channels available to check');
      }
      
      // If we got here, we couldn't verify a connection through any method
      log('Could not verify connection through any method, assuming disconnected');
      return false;
    } catch (error) {
      logError('Error checking connection status:', error);
      return false;
    }
  }, [supabase]);

  // Reconnect function with exponential backoff
  const reconnect = useCallback(() => {
    log('Reconnection attempt initiated');
    // Reset connection attempts counter to give a fresh set of tries
    setConnectionState(prev => ({
      ...prev,
      connectionAttempts: prev.connectionAttempts + 1,
      reconnecting: true
    }));
    
    if (!supabase?.realtime) {
      logError('Cannot reconnect - Supabase realtime client not available');
      return;
    }
    
    // Only try to reconnect if not already connected
    if (!checkConnectionStatus()) {
      try {
        log(`Attempting reconnection (attempt ${connectionState.connectionAttempts})`);
        
        // Check if realtimeService is available
        if (!realtimeService) {
          log('RealtimeService not available');
        } else {
          // First try the primary method name
          if (typeof realtimeService.resetSubscriptions === 'function') {
            realtimeService.resetSubscriptions();
            log('Reset all subscriptions via realtimeService.resetSubscriptions()');
          } 
          // Only as a last resort, try the alias method
          else if (typeof realtimeService.resetChannels === 'function') {
            realtimeService.resetChannels();
            log('Reset all channels via realtimeService.resetChannels()');
          } 
          else {
            log('Neither resetSubscriptions nor resetChannels methods available on realtimeService');
            
            // Fallback to direct reconnection if we have no other options
            if (supabase.realtime && typeof supabase.realtime.connect === 'function') {
              log('Attempting direct supabase.realtime.connect() as fallback');
              supabase.realtime.connect();
            }
          }
        }
        
        // Check connection after a delay
        setTimeout(() => {
          const connected = checkConnectionStatus();
          log(`Reconnection attempt result:`, connected ? 'Connected' : 'Failed');
          
          if (connected) {
            // Successfully reconnected
            setConnectionState(prev => ({
              ...prev,
              isConnected: true,
              reconnecting: false,
              lastConnected: new Date()
            }));
          } else {
            // Still not connected, try again if not at limit
            scheduleReconnect();
          }
        }, 2000);
      } catch (error) {
        logError('Error during reconnection attempt:', error);
        scheduleReconnect();
      }
    } else {
      log('Already connected, no need to reconnect');
    }
  }, [supabase, checkConnectionStatus, connectionState.connectionAttempts]);

  // Schedule reconnection with backoff
  const scheduleReconnect = useCallback(() => {
    // Check if we've hit the max reconnect attempts
    if (connectionState.connectionAttempts >= maxReconnectAttempts) {
      // Attempt one final reset of the realtime client
      try {
        log('Maximum reconnection attempts reached, performing full client reset...');
        
        if (supabase.realtime && typeof supabase.realtime.disconnect === 'function') {
          supabase.realtime.disconnect();
        }
        
        // Small delay before final reconnect attempt
        setTimeout(() => {
          if (supabase.realtime && typeof supabase.realtime.connect === 'function') {
            log('Final connection attempt after reset');
            supabase.realtime.connect();
          }
        }, 1000);
      } catch (resetError) {
        logError('Error during final reset attempt:', resetError);
      }
      logError(`Maximum reconnection attempts (${maxReconnectAttempts}) reached. Please refresh the page.`);
      return;
    }
    
    // Clear any existing reconnect timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    // Calculate delay based on attempt number
    const delay = getBackoffDelay(connectionState.connectionAttempts);
    log(`Scheduling reconnect attempt #${connectionState.connectionAttempts + 1} in ${delay}ms`);
    
    // Set the timeout for reconnecting
    reconnectTimeout.current = setTimeout(() => {
      setConnectionState(prev => ({
        ...prev,
        connectionAttempts: prev.connectionAttempts + 1
      }));
      
      // Attempt to reconnect
      log(`Reconnecting (attempt #${connectionState.connectionAttempts + 1})...`);
      reconnect();
    }, delay);
  }, [checkConnectionStatus, getBackoffDelay, connectionState.connectionAttempts]);

  // Set up heartbeat check to periodically verify connection
  useEffect(() => {
    // Function to check connection health
    const checkHeartbeat = () => {
      const connected = checkConnectionStatus();
        log('Heartbeat check - Connected:', connected);
      
      if (connected) {
        // Reset failure counter on successful connection
        heartbeatFailureCounter.current = 0;
        
        // Update connection state if it's different
        setConnectionState(prev => {
          if (!prev.isConnected) {
            return {
            ...prev,
            isConnected: true,
            reconnecting: false,
            lastConnected: new Date()
            };
        }
          return prev; // No change needed
        });
        } else {
        // Count consecutive failures
        heartbeatFailureCounter.current += 1;
        
        // If we have multiple consecutive failures, try to reconnect
      if (heartbeatFailureCounter.current >= 3) {
          log('⚠️ Multiple consecutive failures ('+ heartbeatFailureCounter.current +'), triggering reconnect');
        
          // Only update state and attempt reconnect if not already reconnecting
        setConnectionState(prev => {
            if (prev.isConnected || !prev.reconnecting) {
            return {
              ...prev,
              isConnected: false,
                reconnecting: true
            };
          }
          return prev;
        });
        
          // Schedule reconnection with backoff
        scheduleReconnect();
      }
      }
    };
    
    // Start heartbeat checks (every 30 seconds)
    heartbeatInterval.current = setInterval(checkHeartbeat, 30000);
    
    // Initial check
    checkHeartbeat();
    
    // Cleanup on unmount
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [checkConnectionStatus, scheduleReconnect]);

  // Cleanup subscriptions when component unmounts
  useEffect(() => {
    return () => {
      // Unsubscribe all subscriptions created by this hook instance
      subscriptions.forEach(id => {
        realtimeService.unsubscribe(id);
      });
    };
  }, [subscriptions]);

  // Expose debug methods for troubleshooting
  const debugInfo = useCallback(() => {
    log('Current connection state:', connectionState);
    
    // Get WebSocket URL and config
    const wsConfig = {
      url: supabase.realtime?._options?.url || 'Not available',
      connectionState: supabase.realtime?.getState?.() || 'Not available',
      heartbeatIntervalMs: supabase.realtime?._options?.heartbeatIntervalMs || 'Not available'
    };
    log('WebSocket configuration:', wsConfig);
    
    // Check socket state if available
    if (supabase.realtime?.socket) {
      const socketReadyState = supabase.realtime.socket.readyState;
      const stateMap = {
        0: 'CONNECTING',
        1: 'OPEN',
        2: 'CLOSING',
        3: 'CLOSED'
      };
      log('Raw WebSocket state:', socketReadyState, stateMap[socketReadyState] || 'UNKNOWN');
    }
    
    return wsConfig;
  }, [connectionState]);
  
  // Force reset method for extreme cases
  const forceReset = useCallback(() => {
    log('Performing forced reset of realtime connection');
    
    // Clean up existing subscriptions
    subscriptions.forEach(id => {
      realtimeService.unsubscribe(id);
    });
    setSubscriptions([]);
    
    // Reset connection state
    setConnectionState({
      isConnected: false,
      lastConnected: null,
      reconnecting: false,
      connectionAttempts: 0
    });
    
    // Force disconnect
    if (supabase.realtime && typeof supabase.realtime.disconnect === 'function') {
      supabase.realtime.disconnect();
      
      // Small delay before reconnecting
      setTimeout(() => {
        if (supabase.realtime && typeof supabase.realtime.connect === 'function') {
          log('Reconnecting after forced reset');
          supabase.realtime.connect();
        }
      }, 1000);
    }
    
    return true;
  }, [subscriptions]);

  // Force manual reconnect (for UI buttons)
  const forceManualReconnect = useCallback(() => {
    log('Manual reconnection attempt triggered');
    // Reset connection attempts counter to give a fresh set of tries
    setConnectionState(prev => ({
      ...prev,
      connectionAttempts: 0,
      reconnecting: true
    }));
    
    // Use the resetSubscriptions method instead of disconnect/connect
    if (realtimeService && typeof realtimeService.resetSubscriptions === 'function') {
      realtimeService.resetSubscriptions();
      log('Manually reset all subscriptions');
      
      // Check connection after a delay
      setTimeout(() => {
        const connected = checkConnectionStatus();
        log(`Manual reconnection result:`, connected ? 'Connected' : 'Failed');
      }, 2000);
    } else {
      // Fallback to reconnect function
      reconnect();
    }
  }, [checkConnectionStatus, reconnect]);
  
  // Helper to subscribe to a specific match
  const subscribeToMatch = useCallback((matchId, callback) => {
    if (!matchId) {
      logError('Cannot subscribe to match: Invalid match ID');
      return null;
    }
    
    try {
      const id = realtimeService.subscribeToMatch(matchId, callback);
      setSubscriptions(prev => [...prev, id]);
      return id;
    } catch (error) {
      logError('Error subscribing to match:', error);
      return null;
    }
  }, []);
  
  // Helper to subscribe to all matches
  const subscribeToAllMatches = useCallback((callback) => {
    try {
      const id = realtimeService.subscribeToAllMatches(callback);
      setSubscriptions(prev => [...prev, id]);
      return id;
    } catch (error) {
      logError('Error subscribing to all matches:', error);
      return null;
    }
  }, []);
  
  // Helper to subscribe to user notifications
  const subscribeToUserNotifications = useCallback((userId, callback) => {
    if (!userId) {
      logError('Cannot subscribe to notifications: Invalid user ID');
      return null;
    }
    
    try {
      const id = realtimeService.subscribeToUserNotifications(userId, callback);
      setSubscriptions(prev => [...prev, id]);
      return id;
    } catch (error) {
      logError('Error subscribing to user notifications:', error);
      return null;
    }
  }, []);
  
  // Helper to subscribe to user's matches
  const subscribeToUserMatches = useCallback((userId, callback) => {
    if (!userId) {
      logError('Cannot subscribe to user matches: Invalid user ID');
      return null;
    }
    
    try {
      const id = realtimeService.subscribeToUserMatches(userId, callback);
      setSubscriptions(prev => [...prev, id]);
      return id;
    } catch (error) {
      logError('Error subscribing to user matches:', error);
      return null;
    }
  }, []);
  
  // Helper to unsubscribe from a specific subscription
  const unsubscribe = useCallback((id) => {
    if (!id) return;
    
    realtimeService.unsubscribe(id);
    setSubscriptions(prev => prev.filter(subId => subId !== id));
  }, []);

  // Note: Notification subscription handling has been moved to NotificationPanel.jsx
  // This prevents duplicate subscription code and ensures proper variable scoping

  return {
    connectionState,
    reconnect,
    subscribeToMatch,
    subscribeToAllMatches,
    subscribeToUserNotifications,
    subscribeToUserMatches,
    unsubscribe,
    debugInfo,
    forceReset
  };
};

// Export the custom hook
export { useRealtime };
