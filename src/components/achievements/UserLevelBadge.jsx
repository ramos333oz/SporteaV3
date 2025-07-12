import React from 'react';
import { Box } from '@mui/material';
import { getLevelColor } from '../../services/achievementService';

/**
 * UserLevelBadge Component
 * Displays a small level badge on user avatars throughout the app
 * Following gaming industry standards (similar to PUBG, Valorant, etc.)
 */
const UserLevelBadge = ({ level, size = 'small' }) => {
  if (!level || level < 1) return null;

  // Size configurations
  const sizeConfig = {
    small: { badge: 20, font: '0.7rem' },
    medium: { badge: 24, font: '0.8rem' },
    large: { badge: 28, font: '0.9rem' }
  };

  const config = sizeConfig[size] || sizeConfig.small;

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: config.badge,
        height: config.badge,
        bgcolor: getLevelColor(level),
        color: 'white',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: config.font,
        fontWeight: 700,
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1,
        transition: 'all 0.2s ease'
      }}
    >
      {level}
    </Box>
  );
};

export default UserLevelBadge;
