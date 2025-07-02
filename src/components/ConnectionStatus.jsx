import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Tooltip, Button, IconButton } from '@mui/material';
import { supabase } from '../services/supabase';
import CircleIcon from '@mui/icons-material/Circle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { productionRealtimeService } from '../services/productionOptimizedRealtime';

/**
 * ConnectionStatus component that displays the current WebSocket connection status
 * Implements exponential backoff for reconnection attempts to avoid overwhelming the server
 */
const ConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Connecting...');
  const [isResetting, setIsResetting] = useState(false);
  
  // Using refs to hold mutable values that persist across renders
  const reconnectTimeout = useRef(null);
  const heartbeatInterval = useRef(null);
  const maxReconnectAttempts = 10; // Maximum number of reconnection attempts

  // Calculate backoff delay based on attempts (exponential with jitter)
  const getBackoffDelay = useCallback((attempts) => {
    // Base delay: 2 seconds, doubles each attempt, max 30 seconds
    // Adding jitter (±20%) to prevent thundering herd problem
    const baseDelay = Math.min(2000 * Math.pow(2, attempts), 30000);
    const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
    return baseDelay + jitter;
  }, []);
  
  // Check connection status function with improved detection for Supabase v2.39.0
  const checkConnectionStatus = useCallback(() => {
    if (!supabase?.realtime) {
      console.error('Realtime client not available');
      setIsConnected(false);
      setStatusMessage('Realtime service unavailable');
      return;
    }
    
    try {
      // First check Phoenix transport's WebSocket (v2.39.0+ structure)
      if (supabase.realtime?.transport?.conn?.transport?.ws) {
        const ws = supabase.realtime.transport.conn.transport.ws;
        const wsConnected = ws.readyState === 1; // WebSocket.OPEN
        
        if (wsConnected) {
          setIsConnected(true);
          setStatusMessage('Live Updates Active');
          return;
        }
      }
      
      // Check transport connection state as fallback
      if (supabase.realtime.transport && 
          typeof supabase.realtime.transport.connectionState === 'string') {
        const internalState = supabase.realtime.transport.connectionState;
        const transportConnected = internalState === 'open' || internalState === 'connected';
        
        if (transportConnected) {
          setIsConnected(true);
          setStatusMessage('Live Updates Active');
          return;
        }
      }
      
      // Legacy getState method as final fallback
      if (typeof supabase.realtime.getState === 'function') {
        const state = supabase.realtime.getState();
        if (state === 'CONNECTED') {
          setIsConnected(true);
          setStatusMessage('Live Updates Active');
          return;
        }
      }
      
      // Channel state check as last resort
      const channels = supabase.realtime.channels || [];
      const activeChannels = channels.filter(ch => 
        ch.state === 'joined' || ch.state === 'joining' || ch.socket?.isConnected()
      ).length;
      
      if (activeChannels > 0) {
        console.log(`Found ${activeChannels} active channels, assuming connection is active`);
        setIsConnected(true);
        setStatusMessage('Live Updates Active');
        return;
      }
      
      // If all checks fail, consider disconnected
      setIsConnected(false);
      setStatusMessage('Connecting...');
    } catch (error) {
      console.error('Error checking connection status:', error);
      setIsConnected(false);
      setStatusMessage('Connection error');
    }
  }, []);


  // Reset channels and connections manually
  const resetConnection = useCallback(async () => {
    console.log('Manual connection reset requested');
    setIsResetting(true);
    setStatusMessage('Resetting connection...');

    try {
      // Use production realtime service for reset
      if (productionRealtimeService && typeof productionRealtimeService.globalCleanup === 'function') {
        await productionRealtimeService.globalCleanup();
        console.log('Production realtime service reset successful');
      } else {
        console.error('No reset method available on productionRealtimeService');
      }
      
      // Force reconnect the Supabase realtime client
      if (supabase?.realtime && typeof supabase.realtime.connect === 'function') {
        // Small delay to ensure clean disconnection before reconnecting
        setTimeout(() => {
          try {
            supabase.realtime.connect();
            setConnectionAttempts(0);
            console.log('Manual connection reset completed');
            setStatusMessage('Connection reset, reconnecting...');
            
            // Reset the resetting state after a short delay
            setTimeout(() => {
              setIsResetting(false);
              checkConnectionStatus();
            }, 2000);
          } catch (error) {
            console.error('Error reconnecting after reset:', error);
            setIsResetting(false);
            setStatusMessage('Reset failed');
          }
        }, 1000);
      } else {
        console.error('Supabase realtime client not available for reset');
        setIsResetting(false);
        setStatusMessage('Reset failed - client unavailable');
      }
    } catch (error) {
      console.error('Error during connection reset:', error);
      setIsResetting(false);
      setStatusMessage('Reset failed');
    }
  }, [checkConnectionStatus, setIsResetting, setStatusMessage, setConnectionAttempts]);

  // Run checkConnectionStatus periodically to update the UI
  useEffect(() => {
    // Initial check
    checkConnectionStatus();
    
    // Update the status display every 5 seconds
    const statusRefreshInterval = setInterval(() => {
      checkConnectionStatus();
    }, 5000);
    
    return () => {
      clearInterval(statusRefreshInterval);
    };
  }, [checkConnectionStatus]);

  // Connect to Supabase real-time with logging
  const connectToRealtime = useCallback(() => {
    if (connectionAttempts >= maxReconnectAttempts) {
      console.log(`Maximum reconnection attempts (${maxReconnectAttempts}) reached. Please refresh the page.`);
      setStatusMessage('Connection failed. Please refresh the page.');
      return;
    }

    console.log(`Attempt #${connectionAttempts + 1}: Connecting to Supabase real-time...`);
    setStatusMessage(`Connecting (attempt ${connectionAttempts + 1}/${maxReconnectAttempts})...`);
    
    if (supabase.realtime && typeof supabase.realtime.connect === 'function') {
      try {
        supabase.realtime.connect();
        // Update attempts counter after connection attempt
        setConnectionAttempts(prev => prev + 1);
      } catch (error) {
        console.error('Error connecting to Supabase real-time:', error);
      }
    } else {
      console.error('Supabase realtime client not available');
      setStatusMessage('Real-time service unavailable');
    }
  }, [connectionAttempts]);

  // Schedule reconnection with backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    const delay = getBackoffDelay(connectionAttempts);
    console.log(`Scheduling reconnection in ${Math.round(delay/1000)}s`);
    
    reconnectTimeout.current = setTimeout(() => {
      connectToRealtime();
    }, delay);
  }, [connectionAttempts, getBackoffDelay, connectToRealtime]);

  // Initial connection and state change listener
  useEffect(() => {
    // Initial connection attempt
    connectToRealtime();

    // Subscribe to Supabase connection state changes
    const handleConnectionStateChange = (event) => {
      const newState = event.detail;
      console.log('Supabase connection state changed:', newState);
      
      if (newState === 'CONNECTED') {
        setIsConnected(true);
        setConnectionAttempts(0); // Reset attempts counter on successful connection
        setStatusMessage('Live Updates Active');
        
        // Clear any pending reconnect timeout
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      } else if (newState === 'CONNECTING') {
        setIsConnected(false);
        setStatusMessage('Connecting...');
      } else if (newState === 'DISCONNECTED') {
        setIsConnected(false);
        setStatusMessage('Disconnected');
        scheduleReconnect();
      } else {
        setIsConnected(false);
        setStatusMessage('Connection error');
        scheduleReconnect();
      }
    };

    // Set up event listeners for connection state changes
    document.addEventListener(
      'supabase.realtime.connection-state-change',
      handleConnectionStateChange
    );

    return () => {
      // Clean up event listeners and timeouts
      document.removeEventListener(
        'supabase.realtime.connection-state-change',
        handleConnectionStateChange
      );
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connectToRealtime, scheduleReconnect]);

  // Heartbeat check every 15 seconds to detect stale connections
  useEffect(() => {
    heartbeatInterval.current = setInterval(async () => {
      try {
        checkConnectionStatus(); // Check status first
        
        // Enhanced connection monitoring logic
        const channelsExist = supabase?.realtime?.channels?.length > 0;
        let channelsActive = false;
        
        if (channelsExist) {
          // Check if any channels are in a good state
          channelsActive = supabase.realtime.channels.some(
            ch => ch.state === 'joined' || ch.socket?.isConnected?.()
          );
        }
        
        // Get realtime state if available
        let realtimeState = 'unknown';
        if (supabase?.realtime?.getState) {
          realtimeState = supabase.realtime.getState();
        }
        
        const needsReconnect = (
          // If we think we're connected but no channels are active
          (isConnected && channelsExist && !channelsActive) ||
          // Or if realtime explicitly reports not connected
          (realtimeState !== 'CONNECTED' && isConnected)
        );
        
        if (needsReconnect) {
          console.log('Connection issue detected during heartbeat, attempting auto-reconnect');
          setIsConnected(false);
          setStatusMessage('Auto-reconnecting...');
          
          // Attempt to reset subscriptions and reconnect
          try {
            if (productionRealtimeService && typeof productionRealtimeService.globalCleanup === 'function') {
              await productionRealtimeService.globalCleanup();
            }
            
            if (supabase.realtime && typeof supabase.realtime.connect === 'function') {
              supabase.realtime.connect();
            }
          } catch (reconnectError) {
            console.error('Auto-reconnect attempt failed:', reconnectError);
            // If auto-reconnect fails, schedule normal reconnect
            scheduleReconnect();
          }
        }
      } catch (error) {
        console.error('Error in heartbeat check:', error);
        // If heartbeat check fails, mark as disconnected
        if (isConnected) {
          setIsConnected(false);
          setStatusMessage('Connection monitoring error');
          scheduleReconnect();
        }
      }
    }, 15000);
    
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [checkConnectionStatus, isConnected, scheduleReconnect]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 0.5,
        pl: 1,
        borderRadius: 1,
        bgcolor: isConnected ? 'success.lighter' : 'warning.lighter',
        color: isConnected ? 'success.darker' : 'warning.darker',
        transition: 'background-color 0.3s ease'
      }}
    >
      <CircleIcon 
        sx={{ 
          fontSize: '0.75rem', 
          mr: 1, 
          color: isConnected ? 'success.main' : 'warning.main',
          animation: isConnected ? 'none' : 'pulse 1.5s infinite ease-in-out'
        }} 
      />
      <Tooltip title={isResetting ? 'Resetting connection...' : 'Reset connection'}>
          <IconButton
            size="small"
            onClick={resetConnection}
            disabled={isResetting}
            sx={{ ml: 0.5, opacity: isResetting ? 0.5 : 1 }}
          >
            <RefreshIcon fontSize="small" sx={{
              animation: isResetting ? 'spin 1s infinite linear' : 'none',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }} />
          </IconButton>
        </Tooltip>
      <Typography variant="caption" sx={{ ml: 0.5 }}>
            {statusMessage}
          </Typography>
    </Box>
  );
};

export default ConnectionStatus;
