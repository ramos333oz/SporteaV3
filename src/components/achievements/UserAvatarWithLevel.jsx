import React from 'react';
import { Avatar, Box } from '@mui/material';
import UserLevelBadge from './UserLevelBadge';

/**
 * UserAvatarWithLevel Component
 * Enhanced Avatar component that displays user level badge
 * Replaces all existing Avatar components throughout the app
 */
const UserAvatarWithLevel = ({
  user,
  size = 40,
  showLevel = true,
  badgeSize = 'small',
  onClick,
  sx = {},
  ...avatarProps
}) => {
  // Determine badge size based on avatar size
  const determineBadgeSize = () => {
    if (size <= 32) return 'small';
    if (size <= 48) return 'medium';
    return 'large';
  };

  const finalBadgeSize = badgeSize === 'auto' ? determineBadgeSize() : badgeSize;

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <Avatar
        src={user?.avatar_url || user?.avatarUrl}
        onClick={onClick}
        sx={{
          width: size,
          height: size,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 0.2s',
          '&:hover': onClick ? { transform: 'scale(1.05)' } : {},
          ...sx
        }}
        {...avatarProps}
      >
        {user?.full_name?.charAt(0)?.toUpperCase() || 
         user?.fullName?.charAt(0)?.toUpperCase() || 
         user?.username?.charAt(0)?.toUpperCase() || 
         'U'}
      </Avatar>

      {showLevel && (user?.level || user?.current_level) && (
        <UserLevelBadge 
          level={user?.level || user?.current_level} 
          size={finalBadgeSize} 
        />
      )}
    </Box>
  );
};

export default UserAvatarWithLevel;
