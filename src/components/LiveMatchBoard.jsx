import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import {
  SportsSoccer,
  SportsBasketball,
  SportsTennis,
  SportsRugby,
  SportsVolleyball,
  SportsHockey,
  LocationOn,
  CalendarMonth,
  Star,
  Visibility,
  Group
} from '@mui/icons-material';
import { useProductionRealtime } from '../hooks/useProductionRealtime';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase, participantService } from '../services/supabase';
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
const MatchCard = ({ match, isRecentlyUpdated, onView, userParticipation, onJoinRequest, onLeaveRequest, currentUserId, hasInvitation }) => {
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

  const handleJoinClick = (e) => {
    e.stopPropagation();

    // Check if user is already joined and handle leave functionality
    if (userParticipation && userParticipation.status === 'confirmed') {
      if (onLeaveRequest) {
        onLeaveRequest(match);
      }
    } else if (onJoinRequest && match.id) {
      onJoinRequest(match);
    }
  };

  // Determine button state based on user participation and host status
  const getJoinButtonState = () => {
    // Check if current user is the host
    const isHost = match.host_id && match.host_id === currentUserId;

    // Debug logging only in development and only once per match
    if (process.env.NODE_ENV !== 'production' && !window.loggedMatches) {
      window.loggedMatches = new Set();
    }
    if (process.env.NODE_ENV !== 'production' && !window.loggedMatches.has(match.id)) {
      console.log(`[MatchCard] Host detection for match ${match.id}:`, {
        match_host_id: match.host_id,
        current_user_id: currentUserId,
        is_host: isHost,
        match_title: match.title
      });
      window.loggedMatches.add(match.id);
    }

    if (isHost) return { text: "You're the Hoster", disabled: true, color: '#9C27B0' };
    if (isFull) return { text: 'Full', disabled: true, color: 'grey' };

    // Check if user has an invitation
    if (hasInvitation && !userParticipation) {
      return { text: 'Accept Invitation', disabled: false, color: '#4CAF50' };
    }

    if (!userParticipation) return { text: 'Join Match', disabled: false, color: sportInfo.color };

    switch (userParticipation.status) {
      case 'pending':
        return { text: 'Requested', disabled: true, color: '#FF9800' };
      case 'confirmed':
        return { text: 'Joined', disabled: false, color: '#4CAF50' };
      case 'declined':
        return { text: 'Declined', disabled: true, color: '#F44336' };
      case 'left':
        return { text: 'Join Match', disabled: false, color: sportInfo.color };
      default:
        return { text: 'Join Match', disabled: false, color: sportInfo.color };
    }
  };

  const buttonState = getJoinButtonState();

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

  // Prioritize actual venue image from location, fallback to sport-based default
  const venueImage = match.location_image_url ||
                     (match.locations?.image_url) ||
                     defaultVenueImages[match.sport_id] ||
                     '/images/venues/default-field.jpg';

  // Calculate spots remaining
  const spotsRemaining = match.max_participants - (match.current_participants || 0);

  return (
    <UnifiedCard
      image={venueImage}
      imageAlt={`${sportInfo.name} venue`}
      imageHeight={200}
      imagePosition="top"
      title={match.title || `${sportInfo.name} Match`}
      subtitle={`Live match • ${spotsRemaining} spots left`}
      onClick={handleCardClick}
      variant={isRecentlyUpdated ? 'elevated' : 'default'}
      ariaLabel={`View ${match.title || 'match'} details`}
      sx={{
        height: '100%', // Fill the grid item height
        display: 'flex',
        flexDirection: 'column',
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
        {/* Sport and Match Info - Following recommendation design */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {React.cloneElement(sportInfo.icon, { sx: { color: sportInfo.color, fontSize: 28 } })}
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {sportInfo.name}
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <Chip
              label={isFull ? 'Full' : `${spotsRemaining} spots left`}
              size="small"
              color={isFull ? 'error' : spotsRemaining <= 2 ? 'warning' : 'success'}
              icon={<Group />}
            />
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

        {/* Location prominently displayed at top with bigger fonts */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <LocationOn sx={{ color: 'primary.main', fontSize: '1.3rem' }} />
            {match.location_name || 'Location TBA'}
          </Typography>
        </Box>

        {/* Key Information - Following recommendation design with chips */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            icon={<CalendarMonth />}
            label={`${formatDate(match.start_time)} • ${formatTime(match.start_time)}`}
            variant="outlined"
            size="small"
            sx={{
              borderColor: 'primary.main',
              color: 'primary.main',
              '& .MuiChip-icon': { color: 'primary.main' }
            }}
          />
          <Chip
            icon={<PersonIcon />}
            label={`${match.current_participants || 0}/${match.max_participants} players`}
            variant="outlined"
            size="small"
            color={isFull ? 'error' : 'success'}
          />
        </Stack>

        {/* Divider before actions - Following recommendation design */}
        <Divider sx={{ my: 2 }} />

        {/* Action Buttons - Following recommendation design */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Visibility />}
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            sx={{
              flex: 1,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'primary.main',
                color: 'white',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease'
            }}
          >
            View Details
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Group />}
            disabled={buttonState.disabled}
            onClick={buttonState.disabled ? undefined : handleJoinClick}
            sx={{
              flex: 1,
              backgroundColor: buttonState.color,
              '&:hover': {
                backgroundColor: buttonState.disabled ? buttonState.color : buttonState.color,
                filter: buttonState.disabled ? 'none' : 'brightness(0.9)',
                transform: buttonState.disabled ? 'none' : 'translateY(-1px)',
              },
              '&:disabled': {
                backgroundColor: buttonState.color,
                color: 'white',
                opacity: 0.8
              },
              transition: 'all 0.2s ease'
            }}
          >
            {buttonState.text}
          </Button>
        </Box>
      </UnifiedCard>
  );
};

/**
 * LiveMatchBoard component
 * Displays a live-updating board of matches
 * Uses WebSocket connections to show real-time updates
 * Optimized with React.memo for performance
 */
const LiveMatchBoard = React.memo(() => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentlyUpdated, setRecentlyUpdated] = useState({});
  const [userParticipations, setUserParticipations] = useState({});
  const [joinDialog, setJoinDialog] = useState({ open: false, match: null });
  const [joinLoading, setJoinLoading] = useState(false);
  const [directInvitations, setDirectInvitations] = useState({});
  const { connectionState } = useProductionRealtime();
  const { showSuccessToast, showErrorToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Performance optimization: Memoize filtered and sorted matches
  const processedMatches = useMemo(() => {
    if (!matches || matches.length === 0) return [];

    // Filter out matches that don't meet criteria and sort by start time
    return matches
      .filter(match =>
        match.status === 'upcoming' &&
        ['approved', 'auto_approved'].includes(match.moderation_status)
      )
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [matches]);

  // Define fetchMatches function at component level so it's accessible everywhere
  // Optimized with useCallback for performance
  const fetchMatches = useCallback(async () => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Fetching live matches...');
      }
      setLoading(true);
      
      // Create a date object for Malaysia timezone (UTC+8)
      // This ensures we're working with the correct local date
      const malaysiaOptions = { timeZone: 'Asia/Kuala_Lumpur' };
      const malaysiaDateStr = new Date().toLocaleDateString('en-US', malaysiaOptions);
      const malaysiaDate = new Date(malaysiaDateStr);
      
      // Get today's date in YYYY-MM-DD format for Malaysia timezone
      const todayDateStr = malaysiaDate.toISOString().split('T')[0];
      console.log('Current date in Malaysia timezone:', todayDateStr);
      
      console.log('Fetching matches for date:', todayDateStr);
      
      // Get all active matches (not filtering by date in the query)
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          title,
          start_time,
          end_time,
          max_participants,
          status,
          host_id,
          moderation_status,
          locations(id, name, image_url),
          sports(id, name)
        `)
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'completed')
        .in('moderation_status', ['approved', 'auto_approved']) // CRITICAL FIX: Hide pending/flagged matches
        .order('start_time', { ascending: true });
        
      if (error) throw error;
      
      console.log('Fetched potential matches data:', data ? data.length : 0);
      
      // Filter matches to only include ones happening on the current date in Malaysia
      const activeMatches = data.filter(match => {
        if (!match.start_time) return false;
        
        // Convert match start time to Malaysia timezone and get date part only
        const matchDateInMalaysia = new Date(match.start_time)
          .toLocaleDateString('en-US', malaysiaOptions);
        const matchDateObj = new Date(matchDateInMalaysia);
        const matchDateStr = matchDateObj.toISOString().split('T')[0];
        
        // Check if match date equals today's date
        const isToday = matchDateStr === todayDateStr;
        
        // Also filter out matches that have already ended
        const now = new Date();
        const startTime = new Date(match.start_time);
        // Use duration_minutes if available, otherwise calculate from end_time, or use default of 60
        const durationInMinutes = match.duration_minutes || 
          (match.end_time ? (new Date(match.end_time) - startTime) / 60000 : 60);
        const endTime = match.end_time 
          ? new Date(match.end_time) 
          : new Date(startTime.getTime() + durationInMinutes * 60000);
        const isActive = endTime > now;
        
        if (!isToday) {
          console.log(`Match ${match.id} (${match.title}) on ${matchDateStr} - not today ${todayDateStr}`);
        }
        
        if (!isActive) {
          console.log(`Match ${match.id} (${match.title}) already ended`);
        }
        
        if (isToday && isActive) {
          console.log(`Including match ${match.id} (${match.title}) - happening today and active`);
        }
        
        return isToday && isActive;
      });
      
      console.log('Matches for today in Malaysia timezone:', activeMatches.length);
      
      // Transform data to include location and sport names
      const transformedMatches = activeMatches.map(match => ({
        ...match,
        location_name: match.locations?.name,
        sport_name: match.sports?.name,
        sport_id: match.sports?.id, // Ensure sport_id is properly set
        current_participants: 0 // Will be filled in later
      }));
      
      // Check if we have matches before setting state
      if (transformedMatches.length === 0) {
        console.log('No live matches found for today. This could be normal if there are no active matches today.');
      } else {
        console.log(`Found ${transformedMatches.length} live matches for today.`);
      }
      
      setMatches(transformedMatches);

      // Always fetch user participations when matches are loaded to ensure consistency
      if (user) {
        console.log('[LiveMatchBoard] Fetching user participations after matches loaded');
        setTimeout(() => fetchUserParticipations(true), 100);
      }

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
  }, []);

  // Hook into real-time updates
  useEffect(() => {
    // Subscribe even if not connected yet - the useRealtime hook will handle reconnection
    if (process.env.NODE_ENV !== 'production') {
      console.log('Setting up real-time subscriptions for matches, connection state:', connectionState);
    }

    // Remove the 30-second refresh interval to reduce server load
    // Real-time updates should handle data freshness
    
    // Initial fetch
    fetchMatches();

    // Handle match updates (production-optimized)
    const handleMatchUpdate = (event) => {
      console.log('[ProductionRealtime] Match update:', event.detail.eventType, event.detail.new?.id);
      const { new: newMatch, eventType } = event.detail;

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
    };

    // Handle participant updates (production-optimized)
    const handleParticipantUpdate = (event) => {
      console.log('[ProductionRealtime] Participant update:', event.detail.eventType, event.detail.new);
      const { new: participant } = event.detail;
      const matchId = participant?.match_id;

      // Refresh the complete match data to prevent "Unknown" data corruption
      // This ensures sport, location, and all other match data remains intact
      fetchSingleMatchWithDetails(matchId);
    };

    // Subscribe to production-optimized events
    window.addEventListener('sportea:match-update', handleMatchUpdate);
    window.addEventListener('sportea:participation', handleParticipantUpdate);
    console.log('[LiveMatchBoard] Subscribed to production realtime events');

    // Cleanup function
    return () => {
      // Cleanup event listeners
      window.removeEventListener('sportea:match-update', handleMatchUpdate);
      window.removeEventListener('sportea:participation', handleParticipantUpdate);
      console.log('[LiveMatchBoard] Cleaned up production realtime events');
    };
  }, []);

  // User participation updates are now handled by the production-optimized system
  // through the 'sportea:participation' events in the main subscription above

  // Initial fetch of user participations when component mounts
  useEffect(() => {
    if (user && matches.length > 0) {
      fetchUserParticipations();
      fetchDirectInvitations();
    }
  }, [user, matches.length]); // Run when user or matches.length changes

  // Additional effect to ensure participations are loaded
  useEffect(() => {
    if (user && matches.length > 0 && Object.keys(userParticipations).length === 0) {
      const retryTimer = setTimeout(() => {
        fetchUserParticipations();
        fetchDirectInvitations();
      }, 1000);
      return () => clearTimeout(retryTimer);
    }
  }, [user, matches.length, userParticipations]);



  // Helper function to fetch complete match details with relationships
  const fetchSingleMatchWithDetails = async (matchId) => {
    if (!matchId) {
      console.error('Invalid match ID provided to fetchSingleMatchWithDetails');
      return;
    }

    try {

      // Fetch the complete match data with all relationships
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          id,
          title,
          start_time,
          end_time,
          max_participants,
          status,
          host_id,
          locations(id, name, image_url),
          sports(id, name)
        `)
        .eq('id', matchId)
        .single();

      if (matchError) {
        console.error('Error fetching match details:', matchError);
        return;
      }

      if (!matchData) {
        console.warn('No match data found for ID:', matchId);
        return;
      }

      // Get the current participant count
      const { data: participantData, error: participantError } = await supabase
        .from('participants')
        .select('id')
        .eq('match_id', matchId)
        .eq('status', 'confirmed');

      if (participantError) {
        console.error('Error fetching participant count:', participantError);
        return;
      }

      // Transform the match data to include location and sport names
      const transformedMatch = {
        ...matchData,
        location_name: matchData.locations?.name,
        sport_name: matchData.sports?.name,
        sport_id: matchData.sports?.id,
        current_participants: participantData?.length || 0
      };

      // Update the specific match in the state
      setMatches(prevMatches =>
        prevMatches.map(match =>
          match.id === matchId ? transformedMatch : match
        )
      );

      markAsRecentlyUpdated(matchId);

    } catch (error) {
      console.error('[fetchSingleMatchWithDetails] Error refreshing match data:', error);
    }
  };

  // Mark a match as recently updated - optimized with useCallback
  const markAsRecentlyUpdated = useCallback((matchId) => {
    setRecentlyUpdated(prev => ({ ...prev, [matchId]: true }));

    // Remove the "recently updated" status after 5 seconds
    setTimeout(() => {
      setRecentlyUpdated(prev => {
        const updated = { ...prev };
        delete updated[matchId];
        return updated;
      });
    }, 5000);
  }, []);

  // Handle view match - optimized with useCallback
  const handleViewMatch = useCallback((matchId) => {
    navigate(`/match/${matchId}`);
  }, [navigate]);

  // Handle join request
  const handleJoinRequest = (match) => {
    if (!user) {
      showErrorToast('Authentication Required', 'Please log in to join matches');
      return;
    }
    setJoinDialog({ open: true, match });
  };

  // Handle leave match request
  const handleLeaveRequest = async (match) => {
    if (!user) return;

    try {
      // Show confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to leave "${match.title}"? You will need to request to join again if you change your mind.`
      );

      if (!confirmed) return;

      const result = await participantService.leaveMatch(match.id, user.id);

      if (result && result.success) {
        // Update user participation state to 'left'
        setUserParticipations(prev => ({
          ...prev,
          [match.id]: { status: 'left', match_id: match.id, user_id: user.id }
        }));

        showSuccessToast('Success', result.message || 'Successfully left the match');

        // Force refresh of user participations to ensure consistency
        setTimeout(() => fetchUserParticipations(true), 500);
      } else {
        showErrorToast('Error', result?.message || 'Failed to leave match');
      }
    } catch (error) {
      console.error('Error leaving match:', error);
      showErrorToast('Error', error.message || 'Failed to leave match');
    }
  };

  // Handle join confirmation
  const handleJoinConfirm = async () => {
    const match = joinDialog.match;
    if (!match || !user) return;

    setJoinLoading(true);
    setJoinDialog({ open: false, match: null });

    try {
      const result = await participantService.joinMatch(match.id, user.id);

      if (result && result.success) {
        if (result.joinType === 'direct_invitation') {
          // Direct Join invitation was accepted - user is immediately confirmed
          setUserParticipations(prev => ({
            ...prev,
            [match.id]: { status: 'confirmed', match_id: match.id, user_id: user.id }
          }));
          showSuccessToast('Joined Successfully!', 'You have successfully joined the match via Direct Join invitation!');

          // Remove the direct invitation since it's been used
          setDirectInvitations(prev => {
            const updated = { ...prev };
            delete updated[match.id];
            return updated;
          });
        } else {
          // Regular join request - user is pending approval
          setUserParticipations(prev => ({
            ...prev,
            [match.id]: { status: 'pending', match_id: match.id, user_id: user.id }
          }));
          showSuccessToast('Request Sent', 'Successfully sent request to join match. Waiting for host approval.');
        }
      } else {
        showErrorToast('Request Failed', result?.message || 'Failed to send join request');
      }
    } catch (error) {
      console.error('Error joining match:', error);
      showErrorToast('Error', error.message || 'Failed to join match');
    } finally {
      setJoinLoading(false);
    }
  };

  // Fetch user participations for all matches
  const fetchUserParticipations = async () => {
    if (!user || matches.length === 0) {
      return;
    }

    try {
      const matchIds = matches.map(m => m.id);

      const { data, error } = await supabase
        .from('participants')
        .select('match_id, status, user_id, joined_at')
        .eq('user_id', user.id)
        .in('match_id', matchIds);

      if (error) {
        console.error('[fetchUserParticipations] Database error:', error);
        throw error;
      }

      const participationMap = {};
      if (data && data.length > 0) {
        data.forEach(p => {
          participationMap[p.match_id] = p;
        });
      }

      setUserParticipations(participationMap);
    } catch (error) {
      console.error('[fetchUserParticipations] Error fetching user participations:', error);
      // Don't clear existing participations on error
    }
  };

  // Fetch Direct Join invitations for all matches
  const fetchDirectInvitations = async () => {
    if (!user || matches.length === 0) {
      return;
    }

    try {
      const matchIds = matches.map(m => m.id);

      // Get Direct Join invitations that are either pending OR accepted but user hasn't joined yet
      const { data: invitations, error: invitationError } = await supabase
        .from('match_invitations')
        .select('match_id, invitation_type, status')
        .eq('invitee_id', user.id)
        .eq('invitation_type', 'direct')
        .in('status', ['pending', 'accepted'])
        .in('match_id', matchIds);

      if (invitationError) {
        console.error('[fetchDirectInvitations] Database error:', invitationError);
        throw invitationError;
      }

      // For accepted invitations, check if user is actually in participants table
      const invitationMap = {};

      if (invitations && invitations.length > 0) {
        // Get user's current participations for these matches
        const { data: participations, error: participationError } = await supabase
          .from('participants')
          .select('match_id, status')
          .eq('user_id', user.id)
          .in('match_id', matchIds)
          .in('status', ['confirmed', 'pending']);

        if (participationError) {
          console.error('[fetchDirectInvitations] Error fetching participations:', participationError);
          // Continue without participation check
        }

        const participationMap = {};
        if (participations) {
          participations.forEach(p => {
            participationMap[p.match_id] = p.status;
          });
        }

        invitations.forEach(invitation => {
          // Include invitation if:
          // 1. It's pending (user hasn't responded yet)
          // 2. It's accepted but user is not in participants (join failed)
          if (invitation.status === 'pending' ||
              (invitation.status === 'accepted' && !participationMap[invitation.match_id])) {
            invitationMap[invitation.match_id] = true;
          }
        });
      }

      setDirectInvitations(invitationMap);
    } catch (error) {
      console.error('[fetchDirectInvitations] Error fetching direct invitations:', error);
      // Don't clear existing invitations on error
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Live Matches
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : processedMatches.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
          No active matches found. Check again later or create your own match!
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {processedMatches.map((match) => (
            <Grid item xs={12} sm={6} md={4} key={match.id}>
              <MatchCardErrorBoundary>
                <MatchCard
                  match={match}
                  isRecentlyUpdated={!!recentlyUpdated[match.id]}
                  onView={handleViewMatch}
                  userParticipation={userParticipations[match.id]}
                  onJoinRequest={handleJoinRequest}
                  onLeaveRequest={handleLeaveRequest}
                  currentUserId={user?.id}
                  hasInvitation={!!directInvitations[match.id]}
                />
              </MatchCardErrorBoundary>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Join Match Confirmation Dialog */}
      <Dialog
        open={joinDialog.open}
        onClose={() => setJoinDialog({ open: false, match: null })}
        aria-labelledby="join-match-dialog-title"
      >
        <DialogTitle id="join-match-dialog-title">
          {directInvitations[joinDialog.match?.id] ? 'Join Match' : 'Request to Join Match'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {directInvitations[joinDialog.match?.id] ? (
              <>
                Are you sure you want to join "{joinDialog.match?.title}"? You have a Direct Join invitation, so you will be added to the match immediately.
              </>
            ) : (
              <>
                Are you sure you want to send a request to join "{joinDialog.match?.title}"? The host will need to approve your request.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialog({ open: false, match: null })}>Cancel</Button>
          <Button onClick={handleJoinConfirm} color="primary" variant="contained" disabled={joinLoading}>
            {joinLoading ? <CircularProgress size={24} /> : (directInvitations[joinDialog.match?.id] ? 'Join Match' : 'Send Request')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default LiveMatchBoard;
