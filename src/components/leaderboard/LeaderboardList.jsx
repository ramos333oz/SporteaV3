import React from 'react';
import {
  List,
  ListItem,
  Box,
  Typography,
  Avatar,
  Chip,
  Paper,
  Skeleton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { UserAvatarWithLevel } from '../achievements';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

/**
 * LeaderboardList Component
 * Displays a ranked list of users with their scores and positions
 * Following SporteaV3's design system with Material-UI best practices
 */
const LeaderboardList = ({
  data = [],
  loading = false,
  type = 'xp',
  showUserHighlight = false,
  currentUserId = null,
  tierConfig = null,
  getUserTier = null
}) => {
  const navigate = useNavigate();

  // Limit to top 10 players
  const limitedData = data.slice(0, 10);

  // Handle profile click navigation
  const handleProfileClick = (userId) => {
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  };
  // Get rank icon based on position
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <EmojiEventsIcon sx={{ color: '#FFD700', fontSize: '1.5rem' }} />;
      case 2:
        return <WorkspacePremiumIcon sx={{ color: '#C0C0C0', fontSize: '1.5rem' }} />;
      case 3:
        return <MilitaryTechIcon sx={{ color: '#CD7F32', fontSize: '1.5rem' }} />;
      default:
        return (
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: 'grey.300',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'grey.700'
            }}
          >
            {rank}
          </Box>
        );
    }
  };

  // Get tier styling for user based on level
  const getTierStyling = (userLevel) => {
    if (!tierConfig || !getUserTier) return {};

    const tierKey = getUserTier(userLevel);
    const tier = tierConfig[tierKey];

    if (!tier) return {};

    return {
      borderLeft: `4px solid ${tier.color}`,
      backgroundColor: `${tier.bgColor}40`,
      '&:hover': {
        backgroundColor: `${tier.bgColor}60`,
      }
    };
  };

  // Get score label based on type
  const getScoreLabel = (type) => {
    switch (type) {
      case 'xp':
        return 'XP';
      case 'level':
        return 'Level';
      case 'community':
        return 'Community Score';
      case 'streak':
        return 'Day Streak';
      default:
        return 'Score';
    }
  };

  // Format score display
  const formatScore = (score, type) => {
    if (type === 'community') {
      return score.toFixed(1);
    }
    return score.toLocaleString();
  };

  if (loading) {
    return (
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <List sx={{ p: 0 }}>
          {[...Array(10)].map((_, index) => (
            <ListItem
              key={index}
              sx={{
                py: 2,
                px: 3,
                borderBottom: index < 9 ? '1px solid' : 'none',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton variant="circular" width={48} height={48} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="40%" height={20} />
                </Box>
                <Skeleton variant="rectangular" width={60} height={32} sx={{ borderRadius: 2 }} />
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
        <EmojiEventsIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
        <Typography variant="h6" gutterBottom color="text.secondary">
          No Rankings Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Be the first to appear on this leaderboard!
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <List sx={{ p: 0 }}>
        {limitedData.map((entry, index) => {
          const isCurrentUser = showUserHighlight && entry.userId === currentUserId;
          const tierStyling = getTierStyling(entry.level);

          return (
            <ListItem
              key={entry.userId}
              onClick={() => handleProfileClick(entry.userId)}
              sx={{
                py: 2,
                px: 3,
                borderBottom: index < limitedData.length - 1 ? '1px solid' : 'none',
                bgcolor: isCurrentUser ? 'primary.50' : 'transparent',
                border: isCurrentUser ? '2px solid' : 'none',
                borderColor: isCurrentUser ? 'primary.main' : 'divider',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: isCurrentUser ? 'primary.100' : 'grey.50',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                },
                ...tierStyling
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                {/* Rank Icon */}
                <Box sx={{ minWidth: 32, display: 'flex', justifyContent: 'center' }}>
                  {getRankIcon(entry.rank)}
                </Box>

                {/* User Avatar with Level */}
                <UserAvatarWithLevel
                  user={{
                    ...entry.user,
                    level: entry.level,
                    avatarUrl: entry.user?.avatar_url
                  }}
                  size={48}
                  badgeSize="medium"
                />

                {/* User Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {entry.user?.full_name || entry.user?.username || 'Unknown User'}
                    {isCurrentUser && (
                      <Chip
                        label="You"
                        size="small"
                        color="primary"
                        sx={{ ml: 1, fontSize: '0.75rem' }}
                      />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Level {entry.level}
                    {entry.faculty && ` • ${entry.faculty}`}
                  </Typography>
                </Box>

                {/* Score Display */}
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {formatScore(entry.score, type)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getScoreLabel(type)}
                  </Typography>
                </Box>
              </Box>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
};

export default LeaderboardList;
