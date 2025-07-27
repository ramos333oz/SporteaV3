import React from 'react';
import { Box } from '@mui/material';
import { getUserTier, TIER_CONFIG } from '../../utils/tierSystem';

/**
 * RankBadge Component
 * Displays a rank badge (bronze, silver, gold, platinum, diamond) based on user level
 * Positioned as an overlay on user avatars to showcase their rank
 */
const RankBadge = ({ 
  level, 
  size = 'small', 
  position = 'bottom-right',
  showBackground = true 
}) => {
  if (!level || level < 1) return null;

  // Get tier information based on level
  const tierKey = getUserTier(level);
  const tier = TIER_CONFIG[tierKey];
  
  if (!tier) return null;

  // Size configurations - Increased sizes for better visibility
  const sizeConfig = {
    small: {
      badge: 28,
      icon: 22,
      border: 2
    },
    medium: {
      badge: 32,
      icon: 26,
      border: 2.5
    },
    large: {
      badge: 36,
      icon: 30,
      border: 3
    }
  };

  const config = sizeConfig[size] || sizeConfig.small;

  // Position configurations
  const positionConfig = {
    'bottom-right': { bottom: -2, right: -2 },
    'bottom-left': { bottom: -2, left: -2 },
    'top-right': { top: -2, right: -2 },
    'top-left': { top: -2, left: -2 },
    'center': { 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)' 
    }
  };

  const positionStyles = positionConfig[position] || positionConfig['bottom-right'];

  return (
    <Box
      sx={{
        position: 'absolute',
        ...positionStyles,
        width: config.badge,
        height: config.badge,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        transition: 'all 0.2s ease',
        // Background styling
        ...(showBackground && {
          bgcolor: 'background.paper',
          border: `${config.border}px solid`,
          borderColor: tier.color,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }),
        // Hover effects
        '&:hover': {
          transform: positionStyles.transform 
            ? `${positionStyles.transform} scale(1.1)` 
            : 'scale(1.1)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        }
      }}
    >
      {/* Rank Icon */}
      <Box
        component="img"
        src={tier.iconImage}
        alt={`${tier.name} Rank`}
        sx={{
          width: config.icon,
          height: config.icon,
          objectFit: 'contain',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
        }}
        onError={(e) => {
          // Fallback to emoji if image fails to load
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
      
      {/* Fallback emoji (hidden by default) */}
      <Box
        sx={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${config.icon * 0.8}px`,
          color: tier.color
        }}
      >
        {tier.icon}
      </Box>
    </Box>
  );
};

export default RankBadge;
