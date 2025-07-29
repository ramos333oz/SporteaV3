import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Avatar,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { TIER_CONFIG, getUserTier, getNextTierInfo, getTierProgress, getTierOrder } from '../../utils/tierSystem';
import ClickSpark from '../animations/ClickSpark';

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: theme.spacing(2),
    maxWidth: 700,
    width: '90vw',
    maxHeight: '80vh',
  }
}));

const TierCard = styled(Card)(({ theme, tierColor, tierBgColor, isCurrentTier }) => ({
  background: isCurrentTier
    ? `linear-gradient(135deg, ${tierBgColor}40 0%, ${tierBgColor}60 100%)`
    : `linear-gradient(135deg, ${tierBgColor}15 0%, ${tierBgColor}25 100%)`,
  border: `2px solid ${isCurrentTier ? tierColor : `${tierColor}40`}`,
  borderRadius: theme.spacing(1.5),
  transition: 'all 0.3s ease-in-out',
  position: 'relative',
  height: 180, // Increased height for larger rank images
  minHeight: 180,
  maxHeight: 180,
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 6px 20px ${tierColor}30`,
  }
}));

const CurrentTierBadge = styled(Box)(({ theme, tierColor }) => ({
  position: 'absolute',
  top: -8,
  right: -8,
  background: tierColor,
  color: 'white',
  borderRadius: '50%',
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
}));

/**
 * TierDetailsModal Component
 * Detailed modal showing tier system information and user progress
 */
const TierDetailsModal = ({ 
  open, 
  onClose, 
  user, 
  gamificationData,
  isOwnProfile = false 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!gamificationData || !user) {
    return null;
  }

  const userLevel = gamificationData.current_level || 1;
  const currentTierKey = getUserTier(userLevel);
  const currentTier = TIER_CONFIG[currentTierKey];
  const nextTierInfo = getNextTierInfo(userLevel);
  const tierProgress = getTierProgress(userLevel);
  const tierOrder = getTierOrder();

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <EmojiEventsIcon sx={{ color: currentTier?.color }} />
          <Typography variant="h5" sx={{ 
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontWeight: 'bold'
          }}>
            Tier System
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Current Tier Overview */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ 
            fontFamily: '"Libre Baskerville", Georgia, serif',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <TrendingUpIcon sx={{ color: currentTier?.color }} />
            {isOwnProfile ? 'Your Current Tier' : `${user.fullName || user.username}'s Tier`}
          </Typography>
          
          <Card sx={{ 
            background: `linear-gradient(135deg, ${currentTier?.bgColor}30 0%, ${currentTier?.bgColor}50 100%)`,
            border: `2px solid ${currentTier?.color}`,
            mb: 3
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                <Avatar
                  src={currentTier?.iconImage}
                  sx={{ 
                    width: 60, 
                    height: 60,
                    border: '3px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  {currentTier?.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ 
                    color: currentTier?.color,
                    fontFamily: '"Libre Baskerville", Georgia, serif',
                    fontWeight: 'bold'
                  }}>
                    {currentTier?.name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Level {userLevel} • {currentTier?.subtitle}
                  </Typography>
                </Box>
                <Box sx={{
                  minWidth: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${currentTier?.color} 0%, ${currentTier?.color}80 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {userLevel}
                </Box>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {currentTier?.description}
              </Typography>

              {/* Progress within current tier */}
              {isOwnProfile && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Progress in {currentTier?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(tierProgress * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={tierProgress * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: `${currentTier?.color}20`,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: currentTier?.color,
                        borderRadius: 4,
                      }
                    }}
                  />
                  {nextTierInfo && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {nextTierInfo.levelsNeeded} levels to {nextTierInfo.tier.name} • {nextTierInfo.xpNeeded.toLocaleString()} XP needed
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* All Tiers Overview */}
        <Typography variant="h6" gutterBottom sx={{ 
          fontFamily: '"Libre Baskerville", Georgia, serif',
          mb: 2
        }}>
          All Tiers
        </Typography>
        
        <Grid container spacing={2}>
          {tierOrder.map((tierKey) => {
            const tier = TIER_CONFIG[tierKey];
            const isCurrentTier = tierKey === currentTierKey;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={tierKey}>
                <ClickSpark
                  sparkColor={tier.color}
                  sparkSize={8}
                  sparkRadius={15}
                  sparkCount={5}
                  duration={400}
                  easing="ease-out"
                >
                  <TierCard
                    tierColor={tier.color}
                    tierBgColor={tier.bgColor}
                    isCurrentTier={isCurrentTier}
                  >
                  {isCurrentTier && (
                    <CurrentTierBadge tierColor={tier.color}>
                      ✓
                    </CurrentTierBadge>
                  )}
                  <CardContent sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    '&:last-child': { pb: 2 }
                  }}>
                    {/* Large Rank Image */}
                    <Avatar
                      src={tier.iconImage}
                      sx={{
                        width: 80,
                        height: 80,
                        mb: 2,
                        border: '3px solid rgba(255,255,255,0.8)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        flexShrink: 0,
                        ...(tier.iconImage?.includes('diamond.png') && {
                          '& .MuiAvatar-img': {
                            objectFit: 'contain',
                            width: '98%',
                            height: '98%',
                            padding: '1%',
                          }
                        })
                      }}
                    >
                      {tier.icon}
                    </Avatar>

                    {/* Tier Name - Centered */}
                    <Typography variant="subtitle1" sx={{
                      color: tier.color,
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      lineHeight: 1.2,
                      mb: 0.5,
                      fontFamily: '"Libre Baskerville", Georgia, serif'
                    }}>
                      {tier.name}
                    </Typography>

                    {/* Level Range - Centered */}
                    <Typography variant="caption" color="text.secondary" sx={{
                      fontSize: '0.8rem',
                      lineHeight: 1.2,
                      fontFamily: '"Poppins", "Helvetica Neue", Arial, sans-serif'
                    }}>
                      Levels {tier.levels}
                    </Typography>
                  </CardContent>
                  </TierCard>
                </ClickSpark>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </StyledDialog>
  );
};

export default TierDetailsModal;
