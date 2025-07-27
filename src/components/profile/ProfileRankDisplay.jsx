import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
  Tooltip,
  Fade,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { TIER_CONFIG, getUserTier, getTierProgress } from '../../utils/tierSystem';

// Styled components following Elegant Luxury theme
const RankCard = styled(Card)(({ theme, tierColor, tierBgColor }) => ({
  background: `linear-gradient(135deg, ${tierBgColor}15 0%, ${tierBgColor}25 100%)`,
  border: `2px solid ${tierColor}40`,
  borderRadius: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.3s ease-in-out',
  position: 'relative',
  overflow: 'hidden', // Changed from 'visible' to 'hidden' since no overlay
  boxShadow: `0 4px 12px rgba(0,0,0,0.08)`,
  '&:hover': {
    background: `linear-gradient(135deg, ${tierBgColor}25 0%, ${tierBgColor}35 100%)`,
    border: `2px solid ${tierColor}60`,
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 25px ${tierColor}30`,
  }
}));

const RankImage = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  border: '3px solid rgba(255,255,255,0.8)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  transition: 'all 0.3s ease-in-out',
  [theme.breakpoints.down('sm')]: {
    width: 60,
    height: 60,
  }
}));

const TierName = styled(Typography)(({ theme }) => ({
  fontFamily: '"Libre Baskerville", Georgia, serif',
  fontWeight: 'bold',
  fontSize: '1.5rem',
  lineHeight: 1.2,
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.25rem',
  }
}));

const TierSubtitle = styled(Typography)(({ theme }) => ({
  fontFamily: '"Poppins", "Helvetica Neue", Arial, sans-serif',
  fontWeight: 500,
  fontSize: '0.875rem',
  opacity: 0.8,
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.75rem',
  }
}));

// HoverOverlay component removed - no longer needed

/**
 * ProfileRankDisplay Component
 * Interactive rank display for user profiles
 * Shows current tier, level, and progression information
 */
const ProfileRankDisplay = ({ 
  user, 
  gamificationData, 
  isOwnProfile = false,
  onClick = null 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rankImage, setRankImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Return null if no gamification data
  if (!gamificationData || !user) {
    return null;
  }

  const userLevel = gamificationData.current_level || 1;
  const tierKey = getUserTier(userLevel);
  const tier = TIER_CONFIG[tierKey];
  const tierProgress = getTierProgress(userLevel);

  // Load rank image
  useEffect(() => {
    if (tier?.iconImage) {
      const img = new Image();
      img.onload = () => {
        setRankImage(tier.iconImage);
        setImageLoading(false);
      };
      img.onerror = () => {
        setRankImage(null);
        setImageLoading(false);
      };
      img.src = tier.iconImage;
    } else {
      setImageLoading(false);
    }
  }, [tier?.iconImage]);

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  if (!tier) {
    return null;
  }

  return (
    <Box sx={{ mb: 3, position: 'relative' }}>
      <RankCard
        tierColor={tier.color}
        tierBgColor={tier.bgColor}
        onClick={handleCardClick}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 3,
            flexDirection: isMobile ? 'column' : 'row',
            textAlign: isMobile ? 'center' : 'left'
          }}>
            {/* Rank Image */}
            <Box sx={{ position: 'relative' }}>
              {imageLoading ? (
                <Skeleton variant="circular" width={isMobile ? 60 : 80} height={isMobile ? 60 : 80} />
              ) : (
                <RankImage
                  src={rankImage}
                  alt={tier.name}
                >
                  {!rankImage && tier.icon}
                </RankImage>
              )}
            </Box>

            {/* Tier Information */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TierName sx={{ color: tier.color }}>
                {tier.name}
              </TierName>
              <TierSubtitle color="text.secondary">
                Level {userLevel} • {tier.subtitle}
              </TierSubtitle>
              
              {/* Progress Bar (only for own profile) */}
              {isOwnProfile && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Tier Progress
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(tierProgress * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={tierProgress * 100}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: `${tier.color}20`,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: tier.color,
                        borderRadius: 3,
                      }
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Level Badge */}
            <Box sx={{
              minWidth: 60,
              height: 60,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${tier.color} 0%, ${tier.color}80 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.25rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              [theme.breakpoints.down('sm')]: {
                minWidth: 50,
                height: 50,
                fontSize: '1rem',
              }
            }}>
              {userLevel}
            </Box>
          </Box>
        </CardContent>

        {/* Hover overlay removed for cleaner UI */}
      </RankCard>
    </Box>
  );
};

export default ProfileRankDisplay;
