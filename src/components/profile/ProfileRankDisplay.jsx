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
import { TIER_CONFIG, getUserTier, getNextTierInfo, getTierProgress } from '../../utils/tierSystem';

// Styled components following Elegant Luxury theme
const RankCard = styled(Card)(({ theme, tierColor, tierBgColor, isHovered }) => ({
  background: `linear-gradient(135deg, ${tierBgColor}15 0%, ${tierBgColor}25 100%)`,
  border: `2px solid ${tierColor}40`,
  borderRadius: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.3s ease-in-out',
  position: 'relative',
  overflow: 'visible',
  boxShadow: isHovered 
    ? `0 8px 25px ${tierColor}30, 0 0 0 1px ${tierColor}60`
    : `0 4px 12px rgba(0,0,0,0.08)`,
  transform: isHovered ? 'translateY(-2px)' : 'translateY(0px)',
  '&:hover': {
    background: `linear-gradient(135deg, ${tierBgColor}25 0%, ${tierBgColor}35 100%)`,
    border: `2px solid ${tierColor}60`,
  }
}));

const RankImage = styled(Avatar)(({ theme, isHovered }) => ({
  width: 80,
  height: 80,
  border: '3px solid rgba(255,255,255,0.8)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  transition: 'all 0.3s ease-in-out',
  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
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

const HoverOverlay = styled(Box)(({ theme, show }) => ({
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  background: 'rgba(255,255,255,0.98)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(0,0,0,0.1)',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2),
  marginTop: theme.spacing(1),
  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
  zIndex: 10,
  opacity: show ? 1 : 0,
  visibility: show ? 'visible' : 'hidden',
  transform: show ? 'translateY(0)' : 'translateY(-10px)',
  transition: 'all 0.3s ease-in-out',
}));

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
  const [isHovered, setIsHovered] = useState(false);
  const [rankImage, setRankImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Return null if no gamification data
  if (!gamificationData || !user) {
    return null;
  }

  const userLevel = gamificationData.current_level || 1;
  const tierKey = getUserTier(userLevel);
  const tier = TIER_CONFIG[tierKey];
  const nextTierInfo = getNextTierInfo(userLevel);
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
        isHovered={isHovered}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
                  isHovered={isHovered}
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

        {/* Hover Overlay with Next Tier Info */}
        {nextTierInfo && (
          <HoverOverlay show={isHovered && !isMobile}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Next: {nextTierInfo.tier.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {nextTierInfo.levelsNeeded} levels to go • {nextTierInfo.xpNeeded.toLocaleString()} XP needed
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={tierProgress * 100}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: `${nextTierInfo.tier.color}20`,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: nextTierInfo.tier.color,
                    borderRadius: 2,
                  }
                }}
              />
            </Box>
          </HoverOverlay>
        )}
      </RankCard>
    </Box>
  );
};

export default ProfileRankDisplay;
