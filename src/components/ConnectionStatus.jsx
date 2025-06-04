import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Tooltip, Button, IconButton } from '@mui/material';
import { supabase } from '../services/supabase';
import CircleIcon from '@mui/icons-material/Circle';
import RefreshIcon from '@mui/icons-material/Refresh';
import realtimeService from '../services/realtime';

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
  
  // Check connection status function
  const checkConnectionStatus = useCallback(() => {
    if (supabase.realtime && typeof supabase.realtime.getState === 'function') {
      const state = supabase.realtime.getState();
      setIsConnected(state === 'CONNECTED');
      
      if (state === 'CONNECTED') {
        setStatusMessage('Live Updates Active');
      } else {
        setStatusMessage('Connecting...');
      }
    }
  }, []);

  // Reset channels and connections manually
  const resetConnection = useCallback(() => {
    console.log('Manual connection reset requested');
    setIsResetting(true);
    setStatusMessage('Resetting connection...');
    
    try {
      // Use our enhanced realtime service to reset all channels
      realtimeService.resetChannels();
      
      // Force reconnect the Supabase realtime client
      if (supabase.realtime && typeof supabase.realtime.connect === 'function') {
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

  // Initial connection status check
  useEffect(() => {
    checkConnectionStatus();
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
    
    // Heartbeat check every 15 seconds to detect stale connections
    heartbeatInterval.current = setInterval(() => {
      if (supabase.realtime && typeof supabase.realtime.getState === 'function') {
        const state = supabase.realtime.getState();
        if (state !== 'CONNECTED' && isConnected) {
          console.log('Connection lost during heartbeat check');
          setIsConnected(false);
          setStatusMessage('Reconnecting...');
          scheduleReconnect();
        }
      }
    }, 15000);

    return () => {
      // Clean up event listeners, intervals, and timeouts
      document.removeEventListener(
        'supabase.realtime.connection-state-change',
        handleConnectionStateChange
      );
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connectToRealtime, scheduleReconnect]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '4px 8px',
      }}
    >
      {/* Reset button shown when connection attempts are high or connection is stuck */}
      {(connectionAttempts > maxReconnectAttempts / 2 || statusMessage === 'Connection failed. Please refresh the page.' || statusMessage === 'Reset failed') && (
        <Tooltip title="Reset real-time connection" arrow placement="bottom">
          <IconButton 
            size="small" 
            onClick={resetConnection} 
            disabled={isResetting}
            sx={{ mr: 1, opacity: isResetting ? 0.5 : 1 }}
            aria-label="Reset connection"
          >
            <RefreshIcon 
              fontSize="small" 
              sx={{ 
                animation: isResetting ? 'spin 1s infinite linear' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }} 
            />
          </IconButton>
        </Tooltip>
      )}
      
      <Tooltip title={`Connection attempts: ${connectionAttempts}/${maxReconnectAttempts}`} arrow placement="bottom-end">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            cursor: 'default',
          }}
        >
          <CircleIcon
            sx={{
              fontSize: '12px',
              color: isConnected ? '#4CAF50' : connectionAttempts >= maxReconnectAttempts ? '#FF9800' : '#F44336',
              marginRight: '8px',
              animation: isConnected ? 'none' : 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 }
              }
            }}
          />
          <Typography 
            variant="caption" 
            color={isConnected ? 'success.main' : connectionAttempts >= maxReconnectAttempts ? 'warning.main' : 'error.main'}
          >
            {statusMessage}
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );
};

export default ConnectionStatus;
