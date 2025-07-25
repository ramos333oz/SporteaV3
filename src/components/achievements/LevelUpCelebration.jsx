import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Fade,
  Zoom
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { getLevelColor } from '../../services/achievementService';

/**
 * Level Up Celebration Component
 * Shows a celebration modal when user levels up
 * Optimized with React.memo, useCallback, and useMemo for better performance
 */
const LevelUpCelebration = memo(({ open, onClose, newLevel, oldLevel }) => {
  const [showContent, setShowContent] = useState(false);

  // Memoize the level color calculation to prevent unnecessary recalculations
  const levelColor = useMemo(() => getLevelColor(newLevel), [newLevel]);

  useEffect(() => {
    if (open) {
      // Delay content animation for better effect
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [open]);

  // Use useCallback to prevent function recreation on every render
  const handleClose = useCallback(() => {
    setShowContent(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Memoize icon styles to prevent object recreation
  const iconStyles = useMemo(() => ({
    fontSize: 100,
    color: '#FFD700',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
    animation: 'bounce 2s infinite'
  }), []);

  // Memoize sparkle styles to prevent object recreation
  const sparkleStyles = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      width: '6px',
      height: '6px',
      backgroundColor: '#FFD700',
      borderRadius: '50%',
      animation: 'sparkle 1.5s infinite'
    },
    '&::before': {
      top: '10%',
      left: '20%',
      animationDelay: '0s'
    },
    '&::after': {
      top: '20%',
      right: '15%',
      animationDelay: '0.5s'
    }
  }), []);

  // Memoize the paper props to prevent object recreation on every render
  const paperProps = useMemo(() => ({
    sx: {
      borderRadius: 3,
      background: `linear-gradient(135deg, ${levelColor} 0%, #764ba2 100%)`,
      color: 'white',
      textAlign: 'center',
      p: 2,
      overflow: 'visible'
    }
  }), [levelColor]);

  // Memoize the backdrop props to prevent object recreation
  const backdropProps = useMemo(() => ({
    sx: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)'
    }
  }), []);

  // Memoize button styles to prevent object recreation
  const buttonStyles = useMemo(() => ({
    bgcolor: 'rgba(255,255,255,0.2)',
    color: 'white',
    px: 4,
    py: 1.5,
    borderRadius: 2,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.3)',
    '&:hover': {
      bgcolor: 'rgba(255,255,255,0.3)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
    },
    transition: 'all 0.3s ease'
  }), []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={paperProps}
      BackdropProps={backdropProps}
    >
      <DialogContent sx={{ py: 4 }}>
        <Fade in={showContent} timeout={800}>
          <Box>
            {/* Celebration Icon */}
            <Zoom in={showContent} timeout={1000}>
              <Box sx={{ mb: 3, position: 'relative' }}>
                <EmojiEventsIcon
                  sx={iconStyles}
                />

                {/* Sparkle effects */}
                <Box sx={sparkleStyles} />
              </Box>
            </Zoom>
            
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 'bold', 
                mb: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              Level Up!
            </Typography>
            
            <Typography 
              variant="h4" 
              sx={{ 
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                Level {oldLevel}
              </Box>
              
              <Typography variant="h4" sx={{ mx: 1 }}>
                →
              </Typography>
              
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255,255,255,0.5)'
                }}
              >
                Level {newLevel}
              </Box>
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ 
                opacity: 0.9,
                maxWidth: '80%',
                mx: 'auto',
                lineHeight: 1.6
              }}
            >
              Congratulations! You've reached a new level and unlocked new achievements!
            </Typography>
          </Box>
        </Fade>
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button
          variant="contained"
          onClick={handleClose}
          size="large"
          sx={buttonStyles}
        >
          Continue
        </Button>
      </DialogActions>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </Dialog>
  );
});

// Add display name for better debugging
LevelUpCelebration.displayName = 'LevelUpCelebration';

export default LevelUpCelebration;
