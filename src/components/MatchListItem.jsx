import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  SportsSoccer as SportsSoccerIcon,
  SportsBasketball as SportsBasketballIcon,
  SportsTennis as SportsTennisIcon,
  SportsVolleyball as SportsVolleyballIcon,
  SportsHockey as SportsHockeyIcon,
  Sports as SportsIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ClickSpark from './animations/ClickSpark';

// Get sport icon by name
const getSportIcon = (sportName) => {
  if (!sportName) return <SportsIcon />;
  
  const name = sportName.toLowerCase();
  if (name.includes('football') || name.includes('futsal')) {
    return <SportsSoccerIcon />;
  } else if (name.includes('basketball')) {
    return <SportsBasketballIcon />;
  } else if (name.includes('tennis')) {
    return <SportsTennisIcon />;
  } else if (name.includes('volleyball')) {
    return <SportsVolleyballIcon />;
  } else if (name.includes('hockey')) {
    return <SportsHockeyIcon />;
  }
  return <SportsIcon />;
};

// Format date and time
const formatDateTime = (dateTimeStr) => {
  try {
    const date = new Date(dateTimeStr);
    return {
      date: date.toLocaleDateString('en-MY', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-MY', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch (error) {
    return { date: 'Invalid date', time: 'Invalid time' };
  }
};

const MatchListItem = ({
  match,
  user,
  userParticipations = {},
  joinLoading = {},
  onJoinMatch,
  onLeaveMatch,
  onClick,
}) => {
  const navigate = useNavigate();
  
  if (!match) return null;

  // Format date and time
  const { date, time } = formatDateTime(match.start_time);

  // Calculate spots available
  const maxParticipants = match.max_participants || 10;
  const currentParticipants = match.current_participants ?? 0;
  const spotsAvailable = maxParticipants - currentParticipants;
  const fillPercentage = (currentParticipants / maxParticipants) * 100;

  // Determine match status
  const isFull = spotsAvailable <= 0;
  const isAboutToFill = spotsAvailable <= 2 && !isFull;
  const userParticipation = userParticipations[match.id];
  const isJoined = userParticipation?.status === 'confirmed' || userParticipation?.status === 'pending';
  const joinStatus = userParticipation?.status || null;
  const isLoading = joinLoading[match.id] || false;
  
  // Check if the current user is the host of this match
  const isUserHost = user && (match.host_id === user.id || (match.host && match.host.id === user.id));

  // Get sport data
  const sport = match.sport || {};
  const sportName = sport.name || match.sport_name || 'Sport';
  const sportIcon = getSportIcon(sportName);

  // Get location
  const location = match.location?.name || match.location_name || match.location || 'Unknown location';

  // Get host
  const host = match.host || {};
  const hostName = host.full_name || host.name || host.username || 'Host';

  const handleJoinClick = (e) => {
    e.stopPropagation();
    if (onJoinMatch) {
      onJoinMatch(match);
    }
  };

  const handleLeaveClick = (e) => {
    e.stopPropagation();
    if (onLeaveMatch) {
      onLeaveMatch(match);
    }
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    navigate(`/match/${match.id}`);
  };

  const handleItemClick = () => {
    if (onClick) {
      onClick(match);
    } else {
      navigate(`/match/${match.id}`);
    }
  };

  return (
    <Box
      onClick={handleItemClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: 2,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: 'action.hover',
          borderColor: 'primary.main',
          transform: 'translateY(-2px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      }}
    >
      {/* Sport Icon and Basic Info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {sportIcon}
          <Chip
            icon={match.is_private ? <LockIcon fontSize="small" /> : <PublicIcon fontSize="small" />}
            label={match.is_private ? 'Private' : 'Public'}
            size="small"
            color={match.is_private ? 'secondary' : 'success'}
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
        
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1rem',
              lineHeight: 1.2,
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {match.title || 'Untitled Match'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {sportName}
          </Typography>
        </Box>
      </Box>

      {/* Date/Time and Location */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 140 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccessTimeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {date} · {time}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <LocationOnIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: '0.75rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 120,
            }}
          >
            {location}
          </Typography>
        </Box>
      </Box>

      {/* Participants */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 100 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PeopleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {currentParticipants}/{maxParticipants}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={fillPercentage}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(0,0,0,0.08)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: isFull
                ? 'error.main'
                : isAboutToFill
                  ? 'warning.main'
                  : 'success.main',
              borderRadius: 3,
            },
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          {spotsAvailable} {spotsAvailable === 1 ? 'spot' : 'spots'} left
        </Typography>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        {user && (
          isUserHost ? (
            <Chip
              label="Hosting"
              size="small"
              color="secondary"
              variant="filled"
              sx={{ fontSize: '0.75rem', fontWeight: 600 }}
            />
          ) : isJoined ? (
            <Button
              variant="outlined"
              color={joinStatus === 'pending' ? 'warning' : 'error'}
              size="small"
              disabled={joinStatus === 'pending' || isLoading}
              onClick={handleLeaveClick}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'none',
                minWidth: 80,
              }}
            >
              {isLoading
                ? 'Processing...'
                : joinStatus === 'pending'
                  ? 'Requested'
                  : 'Leave'}
            </Button>
          ) : (
            <ClickSpark
              sparkColor="#9b2c2c"
              sparkSize={8}
              sparkRadius={15}
              sparkCount={6}
              duration={400}
              easing="ease-out"
            >
              <Button
                variant="contained"
                size="small"
                color={isFull ? 'inherit' : 'primary'}
                disabled={isFull || isLoading}
                onClick={handleJoinClick}
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  minWidth: 80,
                }}
              >
                {isLoading ? 'Processing...' : isFull ? 'Full' : 'Join'}
              </Button>
            </ClickSpark>
          )
        )}
        
        <Tooltip title="View Details">
          <IconButton
            size="small"
            onClick={handleViewDetails}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default MatchListItem;
