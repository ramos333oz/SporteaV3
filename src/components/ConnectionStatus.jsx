import React, { useState, useCallback } from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useProductionRealtime } from '../hooks/useProductionRealtime';
import { productionRealtimeService } from '../services/productionOptimizedRealtime';

/**
 * ConnectionStatus component that displays the current realtime connection status
 * Uses the production realtime service for accurate connection state
 */
const ConnectionStatus = () => {
  const { connectionState } = useProductionRealtime();
  const [isResetting, setIsResetting] = useState(false);

  // Derive status from the production realtime connection state
  const isConnected = connectionState.isConnected;
  const statusMessage = isConnected ? 'Connected' : 'Connecting...';
  const hasError = connectionState.error !== null;

  // Simple reset function that triggers a reconnection
  const resetConnection = useCallback(async () => {
    console.log('[ConnectionStatus] Manual connection reset requested');
    setIsResetting(true);

    try {
      // Use the production realtime service to handle reconnection
      if (productionRealtimeService && typeof productionRealtimeService.globalCleanup === 'function') {
        await productionRealtimeService.globalCleanup();
        console.log('[ConnectionStatus] Connection reset completed');
      }

      // Reset the resetting state after a short delay
      setTimeout(() => {
        setIsResetting(false);
      }, 2000);

    } catch (error) {
      console.error('[ConnectionStatus] Error during connection reset:', error);
      setIsResetting(false);
    }
  }, []);

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
