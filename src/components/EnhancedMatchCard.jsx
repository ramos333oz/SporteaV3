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

/**
 * Enhanced Match Card Component
 * Uses the unified card system with improved information hierarchy
 * and prominent display of key match details
 */

// Sport icon mapping with correct icons and consistent styling
const sportIcons = {
  1: <SportsSoccer sx={{ color: '#4CAF50' }} />, // Football - Green
  2: <SportsRugby sx={{ color: '#FF9800' }} />, // Rugby - Orange
  3: <SportsBasketball sx={{ color: '#FF5722' }} />, // Basketball - Red
  4: <SportsSoccer sx={{ color: '#2196F3' }} />, // Futsal - Blue
  5: <SportsVolleyball sx={{ color: '#9C27B0' }} />, // Volleyball - Purple
  6: <SportsHockey sx={{ color: '#607D8B', transform: 'rotate(90deg)' }} />, // Frisbee - Blue Grey
  7: <SportsHockey sx={{ color: '#795548' }} />, // Hockey - Brown
  8: <SportsTennis sx={{ color: '#E91E63' }} />, // Badminton - Pink
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
          
          {match.host?.avatar_url && (
            <Avatar 
              src={match.host.avatar_url} 
              sx={{ width: 24, height: 24 }}
            >
              {match.host?.full_name?.charAt(0) || 'H'}
            </Avatar>
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
