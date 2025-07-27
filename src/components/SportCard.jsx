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

// Sport icon mapping with correct icons and CSS variable colors using database UUIDs
const sportIcons = {
  // Football
  '4746e9c1-f772-4515-8d08-6c28563fbfc9': { icon: <SportsSoccer />, color: 'var(--sport-football)', name: 'Football' },
  // Rugby
  '13e32815-8a3b-48f7-8cc9-5fdad873b851': { icon: <SportsRugby />, color: 'var(--sport-rugby)', name: 'Rugby' },
  // Basketball
  'dd400853-7ce6-47bc-aee6-2ee241530f79': { icon: <SportsBasketball />, color: 'var(--sport-basketball)', name: 'Basketball' },
  // Futsal
  'd662bc78-9e50-4785-ac71-d1e591e4a9ce': { icon: <SportsSoccer />, color: 'var(--sport-futsal)', name: 'Futsal' },
  // Volleyball
  '66e9893a-2be7-47f0-b7d3-d7191901dd77': { icon: <SportsVolleyball />, color: 'var(--sport-volleyball)', name: 'Volleyball' },
  // Frisbee
  'dcedf87a-13aa-4c2f-979f-6b71d457f531': { icon: <SportsHockey sx={{ transform: 'rotate(90deg)' }} />, color: 'var(--sport-frisbee)', name: 'Frisbee' },
  // Hockey
  '3aba0f36-38bf-4ca2-b713-3dabd9f993f1': { icon: <SportsHockey />, color: 'var(--sport-hockey)', name: 'Hockey' },
  // Badminton
  'fb575fc1-2eac-4142-898a-2f7dae107844': { icon: <SportsTennis />, color: 'var(--sport-badminton)', name: 'Badminton' },
  // Tennis
  '9a304214-6c57-4c33-8c5f-3f1955b63caf': { icon: <SportsTennis />, color: 'var(--sport-tennis)', name: 'Tennis' },
  // Table Tennis
  '845d3461-42fc-45c2-a403-8efcaf237c17': { icon: <SportsTennis />, color: 'var(--sport-basketball)', name: 'Table Tennis' },
  // Squash
  '0ec51cfc-f644-4057-99d8-d2c29c1b7dd0': { icon: <SportsTennis />, color: 'var(--sport-squash)', name: 'Squash' },
};

// Sport background images using database UUIDs
const sportBackgrounds = {
  '4746e9c1-f772-4515-8d08-6c28563fbfc9': '/images/sports/football-bg.jpg', // Football
  '13e32815-8a3b-48f7-8cc9-5fdad873b851': '/images/sports/rugby-bg.jpg', // Rugby
  'dd400853-7ce6-47bc-aee6-2ee241530f79': '/images/sports/basketball-bg.jpg', // Basketball
  'd662bc78-9e50-4785-ac71-d1e591e4a9ce': '/images/sports/futsal-bg.jpg', // Futsal
  '66e9893a-2be7-47f0-b7d3-d7191901dd77': '/images/sports/volleyball-bg.jpg', // Volleyball
  'dcedf87a-13aa-4c2f-979f-6b71d457f531': '/images/sports/frisbee-bg.jpg', // Frisbee
  '3aba0f36-38bf-4ca2-b713-3dabd9f993f1': '/images/sports/hockey-bg.jpg', // Hockey
  'fb575fc1-2eac-4142-898a-2f7dae107844': '/images/sports/badminton-bg.jpg', // Badminton
  '9a304214-6c57-4c33-8c5f-3f1955b63caf': '/images/sports/tennis-bg.jpg', // Tennis
  '845d3461-42fc-45c2-a403-8efcaf237c17': '/images/sports/table-tennis-bg.jpg', // Table Tennis
  '0ec51cfc-f644-4057-99d8-d2c29c1b7dd0': '/images/sports/squash-bg.jpg', // Squash
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
    totalMatches = 0,
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
      subtitle={`${activeMatches} active • ${totalMatches} total matches`}
      onClick={handleClick}
      variant={variant}
      ariaLabel={`View ${sport.name} matches`}
      sx={{
        minHeight: compact ? 220 : 280,
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

        {/* Total Matches */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Event fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Total Matches
            </Typography>
          </Box>
          <Chip
            label={totalMatches}
            size="small"
            variant="outlined"
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
