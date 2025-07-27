import React from 'react';
import { Avatar, Box } from '@mui/material';
import UserLevelBadge from './UserLevelBadge';
import RankBadge from './RankBadge';

/**
 * UserAvatarWithRank Component
 * Enhanced Avatar component that displays both user level and rank badges
 * Provides professional display of user progression and achievements
 */
const UserAvatarWithRank = ({
  user,
  size = 80,
  showLevel = true,
  showRank = true,
  badgeSize = 'small',
  rankSize = 'small',
  onClick,
  sx = {},
  ...avatarProps
}) => {
  // Determine badge sizes based on avatar size
  const determineBadgeSize = () => {
    if (size <= 40) return 'small';
    if (size <= 64) return 'medium';
    return 'large';
  };

  const finalBadgeSize = badgeSize === 'auto' ? determineBadgeSize() : badgeSize;
  const finalRankSize = rankSize === 'auto' ? determineBadgeSize() : rankSize;

  const avatarSrc = user?.avatar_url || user?.avatarUrl;
  const userLevel = user?.current_level || user?.level || 1;

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <Avatar
        key={avatarSrc || 'no-avatar'}
        src={avatarSrc}
        alt={user?.full_name || user?.username || 'User Avatar'}
        onClick={onClick}
        sx={{
          width: size,
          height: size,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 0.2s',
          border: '2px solid var(--border)',
          '&:hover': onClick ? { 
            transform: 'scale(1.05)',
            borderColor: 'var(--primary)'
          } : {},
          ...sx
        }}
        {...avatarProps}
      >
        {user?.full_name?.charAt(0)?.toUpperCase() || 
         user?.fullName?.charAt(0)?.toUpperCase() || 
         user?.username?.charAt(0)?.toUpperCase() || 
         'U'}
      </Avatar>

      {/* Rank Badge - positioned at top-left */}
      {showRank && userLevel && (
        <RankBadge 
          level={userLevel}
          size={finalRankSize}
          position="top-left"
          showBackground={true}
        />
      )}

      {/* Level Badge - positioned at bottom-right */}
      {showLevel && userLevel && (
        <UserLevelBadge 
          level={userLevel}
          size={finalBadgeSize}
        />
      )}
    </Box>
  );
};

export default UserAvatarWithRank;
