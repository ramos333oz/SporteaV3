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
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import PlaceIcon from '@mui/icons-material/Place';
import { useRealtime } from '../hooks/useRealtime';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

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

const MatchCard = ({ match, isRecentlyUpdated, onView }) => {
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Fade in={true} timeout={500}>
      <Card 
        elevation={isRecentlyUpdated ? 4 : 1} 
        sx={{ 
          mb: 2, 
          transition: 'all 0.3s ease',
          border: isRecentlyUpdated ? '1px solid' : 'none',
          borderColor: 'primary.main',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: 4
          }
        }}
      >
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {isRecentlyUpdated && (
                  <AnimatedBadge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                    variant="dot"
                    sx={{ mr: 1 }}
                  >
                    <Box sx={{ width: 8, height: 8 }} />
                  </AnimatedBadge>
                )}
                <Typography variant="h6" component="div">
                  {match.title}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <PlaceIcon fontSize="small" sx={{ mr: 0.5 }} />
                {match.location_name || 'Location pending'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
                {formatDate(match.start_time)} - {formatDate(match.end_time)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                {match.current_participants || 0}/{match.max_participants} participants
              </Typography>
            </Grid>
            <Grid item xs={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Chip 
                label={match.sport_name || 'Sport'} 
                color="primary" 
                size="small" 
                sx={{ mb: 1 }} 
              />
              <Chip 
                label={match.status || 'Open'} 
                color={
                  match.status === 'open' ? 'success' : 
                  match.status === 'full' ? 'warning' : 
                  match.status === 'in_progress' ? 'info' : 
                  match.status === 'completed' ? 'default' : 
                  match.status === 'cancelled' ? 'error' : 
                  'default'
                }
                size="small" 
                sx={{ mb: 1 }} 
              />
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => onView(match.id)}
                sx={{ mt: 1 }}
              >
                View Match
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Fade>
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
          {matches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              isRecentlyUpdated={!!recentlyUpdated[match.id]}
              onView={handleViewMatch}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default LiveMatchBoard;
