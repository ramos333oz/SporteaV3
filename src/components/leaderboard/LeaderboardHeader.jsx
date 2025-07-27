import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SplitText from '../animations/SplitText';

/**
 * Professional Leaderboard Header Component
 * Features compact design, animated title, and integrated user stats
 */
const LeaderboardHeader = ({
  totalPlayers = 0,
  userRank = null,
  userScore = null,
  leaderboardType = 'xp'
}) => {
  const theme = useTheme();

  const handleAnimationComplete = () => {
    console.log('Leaderboard title animation completed!');
  };

  const getScoreLabel = (type) => {
    switch (type) {
      case 'xp':
        return 'XP';
      case 'level':
        return 'Level';
      case 'community':
        return 'Community Score';
      default:
        return 'Score';
    }
  };

  const formatScore = (score) => {
    if (typeof score !== 'number') return '0';
    return score.toLocaleString();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, md: 4 },
        mb: 3,
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.primary.main, 0.02)} 0%, 
          ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, 
            ${theme.palette.primary.main}, 
            ${theme.palette.primary.light})`,
        }
      }}
    >
      {/* Main Header Content */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2
      }}>
        {/* Left Section: Title and Description */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <EmojiEventsIcon 
              sx={{ 
                color: 'primary.main', 
                fontSize: '2rem', 
                mr: 2,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
              }} 
            />
            <SplitText
              text="Leaderboards"
              className="leaderboard-title"
              delay={60}
              duration={0.7}
              ease="power2.out"
              splitType="chars"
              from={{ opacity: 0, y: 20, scale: 0.8 }}
              to={{ opacity: 1, y: 0, scale: 1 }}
              threshold={0.3}
              rootMargin="-30px"
              textAlign="left"
              onLetterAnimationComplete={handleAnimationComplete}
            />
          </Box>
          
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ 
              fontFamily: 'var(--font-sans)',
              fontSize: '1rem',
              lineHeight: 1.5,
              maxWidth: 500
            }}
          >
            Track your progress and compete with fellow athletes across different categories.
          </Typography>
        </Box>

        {/* Right Section: Stats and User Info */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'row', sm: 'column' },
          alignItems: { xs: 'center', sm: 'flex-end' },
          gap: 2,
          minWidth: 200
        }}>
          {/* Total Players */}
          <Chip
            label={`${totalPlayers} Players`}
            variant="outlined"
            size="small"
            sx={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.04)
              }
            }}
          />

          {/* User Rank (if available) */}
          {userRank && (
            <Box sx={{ 
              textAlign: { xs: 'center', sm: 'right' },
              p: 2,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontFamily: 'var(--font-sans)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: '0.75rem'
                }}
              >
                Your Rank
              </Typography>
              <Typography 
                variant="h4" 
                color="primary.main"
                sx={{ 
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 700,
                  lineHeight: 1
                }}
              >
                #{userRank}
              </Typography>
              {userScore && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontFamily: 'var(--font-sans)' }}
                >
                  {formatScore(userScore)} {getScoreLabel(leaderboardType)}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default LeaderboardHeader;
