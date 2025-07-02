import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { calculateNextLevelXP, getLevelColor } from '../../services/achievementService';

/**
 * XPProgressBar Component
 * Displays user's XP progress towards next level
 */
const XPProgressBar = ({ 
  currentXP = 0, 
  currentLevel = 1, 
  showDetails = true,
  size = 'medium' 
}) => {
  const nextLevelXP = calculateNextLevelXP(currentLevel);
  const currentLevelXP = currentLevel > 1 ? calculateNextLevelXP(currentLevel - 1) : 0;
  const xpForCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
  const progressPercentage = (xpForCurrentLevel / xpNeededForNextLevel) * 100;

  const sizeConfig = {
    small: { height: 6, fontSize: '0.75rem' },
    medium: { height: 8, fontSize: '0.875rem' },
    large: { height: 10, fontSize: '1rem' }
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  return (
    <Box sx={{ width: '100%' }}>
      {showDetails && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontSize: config.fontSize, fontWeight: 600 }}>
            Level {currentLevel}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: config.fontSize }} color="text.secondary">
            {xpForCurrentLevel}/{xpNeededForNextLevel} XP
          </Typography>
        </Box>
      )}
      
      <LinearProgress
        variant="determinate"
        value={Math.min(progressPercentage, 100)}
        sx={{
          height: config.height,
          borderRadius: config.height / 2,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            bgcolor: getLevelColor(currentLevel),
            borderRadius: config.height / 2,
            transition: 'all 0.3s ease'
          }
        }}
      />
      
      {showDetails && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}
        >
          {nextLevelXP - currentXP} XP to next level
        </Typography>
      )}
    </Box>
  );
};

export default XPProgressBar;
