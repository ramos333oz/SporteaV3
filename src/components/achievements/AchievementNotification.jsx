import React from 'react';
import {
  Snackbar,
  Alert,
  Box,
  Typography,
  Avatar,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * AchievementNotification Component
 * Displays achievement unlock notifications with celebration styling
 */
const AchievementNotification = ({ 
  achievement, 
  open = false, 
  onClose,
  autoHideDuration = 6000 
}) => {
  if (!achievement) return null;

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
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ zIndex: 9999 }}
    >
      <Alert
        severity="success"
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          '& .MuiAlert-icon': { color: 'white' },
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(138,21,56,0.3)',
          minWidth: 300,
          animation: 'pulse 0.5s ease-in-out'
        }}
        action={
          <IconButton size="small" color="inherit" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: 'white', 
              color: 'primary.main',
              width: 48,
              height: 48,
              fontSize: '1.5rem'
            }}
          >
            {achievement.badge_icon || getCategoryIcon(achievement.category)}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              🎉 Achievement Unlocked!
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {achievement.name}
            </Typography>
            {achievement.xp_reward > 0 && (
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                +{achievement.xp_reward} XP earned
              </Typography>
            )}
          </Box>
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default AchievementNotification;
