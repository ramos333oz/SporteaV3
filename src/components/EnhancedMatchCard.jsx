import React from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  Button, 
  Avatar,
  Divider,
  Grid,
  Stack
} from '@mui/material';
import {
  SportsSoccer,
  SportsBasketball,
  SportsTennis,
  SportsRugby,
  SportsVolleyball,
  SportsHockey,
  AccessTime,
  CalendarMonth,
  LocationOn,
  Person,
  Group,
  Star
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import UnifiedCard from './UnifiedCard';
import { UserAvatarWithLevel } from './achievements';

/**
 * Enhanced Match Card Component
 * Uses the unified card system with improved information hierarchy
 * and prominent display of key match details
 */

// Sport icon mapping using database UUIDs with consistent styling
const sportIcons = {
  '4746e9c1-f772-4515-8d08-6c28563fbfc9': <SportsSoccer sx={{ color: '#4CAF50' }} />, // Football - Green
  '13e32815-8a3b-48f7-8cc9-5fdad873b851': <SportsRugby sx={{ color: '#FF9800' }} />, // Rugby - Orange
  'dd400853-7ce6-47bc-aee6-2ee241530f79': <SportsBasketball sx={{ color: '#FF5722' }} />, // Basketball - Red
  'd662bc78-9e50-4785-ac71-d1e591e4a9ce': <SportsSoccer sx={{ color: '#2196F3' }} />, // Futsal - Blue
  '66e9893a-2be7-47f0-b7d3-d7191901dd77': <SportsVolleyball sx={{ color: '#9C27B0' }} />, // Volleyball - Purple
  'dcedf87a-13aa-4c2f-979f-6b71d457f531': <SportsHockey sx={{ color: '#607D8B', transform: 'rotate(90deg)' }} />, // Frisbee - Blue Grey
  '3aba0f36-38bf-4ca2-b713-3dabd9f993f1': <SportsHockey sx={{ color: '#795548' }} />, // Hockey - Brown
  'fb575fc1-2eac-4142-898a-2f7dae107844': <SportsTennis sx={{ color: '#E91E63' }} />, // Badminton - Pink
  '9a304214-6c57-4c33-8c5f-3f1955b63caf': <SportsTennis sx={{ color: '#4CAF50' }} />, // Tennis - Green
  '845d3461-42fc-45c2-a403-8efcaf237c17': <SportsTennis sx={{ color: '#FF5722' }} />, // Table Tennis - Red
  '0ec51cfc-f644-4057-99d8-d2c29c1b7dd0': <SportsTennis sx={{ color: '#9C27B0' }} />, // Squash - Purple
};

// Default venue images for different sports (placeholder system)
const defaultVenueImages = {
  1: '/images/venues/football-field.jpg',
  2: '/images/venues/rugby-field.jpg', 
  3: '/images/venues/basketball-court.jpg',
  4: '/images/venues/futsal-court.jpg',
  5: '/images/venues/volleyball-court.jpg',
  6: '/images/venues/field.jpg',
  7: '/images/venues/hockey-field.jpg',
  8: '/images/venues/badminton-court.jpg',
};

const EnhancedMatchCard = ({ 
  match, 
  onJoin, 
  joinedMatches = [],
  variant = 'default',
  showActions = true,
  compact = false 
}) => {
  const navigate = useNavigate();
  
  if (!match) return null;
  
  // Check if user has already joined this match
  const hasJoined = joinedMatches.includes(match.id);
  
  // Format date and time
  const formattedDate = format(new Date(match.start_time), 'MMM dd, yyyy');
  const formattedTime = format(new Date(match.start_time), 'h:mm a');
  const dayOfWeek = format(new Date(match.start_time), 'EEEE');
  
  // Calculate spots remaining
  const spotsRemaining = match.max_participants - (match.participants?.count || 0);
  const isFull = spotsRemaining <= 0;
  
  // Get sport info
  const sportId = match.sport_id || match.sport?.id;
  const sportName = match.sport?.name || 'Sport';
  const sportIcon = sportIcons[sportId] || <SportsSoccer />;
  
  // Get venue image (placeholder for now)
  const venueImage = match.location?.image || defaultVenueImages[sportId];
  
  // Determine match status
  const getMatchStatus = () => {
    const now = new Date();
    const startTime = new Date(match.start_time);
    const endTime = new Date(match.end_time);
    
    if (now >= startTime && now <= endTime) return 'live';
    if (isFull) return 'full';
    if (startTime > now) return 'upcoming';
    return 'completed';
  };
  
  const status = getMatchStatus();
  
  // Status text mapping
  const statusText = {
    live: 'LIVE',
    upcoming: 'OPEN',
    full: 'FULL',
    completed: 'ENDED'
  };
  
  const handleCardClick = () => {
    navigate(`/match/${match.id}`);
  };
  
  const handleJoinClick = (e) => {
    e.stopPropagation();
    if (onJoin && !hasJoined && !isFull) {
      onJoin(match.id);
    }
  };
  
  return (
    <UnifiedCard
      image={venueImage}
      imageAlt={`${sportName} at ${match.location?.name}`}
      imageHeight={compact ? 120 : 160}
      title={match.title || `${sportName} Match`}
      subtitle={`${dayOfWeek} • ${formattedDate}`}
      status={status}
      statusText={statusText[status]}
      onClick={handleCardClick}
      variant={variant}
      ariaLabel={`${sportName} match on ${formattedDate} at ${match.location?.name}`}
    >
      {/* Sport and Key Info Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {sportIcon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {sportName}
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <Chip 
            label={`Level: ${match.skill_level || 'All'}`}
            size="small"
            variant="outlined"
            color="primary"
          />
        </Box>
      </Box>
      
      {/* Time and Location Info */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AccessTime fontSize="small" color="action" />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formattedTime}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" noWrap>
              {match.location?.name || 'TBA'}
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Group fontSize="small" color="action" />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {match.participants?.count || 0}/{match.max_participants} players
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" noWrap>
              {match.host?.full_name || 'Host'}
            </Typography>
          </Box>
        </Grid>
      </Grid>
      
      {/* Participants Status */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip 
            label={
              isFull 
                ? 'Match Full' 
                : `${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} left`
            }
            size="small"
            color={isFull ? 'error' : spotsRemaining <= 2 ? 'warning' : 'success'}
            icon={<Group />}
          />
          
          {match.host && (
            <UserAvatarWithLevel
              user={match.host}
              size={24}
              badgeSize="small"
            />
          )}
        </Stack>
      </Box>
      
      {/* Actions */}
      {showActions && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/match/${match.id}`);
              }}
              sx={{
                flex: 1,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                borderWidth: 1.5,
                '&:hover': {
                  borderWidth: 1.5,
                  transform: 'translateY(-1px)',
                }
              }}
            >
              View Details
            </Button>

            <Button
              variant="contained"
              size="small"
              color={hasJoined ? "secondary" : "primary"}
              disabled={hasJoined || isFull}
              onClick={handleJoinClick}
              sx={{
                flex: 1,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0px 2px 8px rgba(138, 21, 56, 0.3)',
                '&:hover': {
                  boxShadow: '0px 4px 12px rgba(138, 21, 56, 0.4)',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  boxShadow: 'none',
                }
              }}
            >
              {hasJoined ? 'Joined' : (isFull ? 'Full' : 'Join Match')}
            </Button>
          </Box>
        </>
      )}
    </UnifiedCard>
  );
};

export default EnhancedMatchCard;
