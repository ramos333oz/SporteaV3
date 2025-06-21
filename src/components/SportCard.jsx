import React from 'react';
import { 
  Box, 
  Typography, 
  Chip,
  Avatar,
  Stack
} from '@mui/material';
import {
  SportsSoccer,
  SportsBasketball,
  SportsTennis,
  SportsRugby,
  SportsVolleyball,
  SportsHockey,
  TrendingUp,
  Group,
  Event
} from '@mui/icons-material';
import UnifiedCard from './UnifiedCard';

/**
 * Sport Card Component for Popular Sports Section
 * Uses the unified card system for consistent styling
 */

// Sport icon mapping with correct icons and vibrant colors
const sportIcons = {
  1: { icon: <SportsSoccer />, color: '#4CAF50', name: 'Football' },
  2: { icon: <SportsRugby />, color: '#FF9800', name: 'Rugby' },
  3: { icon: <SportsBasketball />, color: '#FF5722', name: 'Basketball' },
  4: { icon: <SportsSoccer />, color: '#2196F3', name: 'Futsal' },
  5: { icon: <SportsVolleyball />, color: '#9C27B0', name: 'Volleyball' },
  6: { icon: <SportsHockey sx={{ transform: 'rotate(90deg)' }} />, color: '#607D8B', name: 'Frisbee' },
  7: { icon: <SportsHockey />, color: '#795548', name: 'Hockey' },
  8: { icon: <SportsTennis />, color: '#E91E63', name: 'Badminton' },
};

// Sport background images
const sportBackgrounds = {
  1: '/images/sports/football-bg.jpg',
  2: '/images/sports/rugby-bg.jpg',
  3: '/images/sports/basketball-bg.jpg',
  4: '/images/sports/futsal-bg.jpg',
  5: '/images/sports/volleyball-bg.jpg',
  6: '/images/sports/frisbee-bg.jpg',
  7: '/images/sports/hockey-bg.jpg',
  8: '/images/sports/badminton-bg.jpg',
};

const SportCard = ({ 
  sport,
  stats = {},
  onClick,
  variant = 'default',
  compact = false
}) => {
  if (!sport) return null;
  
  const sportInfo = sportIcons[sport.id] || { 
    icon: <SportsSoccer />, 
    color: '#757575', 
    name: sport.name 
  };
  
  const {
    activeMatches = 0,
    totalPlayers = 0,
    upcomingMatches = 0,
    popularityScore = 0
  } = stats;
  
  const handleClick = () => {
    if (onClick) {
      onClick(sport);
    }
  };
  
  return (
    <UnifiedCard
      imagePosition="none"
      title={sport.name}
      subtitle={`${activeMatches} active matches`}
      onClick={handleClick}
      variant={variant}
      ariaLabel={`View ${sport.name} matches`}
      sx={{
        minHeight: compact ? 200 : 240,
        background: `linear-gradient(135deg, ${sportInfo.color}08 0%, ${sportInfo.color}15 100%)`,
        border: `1px solid ${sportInfo.color}30`,
        '&:hover': {
          background: `linear-gradient(135deg, ${sportInfo.color}15 0%, ${sportInfo.color}25 100%)`,
          borderColor: sportInfo.color,
        }
      }}
    >
      {/* Sport Icon and Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Avatar 
          sx={{ 
            bgcolor: sportInfo.color, 
            width: 40, 
            height: 40,
            '& svg': { fontSize: 24 }
          }}
        >
          {React.cloneElement(sportInfo.icon, { sx: { color: 'white' } })}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {sport.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {sport.description || 'Popular sport'}
          </Typography>
        </Box>
      </Box>
      
      {/* Statistics */}
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        {/* Active Matches */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Event fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Active Matches
            </Typography>
          </Box>
          <Chip 
            label={activeMatches}
            size="small"
            color={activeMatches > 0 ? 'success' : 'default'}
            sx={{ minWidth: 40 }}
          />
        </Box>
        
        {/* Total Players */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Group fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Players
            </Typography>
          </Box>
          <Chip 
            label={totalPlayers}
            size="small"
            variant="outlined"
            sx={{ minWidth: 40 }}
          />
        </Box>
        
        {/* Popularity Indicator */}
        {popularityScore > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Trending
              </Typography>
            </Box>
            <Chip 
              label={`${Math.round(popularityScore * 100)}%`}
              size="small"
              color="primary"
              sx={{ minWidth: 40 }}
            />
          </Box>
        )}
      </Stack>
      
      {/* Quick Action Indicator */}
      <Box 
        sx={{ 
          mt: 'auto',
          pt: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          textAlign: 'center'
        }}
      >
        <Typography 
          variant="caption" 
          color="primary.main"
          sx={{ fontWeight: 500 }}
        >
          {activeMatches > 0 ? 'View Active Matches' : 'Browse All Matches'}
        </Typography>
      </Box>
    </UnifiedCard>
  );
};

export default SportCard;
