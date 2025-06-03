import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Chip,
  Button,
  Card,
  CardContent,
  CardActions,
  Skeleton,
  Tabs,
  Tab,
  Divider,
  Avatar,
  AvatarGroup,
  Alert,
  Badge,
  Tooltip,
  LinearProgress,
  Stack
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import SportsIcon from '@mui/icons-material/Sports';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import PeopleIcon from '@mui/icons-material/People';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import { useAuth } from '../../hooks/useAuth';
import { participantService } from '../../services/supabase';

/**
 * FindGames component for displaying available sport matches
 * Uses real data from Supabase passed via props
 */
const FindGames = ({ matches: propMatches, sports: propSports }) => {
  // State management
  const { user, supabase } = useAuth();
  const [matches, setMatches] = useState(propMatches || []);
  const [loading, setLoading] = useState(!propMatches);
  const [joinLoading, setJoinLoading] = useState({});
  const [viewMode, setViewMode] = useState(0); // 0: List, 1: Map, 2: Calendar
  const [selectedSportFilter, setSelectedSportFilter] = useState('all');
  const [recommendedMatches, setRecommendedMatches] = useState([]);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  
  // Generate sport filters from real data
  const sportFilters = [
    { id: 'all', name: 'All Sports', icon: <SportsIcon /> },
    ...(propSports || []).map(sport => {
      // Map sport names to appropriate icons
      let icon = <SportsIcon />;
      const sportName = sport.name ? sport.name.toLowerCase() : '';
      
      if (sportName.includes('football') || sportName.includes('futsal')) {
        icon = <SportsSoccerIcon />;
      } else if (sportName.includes('basketball')) {
        icon = <SportsBasketballIcon />;
      } else if (sportName.includes('badminton') || sportName.includes('tennis')) {
        icon = <SportsTennisIcon />;
      } else if (sportName.includes('volleyball')) {
        icon = <SportsVolleyballIcon />;
      } else if (sportName.includes('gym') || sportName.includes('fitness')) {
        icon = <FitnessCenterIcon />;
      }
      
      return { 
        id: sport.id?.toString() || '', 
        name: sport.name || 'Unknown Sport',
        icon: icon
      };
    })
  ];
  
  // Update matches when props or filter changes
  useEffect(() => {
    if (propMatches) {
      setLoading(false);
      
      // Filter matches based on selected sport
      if (selectedSportFilter === 'all') {
        // Add animation flags to matches that have been updated
        const updatedMatches = propMatches.map(match => ({
          ...match,
          // Mark as updated if it's new or recently modified
          isUpdated: match.created_at && 
            new Date(match.created_at) > new Date(Date.now() - 10 * 60 * 1000) // Created in last 10 minutes
        }));
        setMatches(updatedMatches);
      } else {
        const filteredMatches = propMatches
          .filter(match => 
            match.sport_id?.toString() === selectedSportFilter ||
            match.sport?.id?.toString() === selectedSportFilter
          )
          .map(match => ({
            ...match,
            // Mark as updated if it's new or recently modified
            isUpdated: match.created_at && 
              new Date(match.created_at) > new Date(Date.now() - 10 * 60 * 1000) // Created in last 10 minutes
          }));
        setMatches(filteredMatches);
      }
      
      // For recommended matches, we would ideally use a recommendation algorithm
      // Here we're just showing the newest matches for demo purposes
      const sortedByDate = [...propMatches].sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      setRecommendedMatches(sortedByDate.slice(0, 2));
    } else {
      setLoading(true);
    }
  }, [propMatches, selectedSportFilter]);
  
  // View mode tab change handler
  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
  };
  
  // Sport filter click handler
  const handleSportFilterChange = (sportId) => {
    setSelectedSportFilter(sportId);
  };
  
  // Function to format date and time
  const formatDateTime = (dateTimeStr) => {
    try {
      const date = new Date(dateTimeStr);
      return {
        date: date.toLocaleDateString('en-MY', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
      };
    } catch (error) {
      return { date: 'Invalid date', time: 'Invalid time' };
    }
  };
  
  // Get sport icon by name
  const getSportIcon = (sportName) => {
    if (!sportName) return <SportsIcon />;
    
    sportName = sportName.toLowerCase();
    if (sportName.includes('football') || sportName.includes('futsal')) {
      return <SportsSoccerIcon />;
    } else if (sportName.includes('basketball')) {
      return <SportsBasketballIcon />;
    } else if (sportName.includes('badminton') || sportName.includes('tennis')) {
      return <SportsTennisIcon />;
    } else if (sportName.includes('volleyball')) {
      return <SportsVolleyballIcon />;
    } else if (sportName.includes('gym') || sportName.includes('fitness')) {
      return <FitnessCenterIcon />;
    }
    return <SportsIcon />;
  };
  
  // Handle join match
  const handleJoinMatch = async (match) => {
    if (!user) {
      setNotification({
        severity: 'warning',
        message: 'You must be logged in to join matches'
      });
      return;
    }
    
    try {
      setJoinLoading(prev => ({ ...prev, [match.id]: true }));
      
      // If match is private, we need to handle the access code
      let accessCode = null;
      if (match.is_private) {
        // In a real implementation, you might want to use a dialog to ask for the code
        accessCode = prompt('This is a private match. Please enter the access code:');
        if (!accessCode) {
          setJoinLoading(prev => ({ ...prev, [match.id]: false }));
          return; // User cancelled
        }
      }
      
      const result = await participantService.joinMatch(match.id, user.id, accessCode);
      
      // Update the match in state to reflect the new joined status
      const updatedMatches = matches.map(m => {
        if (m.id === match.id) {
          return { 
            ...m, 
            is_joined: true, 
            join_status: result.alreadyJoined ? result.status : 'pending',
            current_participants: result.alreadyJoined ? m.current_participants : m.current_participants + 1
          };
        }
        return m;
      });
      
      setMatches(updatedMatches);
      setNotification({
        severity: 'success',
        message: result.message || 'Successfully requested to join match'
      });
    } catch (error) {
      console.error('Error joining match:', error);
      setNotification({
        severity: 'error',
        message: error.message || 'Failed to join match'
      });
    } finally {
      setJoinLoading(prev => ({ ...prev, [match.id]: false }));
    }
  };
  
  // Handle leave match
  const handleLeaveMatch = async (match) => {
    if (!user) return;
    
    try {
      setJoinLoading(prev => ({ ...prev, [match.id]: true }));
      
      const result = await participantService.leaveMatch(match.id, user.id);
      
      // Update the match in state
      const updatedMatches = matches.map(m => {
        if (m.id === match.id) {
          return { 
            ...m, 
            is_joined: false,
            join_status: null,
            current_participants: Math.max(0, m.current_participants - 1) // Ensure we don't go below 0
          };
        }
        return m;
      });
      
      setMatches(updatedMatches);
      setNotification({
        severity: 'info',
        message: result.message || 'Successfully left the match'
      });
    } catch (error) {
      console.error('Error leaving match:', error);
      setNotification({
        severity: 'error',
        message: error.message || 'Failed to leave match'
      });
    } finally {
      setJoinLoading(prev => ({ ...prev, [match.id]: false }));
    }
  };

  // Render match card
  const renderMatchCard = (match) => {
    // Format date and time
    const { date, time } = formatDateTime(match.start_time);
    
    // Calculate spots available
    const maxParticipants = match.max_participants || 10;
    const currentParticipants = match.current_participants || 0;
    const spotsAvailable = maxParticipants - currentParticipants;
    
    // Check if match is new (created in the last hour)
    const isNew = match.created_at && 
      new Date(match.created_at) > new Date(Date.now() - 60 * 60 * 1000);
    
    // Calculate fill percentage for visual progress bar
    const fillPercentage = (currentParticipants / maxParticipants) * 100;
    
    // Determine match status
    const isFull = spotsAvailable <= 0;
    const isAboutToFill = spotsAvailable <= 2 && !isFull;
    const isJoined = match.is_joined;
    const joinStatus = match.join_status || null;
    const isLoading = joinLoading[match.id] || false;
    const skillLevel = match.skill_level || match.skillLevel || 'Intermediate';
    
    // Get sport data
    const sport = match.sport || {};
    const sportName = sport.name || match.sport_name || 'Sport';
    const sportIcon = getSportIcon(sportName);
    
    // Get location
    const location = match.location?.name || match.location_name || match.location || 'Unknown location';
    
    // Get host
    const host = match.host || {};
    const hostName = host.full_name || host.name || host.username || 'Host';
    const hostInitial = hostName.charAt(0);
    
    return (
      <Card sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 3,
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: 6
        },
        ...(match.isUpdated && {
          animation: 'pulse 2s',
          '@keyframes pulse': {
            '0%': { boxShadow: '0 0 0 0 rgba(144, 202, 249, 0.7)' },
            '70%': { boxShadow: '0 0 0 10px rgba(144, 202, 249, 0)' },
            '100%': { boxShadow: '0 0 0 0 rgba(144, 202, 249, 0)' }
          }
        })
      }}>
        {/* New indicator badge */}
        {isNew && (
          <Box 
            sx={{
              position: 'absolute',
              top: -10,
              right: -10,
              zIndex: 1
            }}
          >
            <Tooltip title="New match!">
              <Badge
                badgeContent={
                  <FiberNewIcon fontSize="small" sx={{ color: 'white' }} />
                }
                color="primary"
                overlap="circular"
                sx={{ 
                  '& .MuiBadge-badge': {
                    width: 30,
                    height: 30,
                    borderRadius: '50%'
                  }
                }}
              />
            </Tooltip>
          </Box>
        )}

        <CardContent sx={{ flexGrow: 1 }}>
          {/* Sport type chip */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip 
              icon={getSportIcon(match.sport?.name || '')}
              label={match.sport?.name || 'Sport'}
              size="small"
              color="primary"
              variant="filled"
            />
            
            {/* Private/Public indicator */}
            <Tooltip title={match.is_private ? 'Private match' : 'Open to all'}>
              <Chip 
                icon={match.is_private ? <LockIcon fontSize="small" /> : <PublicIcon fontSize="small" />}
                label={match.is_private ? 'Private' : 'Public'}
                size="small"
                color={match.is_private ? 'secondary' : 'success'}
                variant="outlined"
              />
            </Tooltip>
          </Box>
          
          {/* Match title */}
          <Typography variant="h6" component="h2" gutterBottom>
            {match.title || 'Untitled Match'}
          </Typography>
          
          {/* Match details */}
          <Box sx={{ mb: 2 }}>
            {/* Date and time */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {date} · {time} · {match.duration_minutes || 60} mins
              </Typography>
            </Box>
            
            {/* Location */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOnIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {match.location?.name || 'Location not specified'}
              </Typography>
            </Box>
            
            {/* Host */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Hosted by {match.host?.username || match.host?.full_name || 'Unknown host'}
              </Typography>
            </Box>
          </Box>
          
          {/* Participants */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2">
                  {currentParticipants}/{maxParticipants} players
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {spotsAvailable} {spotsAvailable === 1 ? 'spot' : 'spots'} left
              </Typography>
            </Box>

            <Box sx={{ width: '100%', mb: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={fillPercentage} 
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: isFull ? 'error.main' : 
                                   isAboutToFill ? 'warning.main' : 'success.main',
                  }
                }}
              />
            </Box>

            <AvatarGroup max={5} sx={{ justifyContent: 'flex-start' }}>
              {/* This would be populated with actual participant data */}
              {Array(Math.min(currentParticipants, 5)).fill().map((_, i) => (
                <Avatar key={i} sx={{ width: 32, height: 32 }}>
                  {String.fromCharCode(65 + i)}
                </Avatar>
              ))}
            </AvatarGroup>
          </Box>
          
          {/* Description (truncated) */}
          {match.description && (
            <Typography variant="body2" color="text.secondary" sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 1
            }}>
              {match.description}
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ flexDirection: 'column', gap: 1, p: 2 }}>
          {/* Join/Leave match button */}
          {user && (
            isJoined ? (
              <Button 
                variant="outlined" 
                color="error"
                size="small" 
                fullWidth
                disabled={isLoading}
                onClick={() => handleLeaveMatch(match)}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
                sx={{ mb: 1 }}
              >
                {isLoading ? 'Processing...' : joinStatus === 'pending' ? 'Cancel Request' : 'Leave Match'}
              </Button>
            ) : (
              <Button 
                variant="contained" 
                size="small"
                color={isFull ? 'inherit' : 'primary'}
                fullWidth
                disabled={isFull || isLoading}
                onClick={() => handleJoinMatch(match)}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
              >
                {isLoading ? 'Processing...' : isFull ? 'Match Full' : 'Join Match'}
              </Button>
            )
          )}
          
          <Button 
            variant="outlined" 
            size="small" 
            fullWidth
            startIcon={<AccessTimeIcon />}
          >
            View Details
          </Button>
        </CardActions>
      </Card>
    );
  };
  
  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {notification && (
        <Alert 
          severity={notification.severity} 
          sx={{ mb: 2 }}
          onClose={() => setNotification(null)}
        >
          {notification.message}
        </Alert>
      )}
      
      {/* View Mode Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs 
          value={viewMode} 
          onChange={handleViewModeChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="List View" />
          <Tab label="Map View" />
          <Tab label="Calendar" />
        </Tabs>
      </Paper>
      
      {/* Sport Filters */}
      <Box 
        sx={{ 
          display: 'flex', 
          overflowX: 'auto', 
          pb: 1, 
          mb: 3,
          '&::-webkit-scrollbar': {
            height: 6
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'divider',
            borderRadius: 3
          }
        }}
      >
        {sportFilters.map((sport) => (
          <Chip
            key={sport.id}
            icon={sport.icon}
            label={sport.name}
            color={selectedSportFilter === sport.id ? 'primary' : 'default'}
            variant={selectedSportFilter === sport.id ? 'filled' : 'outlined'}
            onClick={() => handleSportFilterChange(sport.id)}
            sx={{ 
              mr: 1, 
              p: 0.5,
              '&:last-child': { mr: 0 }
            }}
          />
        ))}
      </Box>
      
      {/* Recommended Matches Section */}
      {recommendedMatches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h2" component="h2">
              Recommended for You
            </Typography>
            <Tooltip title="These matches are selected based on your preferences and past activity">
              <Chip 
                label="For You" 
                size="small" 
                color="secondary" 
                sx={{ ml: 2 }} 
              />
            </Tooltip>
          </Box>
          
          <Grid container spacing={2}>
            {loading ? (
              Array(2).fill().map((_, index) => (
                <Grid item xs={12} sm={6} lg={4} key={`skeleton-rec-${index}`}>
                  <Skeleton 
                    variant="rectangular" 
                    height={320} 
                    sx={{ borderRadius: 3 }} 
                  />
                </Grid>
              ))
            ) : (
              recommendedMatches.map(match => (
                <Grid item xs={12} sm={6} lg={4} key={match.id}>
                  {renderMatchCard(match)}
                </Grid>
              ))
            )}
          </Grid>
        </Box>
      )}
      
      {/* All Matches Section */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h2" component="h2">
            Available Matches
          </Typography>
          <Chip 
            label={`${matches.length} found`} 
            size="small" 
            color="default" 
            variant="outlined"
            sx={{ ml: 2 }} 
          />
        </Box>
        {loading ? (
          <Grid container spacing={2}>
            {Array(6).fill().map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
                <Skeleton 
                  variant="rectangular" 
                  height={320} 
                  sx={{ borderRadius: 3 }} 
                />
              </Grid>
            ))}
          </Grid>
        ) : matches.length === 0 ? (
          <Paper 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: 3
            }}
          >
            <SportsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h3" gutterBottom>
              No matches found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Try adjusting your filters or create your own match!
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
            >
              Host a Match
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {matches.map(match => (
              <Grid item xs={12} sm={6} md={4} key={match.id}>
                {renderMatchCard(match)}
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default FindGames;
