import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  LinearProgress,
  Skeleton
} from '@mui/material';
import { UserAvatarWithLevel } from '../achievements';
import ShinyText from '../animations/ShinyText';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

/**
 * UserRankingCard Component
 * Displays the current user's ranking and position in the selected leaderboard
 * Following SporteaV3's design system with Material-UI best practices
 */
const UserRankingCard = ({ 
  userRanking = null, 
  loading = false, 
  type = 'xp',
  timeframe = 'all',
  groupType = 'global'
}) => {
  // Get rank color based on position
  const getRankColor = (rank) => {
    if (rank <= 3) return 'success';
    if (rank <= 10) return 'primary';
    if (rank <= 50) return 'info';
    return 'default';
  };

  // Get rank description
  const getRankDescription = (rank, totalParticipants) => {
    const percentage = ((totalParticipants - rank + 1) / totalParticipants) * 100;
    
    if (rank === 1) return 'Champion! 🏆';
    if (rank <= 3) return 'Top 3! 🥉';
    if (rank <= 10) return 'Top 10! ⭐';
    if (percentage >= 90) return 'Top 10%! 🔥';
    if (percentage >= 75) return 'Top 25%! 💪';
    if (percentage >= 50) return 'Top 50%! 👍';
    return 'Keep climbing! 📈';
  };

  // Format score display
  const formatScore = (score, type) => {
    if (type === 'community') {
      return score.toFixed(1);
    }
    return score.toLocaleString();
  };

  // Get score label
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

  // Get group type label
  const getGroupLabel = (groupType) => {
    switch (groupType) {
      case 'global':
        return 'Global';
      case 'friends':
        return 'Friends';
      case 'level_tier':
        return 'Level Tier';
      default:
        return 'Global';
    }
  };

  // Get animation speed based on rank (higher ranks get faster/more prominent animations)
  const getAnimationSpeed = (rank) => {
    if (rank <= 3) return 2; // Fastest for top 3
    if (rank <= 10) return 3; // Fast for top 10
    if (rank <= 50) return 4; // Medium for top 50
    return 5; // Standard for others
  };

  // Determine if rank chip should have shine animation
  const shouldAnimateRankChip = (rank) => {
    return rank <= 10; // Only top 10 get animated rank chips
  };

  if (loading) {
    return (
      <Card sx={{ 
        borderRadius: 3, 
        mb: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Skeleton variant="circular" width={64} height={64} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={28} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
              <Skeleton variant="text" width="40%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
            </Box>
            <Skeleton variant="rectangular" width={80} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
          </Box>
          <Skeleton variant="text" width="100%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
        </CardContent>
      </Card>
    );
  }

  if (!userRanking) {
    return (
      <Card sx={{ 
        borderRadius: 3, 
        mb: 3, 
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        color: 'white'
      }}>
        <CardContent sx={{ p: 3, textAlign: 'center' }}>
          <EmojiEventsIcon sx={{ fontSize: 48, mb: 2, opacity: 0.7 }} />
          <Typography variant="h6" gutterBottom>
            Not Ranked Yet
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Start participating to appear on the {getGroupLabel(groupType).toLowerCase()} leaderboard!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { rank, totalParticipants, user, score, level } = userRanking;
  const rankPercentile = ((totalParticipants - rank + 1) / totalParticipants) * 100;

  return (
    <Card sx={{ 
      borderRadius: 3, 
      mb: 3, 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      position: 'relative',
      overflow: 'visible'
    }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <UserAvatarWithLevel
            user={{
              ...user,
              level: level,
              avatarUrl: user?.avatar_url
            }}
            size={64}
            badgeSize="large"
            sx={{
              border: '3px solid rgba(255,255,255,0.3)'
            }}
          />
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Your Ranking
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {getGroupLabel(groupType)} • {timeframe === 'all' ? 'All Time' : timeframe === 'weekly' ? 'This Week' : 'This Month'}
            </Typography>
          </Box>

          <Chip
            label={
              shouldAnimateRankChip(rank) ? (
                <ShinyText
                  text={`#${rank}`}
                  variant="light"
                  speed={3}
                  delay={0.5}
                />
              ) : (
                `#${rank}`
              )
            }
            color={getRankColor(rank)}
            sx={{
              fontSize: '1.1rem',
              fontWeight: 700,
              px: 2,
              py: 1,
              height: 'auto',
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)'
            }}
          />
        </Box>

        {/* Stats Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              <ShinyText
                text={formatScore(score, type)}
                variant="light"
                speed={getAnimationSpeed(rank)}
                delay={0}
              />
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              {getScoreLabel(type)}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {rank} of {totalParticipants}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Participants
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Top {Math.round(rankPercentile)}%
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Percentile
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={rankPercentile}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'rgba(255,255,255,0.8)',
                borderRadius: 4
              }
            }}
          />
        </Box>

        {/* Rank Description */}
        <Typography variant="body1" sx={{
          textAlign: 'center',
          fontWeight: 600,
          opacity: 0.95
        }}>
          <ShinyText
            text={getRankDescription(rank, totalParticipants)}
            variant="light"
            speed={4}
            delay={1}
          />
        </Typography>
      </CardContent>
    </Card>
  );
};

export default UserRankingCard;
