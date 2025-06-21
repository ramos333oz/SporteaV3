import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Fade,
  Badge,
  Button,
  Divider,
  Avatar,
  Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import PlaceIcon from '@mui/icons-material/Place';
import {
  SportsSoccer,
  SportsBasketball,
  SportsTennis,
  SportsRugby,
  SportsVolleyball,
  SportsHockey
} from '@mui/icons-material';
import { useRealtime } from '../hooks/useRealtime';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import UnifiedCard from './UnifiedCard';

// Styled animated badge for recently updated matches
const AnimatedBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.primary.main,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

// Error boundary for individual match cards
class MatchCardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('MatchCard error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">Unable to load match card</Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Compact live match card with same size as popular sport cards
const MatchCard = ({ match, isRecentlyUpdated, onView }) => {
  // Safety check for match data
  if (!match || !match.id) {
    return null;
  }

  // Format date and time for display
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Time TBA';
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (error) {
      return 'Date TBA';
    }
  };

  // Sport icon mapping using database UUIDs (same as other components)
  const sportIcons = {
    // Football
    '4746e9c1-f772-4515-8d08-6c28563fbfc9': { icon: <SportsSoccer />, color: '#4CAF50', name: 'Football' },
    // Rugby
    '13e32815-8a3b-48f7-8cc9-5fdad873b851': { icon: <SportsRugby />, color: '#FF9800', name: 'Rugby' },
    // Basketball
    'dd400853-7ce6-47bc-aee6-2ee241530f79': { icon: <SportsBasketball />, color: '#FF5722', name: 'Basketball' },
    // Futsal
    'd662bc78-9e50-4785-ac71-d1e591e4a9ce': { icon: <SportsSoccer />, color: '#2196F3', name: 'Futsal' },
    // Volleyball
    '66e9893a-2be7-47f0-b7d3-d7191901dd77': { icon: <SportsVolleyball />, color: '#9C27B0', name: 'Volleyball' },
    // Frisbee
    'dcedf87a-13aa-4c2f-979f-6b71d457f531': { icon: <SportsHockey sx={{ transform: 'rotate(90deg)' }} />, color: '#607D8B', name: 'Frisbee' },
    // Hockey
    '3aba0f36-38bf-4ca2-b713-3dabd9f993f1': { icon: <SportsHockey />, color: '#795548', name: 'Hockey' },
    // Badminton
    'fb575fc1-2eac-4142-898a-2f7dae107844': { icon: <SportsTennis />, color: '#E91E63', name: 'Badminton' },
    // Tennis
    '9a304214-6c57-4c33-8c5f-3f1955b63caf': { icon: <SportsTennis />, color: '#4CAF50', name: 'Tennis' },
    // Table Tennis
    '845d3461-42fc-45c2-a403-8efcaf237c17': { icon: <SportsTennis />, color: '#FF5722', name: 'Table Tennis' },
    // Squash
    '0ec51cfc-f644-4057-99d8-d2c29c1b7dd0': { icon: <SportsTennis />, color: '#9C27B0', name: 'Squash' },
  };

  const sportInfo = sportIcons[match.sport_id] || {
    icon: <SportsSoccer />,
    color: '#757575',
    name: 'Sport'
  };
  const isFull = (match.current_participants || 0) >= (match.max_participants || 0);

  const handleCardClick = () => {
    try {
      if (onView && match.id) {
        onView(match.id);
      }
    } catch (error) {
      console.error('Error handling card click:', error);
    }
  };

  // Default venue images mapping using database UUIDs
  const defaultVenueImages = {
    '4746e9c1-f772-4515-8d08-6c28563fbfc9': '/images/venues/football-field.jpg', // Football
    '13e32815-8a3b-48f7-8cc9-5fdad873b851': '/images/venues/rugby-field.jpg', // Rugby
    'dd400853-7ce6-47bc-aee6-2ee241530f79': '/images/venues/basketball-court.jpg', // Basketball
    'd662bc78-9e50-4785-ac71-d1e591e4a9ce': '/images/venues/futsal-court.jpg', // Futsal
    '66e9893a-2be7-47f0-b7d3-d7191901dd77': '/images/venues/volleyball-court.jpg', // Volleyball
    'dcedf87a-13aa-4c2f-979f-6b71d457f531': '/images/venues/field.jpg', // Frisbee
    '3aba0f36-38bf-4ca2-b713-3dabd9f993f1': '/images/venues/hockey-field.jpg', // Hockey
    'fb575fc1-2eac-4142-898a-2f7dae107844': '/images/venues/badminton-court.jpg', // Badminton
    '9a304214-6c57-4c33-8c5f-3f1955b63caf': '/images/venues/tennis-court.jpg', // Tennis
    '845d3461-42fc-45c2-a403-8efcaf237c17': '/images/venues/table-tennis-court.jpg', // Table Tennis
    '0ec51cfc-f644-4057-99d8-d2c29c1b7dd0': '/images/venues/squash-court.jpg', // Squash
  };

  const venueImage = defaultVenueImages[match.sport_id] || '/images/venues/default-field.jpg';

  return (
    <Box sx={{ mb: 2 }}>
      <UnifiedCard
        image={venueImage}
        imageAlt={`${sportInfo.name} venue`}
        imageHeight={120}
        imagePosition="top"
        title={match.title || 'Match'}
        subtitle={`${formatDate(match.start_time)} • ${formatTime(match.start_time)}`}
        onClick={handleCardClick}
        variant={isRecentlyUpdated ? 'elevated' : 'default'}
        ariaLabel={`View ${match.title || 'match'} details`}
        sx={{
          minHeight: 240, // Same as SportCard (non-compact)
          backgroundColor: 'white',
          border: isRecentlyUpdated ? `2px solid ${sportInfo.color}` : '1px solid rgba(0, 0, 0, 0.12)',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: 'white',
            borderColor: sportInfo.color,
            transform: 'translateY(-2px)',
            boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
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
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              {sportInfo.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {match.location_name || 'Location TBA'}
            </Typography>
          </Box>
          {isRecentlyUpdated && (
            <AnimatedBadge
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              variant="dot"
            >
              <Box sx={{ width: 8, height: 8 }} />
            </AnimatedBadge>
          )}
        </Box>

        {/* Key Information */}
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {/* Participants */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Players
              </Typography>
            </Box>
            <Chip
              label={`${match.current_participants || 0}/${match.max_participants}`}
              size="small"
              color={isFull ? 'error' : 'success'}
              sx={{ minWidth: 50 }}
            />
          </Box>

          {/* Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
            </Box>
            <Chip
              label={match.status || 'Open'}
              size="small"
              color={
                match.status === 'open' ? 'success' :
                match.status === 'full' ? 'warning' :
                match.status === 'in_progress' ? 'info' :
                'default'
              }
              sx={{ minWidth: 50 }}
            />
          </Box>
        </Stack>
      </UnifiedCard>
    </Box>
  );
};

/**
 * LiveMatchBoard component
 * Displays a live-updating board of matches
 * Uses WebSocket connections to show real-time updates
 */
const LiveMatchBoard = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState({});
  const { connectionState, subscribeToAllMatches, unsubscribe } = useRealtime();
  const { showInfoToast, showSuccessToast } = useToast();
  const navigate = useNavigate();

  // Define fetchMatches function at component level so it's accessible everywhere
  const fetchMatches = async () => {
    try {
      console.log('Fetching live matches...');
      setLoading(true);
      
      // Get matches that are happening now or soon
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          title,
          start_time,
          end_time,
          max_participants,
          status,
          locations(id, name),
          sports(id, name)
        `)
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'completed')
        .order('start_time', { ascending: true })
        .limit(20);
        
      if (error) throw error;
      
      console.log('Fetched matches data:', data);
      
      // Log full data structure received from server to help debugging
      console.log('Raw matches data received:', JSON.stringify(data));
      
      // Transform data to include location and sport names
      const transformedMatches = data.map(match => ({
        ...match,
        location_name: match.locations?.name,
        sport_name: match.sports?.name,
        sport_id: match.sports?.id, // Ensure sport_id is properly set
        current_participants: 0 // Will be filled in later
      }));
      
      console.log('Formatted matches:', transformedMatches);
      
      // Check if we have matches before setting state
      if (transformedMatches.length === 0) {
        console.log('No matches found to display in LiveMatchBoard. This could be normal if there are no active matches.');
      } else {
        console.log(`Found ${transformedMatches.length} matches to display in LiveMatchBoard.`);
      }
      
      setMatches(transformedMatches);
      
      // Get participant counts for each match
      try {
        const participantPromises = transformedMatches.map(async (match) => {
          const { count, error } = await supabase
            .from('participants')
            .select('id', { count: 'exact' })
            .eq('match_id', match.id)
            .eq('status', 'confirmed');
            
          return {
            matchId: match.id,
            count: error ? 0 : (count || 0),
            error
          };
        });
        
        const participantResults = await Promise.all(participantPromises);
        
        // Update matches with participant counts
        setMatches(currentMatches => {
          return currentMatches.map(match => {
            const result = participantResults.find(r => r.matchId === match.id);
            return {
              ...match,
              current_participants: result && !result.error ? result.count : 0
            };
          });
        });
      } catch (countError) {
        console.error('Error fetching participant counts:', countError);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      setError('Failed to load matches. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Hook into real-time updates
  useEffect(() => {
    // Subscribe even if not connected yet - the useRealtime hook will handle reconnection
    console.log('Setting up real-time subscriptions for matches, connection state:', connectionState);
    
    // Force a refresh of the matches data every 30 seconds as a fallback
    const refreshInterval = setInterval(() => {
      console.log('Performing scheduled refresh of matches data');
      fetchMatches(); // This will now be in scope
    }, 30000); // 30 second refresh
    
    // Initial fetch
    fetchMatches();

    const handleUpdate = (update) => {
      if (update.type === 'match_update') {
        const { data: newMatch, eventType } = update;
        
        // Handle different event types
        if (eventType === 'INSERT') {
          setMatches(prevMatches => [newMatch, ...prevMatches]);
          markAsRecentlyUpdated(newMatch.id);
          showSuccessToast(
            'New Match Created', 
            `${newMatch.title} at ${newMatch.location_name || 'Unknown location'}`
          );
        } else if (eventType === 'UPDATE') {
          setMatches(prevMatches => 
            prevMatches.map(match => 
              match.id === newMatch.id ? { ...match, ...newMatch } : match
            )
          );
          markAsRecentlyUpdated(newMatch.id);
        } else if (eventType === 'DELETE') {
          setMatches(prevMatches => 
            prevMatches.filter(match => match.id !== newMatch.id)
          );
        }
      } else if (update.type === 'participant_update') {
        // Update participant counts for the related match
        const { data: participant, eventType } = update;
        const matchId = participant.match_id;
        
        // Fetch the updated match details
        fetchMatchParticipantCount(matchId);
      }
    };

    // Subscribe to all match updates with safety check
    let subscriptionId;
    try {
      if (typeof subscribeToAllMatches === 'function') {
        subscriptionId = subscribeToAllMatches(handleUpdate);
      }
    } catch (error) {
      console.error('Error subscribing to matches:', error);
    }

    // Cleanup function
    return () => {
      // Clear the refresh interval
      clearInterval(refreshInterval);
      
      // Manually unsubscribe just to be safe
      if (subscriptionId && typeof unsubscribe === 'function') {
        try {
          unsubscribe(subscriptionId);
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      }
      // The automatic cleanup by useRealtime hook serves as a backup
    };
  }, [connectionState.isConnected, subscribeToAllMatches]);

  // Helper function to fetch updated participant count
  const fetchMatchParticipantCount = async (matchId) => {
    if (!matchId) {
      console.error('Invalid match ID provided to fetchMatchParticipantCount');
      return;
    }
    try {
      // Get the current participant count
      const { data, error } = await supabase
        .from('participants')
        .select('id')
        .eq('match_id', matchId)
        .eq('status', 'confirmed');

      if (error) throw error;
      
      // Update the match with the new participant count
      setMatches(prevMatches => 
        prevMatches.map(match => 
          match.id === matchId 
            ? { ...match, current_participants: data.length } 
            : match
        )
      );
      
      markAsRecentlyUpdated(matchId);
    } catch (error) {
      console.error('Error fetching participant count:', error);
    }
  };

  // Mark a match as recently updated
  const markAsRecentlyUpdated = (matchId) => {
    setRecentlyUpdated(prev => ({ ...prev, [matchId]: true }));
    
    // Remove the "recently updated" status after 5 seconds
    setTimeout(() => {
      setRecentlyUpdated(prev => {
        const updated = { ...prev };
        delete updated[matchId];
        return updated;
      });
    }, 5000);
  };

  // Handle view match
  const handleViewMatch = (matchId) => {
    navigate(`/match/${matchId}`);
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Live Matches
        </Typography>
        {connectionState && connectionState.isConnected ? (
          <Chip 
            label="Live Updates Active" 
            color="success" 
            size="small" 
            sx={{ fontSize: '0.75rem' }}
          />
        ) : (
          <Chip 
            label="Live Updates Unavailable" 
            color="error" 
            size="small" 
            sx={{ fontSize: '0.75rem' }}
          />
        )}
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : matches.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
          No active matches found. Check again later or create your own match!
        </Typography>
      ) : (
        <Box>
          {matches.map((match, index) => (
            <MatchCardErrorBoundary key={match.id}>
              <MatchCard
                match={match}
                isRecentlyUpdated={!!recentlyUpdated[match.id]}
                onView={handleViewMatch}
              />
            </MatchCardErrorBoundary>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default LiveMatchBoard;
