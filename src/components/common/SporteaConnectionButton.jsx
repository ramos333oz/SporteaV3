import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { supabase } from '../../services/supabase';

// Mural-inspired connection button variants
const connectionButtonVariants = cva(
  "p-1.5 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50",
  {
    variants: {
      variant: {
        default: "hover:bg-gray-100 text-gray-500 hover:text-brand-primary",
        connected: "hover:bg-green-50 text-green-600 hover:text-green-700",
        disconnected: "hover:bg-orange-50 text-orange-500 hover:text-orange-600",
        resetting: "bg-brand-primary/10 text-brand-primary cursor-not-allowed",
      },
      size: {
        sm: "p-1",
        default: "p-1.5",
        lg: "p-2",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const statusIndicatorVariants = cva(
  "w-2 h-2 rounded-full transition-colors duration-200",
  {
    variants: {
      status: {
        connected: "bg-green-500",
        disconnected: "bg-orange-500 animate-pulse",
        connecting: "bg-yellow-500 animate-pulse",
      }
    },
    defaultVariants: {
      status: "connecting",
    },
  }
)

export function SporteaConnectionButton({ 
  className, 
  size = "default",
  showStatus = true,
  ...props 
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Connecting...');
  
  const reconnectTimeout = useRef(null);
  const heartbeatInterval = useRef(null);
  const maxReconnectAttempts = 10;

  // Calculate backoff delay with exponential backoff and jitter
  const getBackoffDelay = useCallback((attempts) => {
    const baseDelay = Math.min(2000 * Math.pow(2, attempts), 30000);
    const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
    return baseDelay + jitter;
  }, []);

  // Check connection status
  const checkConnectionStatus = useCallback(() => {
    if (!supabase?.realtime) {
      setIsConnected(false);
      setStatusMessage('Service unavailable');
      return;
    }

    try {
      const channelsExist = supabase?.realtime?.channels?.length > 0;
      let channelsActive = false;
      
      if (channelsExist) {
        channelsActive = supabase.realtime.channels.some(
          ch => ch.state === 'joined' || ch.socket?.isConnected?.()
        );
      }

      if (channelsActive) {
        setIsConnected(true);
        setStatusMessage('Connected');
        setConnectionAttempts(0);
      } else {
        setIsConnected(false);
        setStatusMessage(channelsExist ? 'Reconnecting...' : 'Connecting...');
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setIsConnected(false);
      setStatusMessage('Connection error');
    }
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (connectionAttempts >= maxReconnectAttempts) {
      setStatusMessage('Connection failed');
      return;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    const delay = getBackoffDelay(connectionAttempts);
    setStatusMessage(`Reconnecting in ${Math.ceil(delay / 1000)}s...`);

    reconnectTimeout.current = setTimeout(() => {
      setConnectionAttempts(prev => prev + 1);
      connectToRealtime();
    }, delay);
  }, [connectionAttempts, getBackoffDelay]);

  // Connect to realtime
  const connectToRealtime = useCallback(async () => {
    try {
      setStatusMessage('Connecting...');
      
      if (supabase?.realtime) {
        // Force reconnection
        await supabase.realtime.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await supabase.realtime.connect();
      }
      
      checkConnectionStatus();
    } catch (error) {
      console.error('Error connecting to realtime:', error);
      setIsConnected(false);
      setStatusMessage('Connection failed');
      scheduleReconnect();
    }
  }, [checkConnectionStatus, scheduleReconnect]);

  // Reset connection manually
  const resetConnection = async () => {
    if (isResetting) return;
    
    setIsResetting(true);
    setStatusMessage('Resetting...');
    
    try {
      // Clear any existing timeouts
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      
      // Reset connection attempts
      setConnectionAttempts(0);
      
      // Disconnect and reconnect
      if (supabase?.realtime) {
        await supabase.realtime.disconnect();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await supabase.realtime.connect();
      }
      
      // Check status after reset
      setTimeout(() => {
        checkConnectionStatus();
        setIsResetting(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error resetting connection:', error);
      setStatusMessage('Reset failed');
      setIsResetting(false);
      scheduleReconnect();
    }
  };

  // Initial connection check
  useEffect(() => {
    checkConnectionStatus();
    connectToRealtime();
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [checkConnectionStatus, connectToRealtime]);

  // Heartbeat monitoring
  useEffect(() => {
    heartbeatInterval.current = setInterval(() => {
      checkConnectionStatus();
      
      if (!isConnected && connectionAttempts < maxReconnectAttempts) {
        scheduleReconnect();
      }
    }, 15000);
    
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [checkConnectionStatus, isConnected, connectionAttempts, scheduleReconnect]);

  const getVariant = () => {
    if (isResetting) return 'resetting';
    if (isConnected) return 'connected';
    return 'disconnected';
  };

  const getStatusType = () => {
    if (isConnected) return 'connected';
    if (isResetting) return 'connecting';
    return 'disconnected';
  };

  return (
    <div className="flex items-center gap-2">
      {showStatus && (
        <div className="flex items-center gap-2">
          <div className={cn(statusIndicatorVariants({ status: getStatusType() }))} />
          <span className="text-xs text-gray-500 hidden sm:inline">
            {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      )}
      
      <button
        className={cn(connectionButtonVariants({ variant: getVariant(), size, className }))}
        onClick={resetConnection}
        disabled={isResetting}
        aria-label={isResetting ? 'Resetting connection...' : 'Reset connection'}
        title={statusMessage}
        {...props}
      >
        <RefreshCw 
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isResetting && "animate-spin"
          )} 
        />
      </button>
    </div>
  );
}

export default SporteaConnectionButton;
