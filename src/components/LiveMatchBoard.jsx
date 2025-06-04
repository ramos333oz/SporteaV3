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
  const [recentlyUpdated, setRecentlyUpdated] = useState({});
  const { connectionState, subscribeToAllMatches, unsubscribe } = useRealtime();
  const { showInfoToast, showSuccessToast } = useToast();
  const navigate = useNavigate();

  // Fetch initial matches
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        // Get matches that are not cancelled or completed
        const { data, error } = await supabase
          .from('matches')
          .select(`
            id,
            title,
            start_time,
            end_time,
            max_participants,
            status,
            location_name:locations(name),
            sport_name:sports(name)
          `)
          .in('status', ['open', 'in_progress', 'full'])
          .order('start_time', { ascending: true })
          .limit(20);

        if (error) throw error;
        
        // Format the matches to normalize structure
        const formattedMatches = data.map(match => ({
          ...match,
          current_participants: 0, // Default value, will be updated
          location_name: match.location_name?.name || 'Unknown Location',
          sport_name: match.sport_name?.name || 'Unknown Sport'
        }));
        
        // Get participant counts for each match
        if (formattedMatches.length > 0) {
          await fetchParticipantCounts(formattedMatches);
        } else {
          setMatches(formattedMatches);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Helper function to fetch participant counts for all matches
    const fetchParticipantCounts = async (matchesArray) => {
      try {
        // Create array of promises to fetch participant counts
        const countPromises = matchesArray.map(async (match) => {
          const { data, error } = await supabase
            .from('participants')
            .select('id')
            .eq('match_id', match.id)
            .eq('status', 'confirmed');
            
          if (error) {
            console.error('Error fetching participants for match:', match.id, error);
            return { ...match };
          }
          
          return { 
            ...match, 
            current_participants: data ? data.length : 0 
          };
        });
        
        // Wait for all promises to resolve
        const matchesWithCounts = await Promise.all(countPromises);
        setMatches(matchesWithCounts);
      } catch (error) {
        console.error('Error fetching participant counts:', error);
      }
    };

    fetchMatches();
  }, []);

  // Hook into real-time updates
  useEffect(() => {
    // Only subscribe when connected, with safety check
    if (!connectionState || !connectionState.isConnected) {
      return;
    }

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
