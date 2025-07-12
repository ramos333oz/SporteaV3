import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  LinearProgress,
  Chip
} from '@mui/material';

/**
 * AchievementCard Component
 * Displays individual achievement with progress, tier, and rarity information
 * Following SporteaV3's design system with enhanced visual feedback
 */
const AchievementCard = ({ 
  achievement, 
  userProgress = 0, 
  isUnlocked = false,
  showProgress = true 
}) => {
  const progressPercentage = achievement.requirement_value > 0 
    ? Math.min((userProgress / achievement.requirement_value) * 100, 100)
    : 0;

  // Tier colors
  const getTierColor = (tier) => {
    const colors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
      diamond: '#B9F2FF'
    };
    return colors[tier] || colors.bronze;
  };

  // Category icons
  const getCategoryIcon = (category) => {
    const icons = {
      participation: '🏃',
      social: '👥',
      streak: '🔥',
      skill: '📈',
      special: '⭐'
    };
    return icons[category] || '🏆';
  };

  return (
    <Card 
      sx={{ 
        borderRadius: 3, 
        boxShadow: isUnlocked 
          ? '0 8px 16px rgba(138,21,56,0.15)' 
          : '0 4px 12px rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        opacity: isUnlocked ? 1 : 0.7,
        transform: isUnlocked ? 'scale(1.02)' : 'scale(1)',
        border: isUnlocked ? '2px solid #8A1538' : '1px solid #E0E0E0',
        position: 'relative',
        overflow: 'visible'
      }}
    >


      {/* Achievement Icon */}
      <Box sx={{
        bgcolor: isUnlocked ? 'primary.main' : 'grey.300',
        p: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
      }}>
        <Avatar sx={{
          width: 60,
          height: 60,
          bgcolor: 'background.paper',
          color: isUnlocked ? 'primary.main' : 'grey.500',
          fontSize: '2rem'
        }}>
          {achievement.badge_icon || getCategoryIcon(achievement.category)}
        </Avatar>
      </Box>

      {/* Achievement Details */}
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {achievement.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {achievement.description}
        </Typography>

        {/* Progress Bar */}
        {showProgress && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {userProgress}/{achievement.requirement_value}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  bgcolor: isUnlocked ? 'success.main' : 'primary.main',
                  borderRadius: 4
                }
              }}
            />
          </Box>
        )}

        {/* Bottom Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {achievement.rarity_percentage > 0 && (
            <Chip
              label={`${achievement.rarity_percentage}% of users`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
          {isUnlocked && achievement.xp_reward > 0 && (
            <Chip
              label={`+${achievement.xp_reward} XP`}
              size="small"
              color="primary"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AchievementCard;
