import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Fade } from '@mui/material';
import { getLevelColor } from '../../services/achievementService';
import { getXPForLevel, getXPToNextLevel, getLevelProgress } from '../../utils/levelCalculation';

/**
 * Enhanced XPProgressBar Component with Real-time Updates
 * Displays user's XP progress towards next level with live updates
 */
const XPProgressBar = ({
  userId,
  currentXP = 0,
  currentLevel = 1,
  showDetails = true,
  size = 'medium',
  animated = true
}) => {
  const [xp, setXP] = useState(currentXP);
  const [level, setLevel] = useState(currentLevel);
  const [isAnimating, setIsAnimating] = useState(false);
  const [xpGained, setXPGained] = useState(0);

  // Listen for real-time XP updates
  useEffect(() => {
    const handleXPUpdate = (event) => {
      if (event.detail.userId === userId) {
        setIsAnimating(true);
        setXP(event.detail.newXP);
        setLevel(event.detail.newLevel);
        setXPGained(event.detail.xpGained);

        // Reset animation after delay
        setTimeout(() => {
          setIsAnimating(false);
          setXPGained(0);
        }, 2000);
      }
    };

    window.addEventListener('sportea:xp_update', handleXPUpdate);
    return () => window.removeEventListener('sportea:xp_update', handleXPUpdate);
  }, [userId]);

  // Update local state when props change
  useEffect(() => {
    setXP(currentXP);
    setLevel(currentLevel);
  }, [currentXP, currentLevel]);

  // Use simplified level calculation
  const xpToNext = getXPToNextLevel(xp);
  const progressPercentage = getLevelProgress(xp);

  const sizeConfig = {
    small: { height: 6, fontSize: '0.75rem' },
    medium: { height: 8, fontSize: '0.875rem' },
    large: { height: 10, fontSize: '1rem' }
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {showDetails && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ fontSize: config.fontSize, fontWeight: 600 }}>
            Level {level}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: config.fontSize }} color="text.secondary">
            {xpToNext} XP to next level
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
            bgcolor: getLevelColor(level),
            borderRadius: config.height / 2,
            transition: animated ? 'all 0.8s ease' : 'none',
            transform: isAnimating ? 'scaleX(1.02)' : 'scaleX(1)',
            boxShadow: isAnimating ? `0 0 10px ${getLevelColor(level)}` : 'none'
          }
        }}
      />

      {/* XP Gain Animation */}
      <Fade in={isAnimating && xpGained > 0} timeout={500}>
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            right: 0,
            top: -20,
            color: 'success.main',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            zIndex: 1
          }}
        >
          +{xpGained} XP
        </Typography>
      </Fade>
      
      {showDetails && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}
        >
          {xpToNext} XP to next level
        </Typography>
      )}
    </Box>
  );
};

export default XPProgressBar;
