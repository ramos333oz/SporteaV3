import React, { useState, useEffect, useCallback } from 'react';
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
  Stack,
  CircularProgress,
  IconButton,
  Collapse,
  FormControl,
  FormGroup,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
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
import RecommendIcon from '@mui/icons-material/Recommend';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useAuth } from '../../hooks/useAuth';
import { participantService } from '../../services/supabase';
import recommendationService from '../../services/recommendationService';
import interactionService from '../../services/interactionService';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  
  // New state for advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    skillLevel: 'all',
    minSpots: 1,
    maxDistance: 50,  // in km
    showPrivate: true,
    showFull: false,
    dateRange: 'all'  // 'today', 'tomorrow', 'week', 'all'
  });
  
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedMatchToJoin, setSelectedMatchToJoin] = useState(null);
  
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
  
  // Load personalized recommendations when component mounts or user changes
  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user) {
        // For non-logged in users, just show the newest matches
        if (propMatches) {
          const sortedByDate = [...propMatches].sort((a, b) => 
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
          );
          setRecommendedMatches(sortedByDate.slice(0, 3));
        }
        return;
      }
      
      try {
        // Fetch personalized recommendations - we added error handling in the service itself
        // so this should no longer throw errors
        const { recommendations, type, message } = await recommendationService.getRecommendations(user.id, 5);
        
        if (recommendations && recommendations.length > 0) {
          // Filter out matches where the user is the host
          const filteredRecommendations = recommendations.filter(match => 
            match.host_id !== user.id
          );
          
          // Set the recommended matches with their explanation and metadata
          setRecommendedMatches(filteredRecommendations);
          
          // If we got a message from the recommendation service, show it as a notification
          if (message) {
            setNotification({
              severity: 'info',
              message: message
            });
          }
        } else {
          // Fall back to sorting by date if recommendations are empty
          console.log('No recommendations returned, falling back to default sorting');
          if (propMatches) {
            const sortedByDate = [...propMatches]
              .filter(match => match.host_id !== user.id) // Filter out user's own matches
              .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            
            setRecommendedMatches(sortedByDate.slice(0, 3));
          }
        }
      } catch (error) {
        console.error('Error in recommendation handling:', error);
        // Fall back to sorting by date if recommendations fail
        if (propMatches) {
          const sortedByDate = [...propMatches]
            .filter(match => match.host_id !== user.id) // Filter out user's own matches
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          
          setRecommendedMatches(sortedByDate.slice(0, 3));
        }
      }
    };
    
    loadRecommendations();
  }, [user, propMatches]);

  // Apply all filters to matches
  const applyFilters = useCallback((sourceMatches) => {
    if (!sourceMatches || sourceMatches.length === 0) return [];
    
    return sourceMatches
      .filter(match => {
        // Apply sport filter
        if (selectedSportFilter !== 'all' && 
            match.sport_id?.toString() !== selectedSportFilter &&
            match.sport?.id?.toString() !== selectedSportFilter) {
          return false;
        }
        
        // Apply skill level filter
        if (filters.skillLevel !== 'all' && 
            match.skill_level?.toLowerCase() !== filters.skillLevel.toLowerCase()) {
          return false;
        }
        
        // Apply spots filter - only show matches with at least this many spots left
        const spotsLeft = (match.max_participants || 0) - (match.current_participants || 0);
        if (spotsLeft < filters.minSpots) {
          return false;
        }
        
        // Apply full matches filter
        if (!filters.showFull && spotsLeft <= 0) {
          return false;
        }
        
        // Apply private matches filter
        if (!filters.showPrivate && match.is_private) {
          return false;
        }
        
        // Apply date range filter
        if (filters.dateRange !== 'all' && match.start_time) {
          const matchDate = new Date(match.start_time);
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Set to start of today
          
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          
          if (filters.dateRange === 'today' && 
              (matchDate < today || matchDate >= tomorrow)) {
            return false;
          } else if (filters.dateRange === 'tomorrow' && 
                    (matchDate < tomorrow || matchDate >= new Date(tomorrow.getTime() + 86400000))) {
            return false;
          } else if (filters.dateRange === 'week' && 
                    (matchDate < today || matchDate >= nextWeek)) {
            return false;
          }
        }
        
        // Match passed all filters
        return true;
      })
      .map(match => ({
        ...match,
        // Mark as updated if it's new or recently modified
        isUpdated: match.created_at && 
          new Date(match.created_at) > new Date(Date.now() - 10 * 60 * 1000) // Created in last 10 minutes
      }));
  }, [selectedSportFilter, filters]);

  // Update matches when props or filter changes
  useEffect(() => {
    if (propMatches) {
      setLoading(false);
      
      // Apply all filters
      const filteredMatches = applyFilters(propMatches);
      setMatches(filteredMatches);
      
      // Register impressions for visible matches to improve recommendations
      if (user) {
        const matchesToTrack = selectedSportFilter === 'all' ? 
          propMatches : 
          propMatches.filter(match => 
            match.sport_id?.toString() === selectedSportFilter ||
            match.sport?.id?.toString() === selectedSportFilter
          );
        
        // Track impressions in a non-blocking way
        matchesToTrack.slice(0, 10).forEach(match => {
          interactionService.registerMatchView(user.id, match.id)
            .catch(console.error); // Non-blocking
        });
      }
    } else {
      setLoading(true);
    }
  }, [propMatches, selectedSportFilter, user]);
  
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
    if (!user) return;
    
    setSelectedMatchToJoin(match);
    setJoinDialogOpen(true);
  };
  
  // Handle join confirmation
  const handleJoinConfirm = async () => {
    const match = selectedMatchToJoin;
    if (!match) return;
    
    setJoinDialogOpen(false);
    
    try {
      setJoinLoading(prev => ({ ...prev, [match.id]: true }));
      
      const result = await participantService.joinMatch(match.id, user.id);
      
      // Update the match in state
      const updatedMatches = matches.map(m => {
        if (m.id === match.id) {
          return { 
            ...m, 
            is_joined: true, 
            join_status: 'pending', // Always set to pending for new joins
            current_participants: m.current_participants // Don't increment here as pending requests don't count
          };
        }
        return m;
      });
      
      // If this is a recommended match, update it in the recommended matches list too
      if (match.recommendation_type) {
        const updatedRecommendations = recommendedMatches.map(m => {
          if (m.id === match.id) {
            return { 
              ...m, 
              is_joined: true, 
              join_status: 'pending', // Always set to pending for new joins
              current_participants: m.current_participants // Don't increment here as pending requests don't count
            };
          }
          return m;
        });
        setRecommendedMatches(updatedRecommendations);
        
        // Track recommendation interaction (non-blocking)
        try {
          recommendationService.trackRecommendationAction(
            user.id,
            match.id,
            'joined',
            match.finalScore || 0.5,
            match.recommendation_type,
            match.explanation || ''
          ).catch(error => {
            console.error('Non-critical error tracking recommendation action:', error);
            // Continue execution - this is non-blocking
          });
        } catch (error) {
          console.error('Error in recommendation tracking:', error);
          // Continue execution - this is non-blocking
        }
      }
      
      setMatches(updatedMatches);
      
      // Show more prominent notification
      setNotification({
        severity: 'success',
        message: 'Request sent! Waiting for host approval.',
        duration: 5000 // Show for 5 seconds instead of default
      });
      
      // Track the join interaction (non-blocking)
      try {
        interactionService.trackInteraction(
          user.id,
          match.id,
          'join'
        ).catch(error => {
          console.error('Non-critical error tracking interaction:', error);
          // Continue execution - this is non-blocking
        });
      } catch (error) {
        console.error('Error in interaction tracking:', error);
        // Continue execution - this is non-blocking
      }
      
      // Generate new user embeddings to improve future recommendations (non-blocking)
      try {
        // Make this operation completely non-blocking and catch all possible errors
        setTimeout(() => {
          recommendationService.generateUserEmbedding(user.id)
            .catch(error => {
              console.error('Non-critical error generating user embedding:', error);
            });
        }, 100);
      } catch (error) {
        console.error('Error initiating user embedding generation:', error);
        // Continue execution - this is non-blocking
      }
    } catch (error) {
      console.error('Error joining match:', error);
      setNotification({
        severity: 'error',
        message: error.message || 'Failed to join match',
        duration: 5000
      });
    } finally {
      setJoinLoading(prev => ({ ...prev, [match.id]: false }));
      setSelectedMatchToJoin(null);
    }
  };
  
  // Handle join dialog close
  const handleJoinDialogClose = () => {
    setJoinDialogOpen(false);
    setSelectedMatchToJoin(null);
  };
  
  // Handle leave match
  const handleLeaveMatch = async (match) => {
    if (!user) return;
    
    try {
      setJoinLoading(prev => ({ ...prev, [match.id]: true }));
      
      // Try with participantService first, then fall back to matchService
      let result;
      try {
        result = await participantService.leaveMatch(match.id, user.id);
      } catch (participantServiceError) {
        console.error('Error using participantService.leaveMatch:', participantServiceError);
        
        // Fall back to matchService if participantService fails
        try {
          result = await matchService.leaveMatch(match.id, user.id);
        } catch (matchServiceError) {
          console.error('Error using matchService.leaveMatch fallback:', matchServiceError);
          throw new Error('Failed to leave match. Please try again.');
        }
      }
      
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
      
      // If this is a recommended match, update it in the recommended matches list too
      if (match.recommendation_type) {
        const updatedRecommendations = recommendedMatches.map(m => {
          if (m.id === match.id) {
            return { 
              ...m, 
              is_joined: false,
              join_status: null,
              current_participants: Math.max(0, m.current_participants - 1)
            };
          }
          return m;
        });
        setRecommendedMatches(updatedRecommendations);
        
        // Track recommendation interaction in a try-catch to ensure it doesn't break main flow
        try {
          recommendationService.trackRecommendationAction(
            user.id,
            match.id,
            'left',
            match.finalScore || 0.5,
            match.recommendation_type,
            match.explanation || ''
          ).catch(error => {
            console.error('Non-critical error tracking recommendation action:', error);
            // Continue execution - this is non-blocking
          });
        } catch (error) {
          console.error('Error in recommendation tracking:', error);
          // Continue execution - this is non-blocking
        }
      }
      
      setMatches(updatedMatches);
      setNotification({
        severity: 'info',
        message: result?.message || 'Successfully left the match'
      });
      
      // Track the leave interaction with improved error handling
      try {
        interactionService.trackInteraction(
          user.id,
          match.id,
          'leave'
        ).catch(error => {
          console.error('Non-critical error tracking interaction:', error);
          // Continue execution - this is non-blocking
        });
      } catch (error) {
        console.error('Error in interaction tracking:', error);
        // Continue execution - this is non-blocking
      }
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
  
  // Handle clicking on a recommended match card
  const handleRecommendationClick = (match) => {
    if (!user || !match.recommendation_type) return;
    
    // Track that the user clicked on this recommendation in analytics
    recommendationService.trackRecommendationAction(
      user.id,
      match.id,
      'clicked',
      match.finalScore || 0.5,
      match.recommendation_type,
      match.explanation || ''
    ).catch(console.error); // Non-blocking
    
    // Also track in user_interactions for collaborative filtering
    interactionService.trackInteraction(
      user.id,
      match.id,
      'click'
    ).catch(console.error); // Non-blocking
    
    // Navigate to match details page
    navigate(`/match/${match.id}`);
  };
  
  // Refresh recommendations
  const handleRefreshRecommendations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { recommendations, type, message } = await recommendationService.getRecommendations(user.id, 5);
      setRecommendedMatches(recommendations);
      
      if (message) {
        setNotification({
          severity: 'info',
          message: message
        });
      }
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
      setNotification({
        severity: 'error',
        message: 'Failed to refresh recommendations'
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to matches
  const filteredMatches = React.useMemo(() => {
    if (!matches || matches.length === 0) return [];
    
    return matches.filter(match => {
      // Apply sport filter
      if (selectedSportFilter !== 'all' && 
          match.sport_id?.toString() !== selectedSportFilter &&
          match.sport?.id?.toString() !== selectedSportFilter) {
        return false;
      }
      
      // Apply skill level filter
      if (filters.skillLevel !== 'all' && 
          match.skill_level?.toLowerCase() !== filters.skillLevel.toLowerCase()) {
        return false;
      }
      
      // Apply spots filter - only show matches with at least this many spots left
      const spotsLeft = (match.max_participants || 0) - (match.current_participants || 0);
      if (spotsLeft < filters.minSpots) {
        return false;
      }
      
      // Apply full matches filter
      if (!filters.showFull && spotsLeft <= 0) {
        return false;
      }
      
      // Apply private matches filter
      if (!filters.showPrivate && match.is_private) {
        return false;
      }
      
      // Apply date range filter
      if (filters.dateRange !== 'all' && match.start_time) {
        const matchDate = new Date(match.start_time);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        if (filters.dateRange === 'today' && 
            (matchDate < today || matchDate >= tomorrow)) {
          return false;
        } else if (filters.dateRange === 'tomorrow' && 
                  (matchDate < tomorrow || matchDate >= new Date(tomorrow.getTime() + 86400000))) {
          return false;
        } else if (filters.dateRange === 'week' && 
                  (matchDate < today || matchDate >= nextWeek)) {
          return false;
        }
      }
      
      // Match passed all filters
      return true;
    });
  }, [matches, selectedSportFilter, filters]);
  
  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Track filter usage if user is logged in
    if (user) {
      interactionService.trackInteraction(
        user.id,
        'filter_usage',
        'filter_change',
        { filter: name, value: type === 'checkbox' ? checked : value }
      ).catch(console.error); // Non-blocking
    }
  };
  
  // Reset filters to default
  const handleResetFilters = () => {
    setFilters({
      skillLevel: 'all',
      minSpots: 1,
      maxDistance: 50,
      showPrivate: true,
      showFull: false,
      dateRange: 'all'
    });
  };
  
  // Render recommendation card (similar to match card but with recommendation details)
  const renderRecommendationCard = (match) => {
    // Format date and time
    const { date, time } = formatDateTime(match.start_time);
    
    // Calculate spots available
    const maxParticipants = match.max_participants || 10;
    // Ensure we include the host in the count, start from 1 instead of 0 if not specified
    const currentParticipants = match.current_participants || 1;
    const spotsAvailable = maxParticipants - currentParticipants;
    
    // Calculate fill percentage for visual progress bar
    const fillPercentage = (currentParticipants / maxParticipants) * 100;
    
    // Determine match status
    const isFull = spotsAvailable <= 0;
    const isAboutToFill = spotsAvailable <= 2 && !isFull;
    const isJoined = match.is_joined;
    const joinStatus = match.join_status || null;
    const isLoading = joinLoading[match.id] || false;
    const skillLevel = match.skill_level || match.skillLevel || 'Intermediate';
    // Check if the current user is the host of this match
    const isUserHost = user && (match.host_id === user.id || (match.host && match.host.id === user.id));
    
    // Get sport data
    const sport = match.sport || match.sports || {};
    const sportName = sport.name || match.sport_name || 'Sport';
    const sportIcon = getSportIcon(sportName);
    
    // Get location
    const location = match.location?.name || match.location_name || match.locations?.name || 'Unknown location';
    
    // Get host
    const host = match.host || {};
    const hostName = host.full_name || host.name || host.username || 'Host';
    
    return (
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: 3,
          transition: 'all 0.3s ease-in-out',
          position: 'relative',
          overflow: 'visible',
          border: '2px solid #3f51b5',
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: 6
          },
        }}
        onClick={() => handleRecommendationClick(match)}
      >
        {/* Recommendation badge */}
        <Box 
          sx={{
            position: 'absolute',
            top: -10,
            right: -10,
            zIndex: 1
          }}
        >
          <Tooltip title={match.explanation || 'Recommended for you'}>
            <Badge
              badgeContent={
                <RecommendIcon fontSize="small" sx={{ color: 'white' }} />
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

        <CardContent sx={{ flexGrow: 1 }}>
          {/* Sport type chip and recommendation type */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip 
              icon={sportIcon}
              label={sportName}
              size="small"
              color="primary"
              variant="filled"
            />
            
            <Tooltip title={match.explanation || 'Recommended for you'}>
              <Chip 
                icon={<InfoIcon fontSize="small" />}
                label={match.recommendation_type === 'content-based' ? 'Personalized' : 
                      match.recommendation_type === 'collaborative' ? 'Popular' : 'Recommended'}
                size="small"
                color="secondary"
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
                {location}
              </Typography>
            </Box>
            
            {/* Host */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Hosted by {hostName}
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
          </Box>
          
          {/* Explanation */}
          <Typography variant="body2" color="secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
            {match.explanation || 'Recommended based on your preferences'}
          </Typography>
        </CardContent>

        <CardActions sx={{ flexDirection: 'column', gap: 1, p: 2 }}>
          {/* Join/Leave match button */}
          {user && (
            isUserHost ? (
              <Button 
                variant="contained" 
                color="secondary"
                size="small"
                fullWidth
                startIcon={<PersonIcon />}
                disabled
                sx={{ mb: 1 }}
              >
                You're Hosting
              </Button>
            ) : isJoined ? (
              <Button 
                variant="outlined" 
                color={joinStatus === 'pending' ? 'warning' : 'error'}
                size="small" 
                fullWidth
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLeaveMatch(match);
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinMatch(match);
                }}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
              >
                {isLoading ? 'Processing...' : isFull ? 'Match Full' : 'Join Match'}
              </Button>
            )
          )}
        </CardActions>
      </Card>
    );
  };
  
  // Render match card
  const renderMatchCard = (match) => {
    // Format date and time
    const { date, time } = formatDateTime(match.start_time);
    
    // Calculate spots available
    const maxParticipants = match.max_participants || 10;
    // Ensure we include the host in the count, start from 1 instead of 0 if not specified
    const currentParticipants = match.current_participants || 1;
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
            isUserHost ? (
              <Button 
                variant="contained" 
                color="secondary"
                size="small"
                fullWidth
                startIcon={<PersonIcon />}
                disabled
                sx={{ mb: 1 }}
              >
                You're Hosting
              </Button>
            ) : isJoined ? (
              <Button 
                variant="outlined" 
                color={joinStatus === 'pending' ? 'warning' : 'error'}
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
            onClick={() => navigate(`/match/${match.id}`)}
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
      
      {/* Sports filter chips */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {sportFilters.map((sport) => (
          <Chip
            key={sport.id}
            icon={sport.icon}
            label={sport.name}
            color={selectedSportFilter === sport.id ? 'primary' : 'default'}
            onClick={() => handleSportFilterChange(sport.id)}
            sx={{ mb: { xs: 1, md: 0 } }}
          />
        ))}
        
        {/* Advanced filters toggle */}
        <Chip
          icon={<FilterListIcon />}
          label="More Filters"
          color={showFilters ? 'primary' : 'default'}
          onClick={() => setShowFilters(!showFilters)}
          variant={showFilters ? 'filled' : 'outlined'}
          sx={{ ml: 'auto' }}
        />
      </Box>
      
      {/* Advanced filters panel */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Advanced Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="skill-level-label">Skill Level</InputLabel>
                <Select
                  labelId="skill-level-label"
                  id="skill-level"
                  name="skillLevel"
                  value={filters.skillLevel}
                  label="Skill Level"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="date-range-label">Date</InputLabel>
                <Select
                  labelId="date-range-label"
                  id="date-range"
                  name="dateRange"
                  value={filters.dateRange}
                  label="Date"
                  onChange={handleFilterChange}
                >
                  <MenuItem value="all">All Dates</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="tomorrow">Tomorrow</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="min-spots-label">Minimum Spots</InputLabel>
                <Select
                  labelId="min-spots-label"
                  id="min-spots"
                  name="minSpots"
                  value={filters.minSpots}
                  label="Minimum Spots"
                  onChange={handleFilterChange}
                >
                  <MenuItem value={1}>At least 1</MenuItem>
                  <MenuItem value={2}>At least 2</MenuItem>
                  <MenuItem value={3}>At least 3</MenuItem>
                  <MenuItem value={5}>At least 5</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormGroup>
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={filters.showPrivate} 
                      onChange={handleFilterChange}
                      name="showPrivate"
                    />
                  } 
                  label="Show Private Matches" 
                />
                <FormControlLabel 
                  control={
                    <Checkbox 
                      checked={filters.showFull} 
                      onChange={handleFilterChange}
                      name="showFull"
                    />
                  } 
                  label="Show Full Matches" 
                />
              </FormGroup>
            </Grid>
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              size="small" 
              onClick={handleResetFilters} 
              sx={{ mr: 1 }}
            >
              Reset Filters
            </Button>
            <Button 
              size="small" 
              variant="contained" 
              onClick={() => setShowFilters(false)}
            >
              Apply Filters
            </Button>
          </Box>
        </Paper>
      </Collapse>
      
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
            {filteredMatches.map(match => (
              <Grid item xs={12} sm={6} md={4} key={match.id}>
                {renderMatchCard(match)}
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
      
      {/* Join Match Confirmation Dialog */}
      <Dialog
        open={joinDialogOpen}
        onClose={handleJoinDialogClose}
      >
        <DialogTitle>Join Match</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to join "{selectedMatchToJoin?.title}"?
            {selectedMatchToJoin?.is_private && " This is a private match and will require an access code."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleJoinDialogClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleJoinConfirm} color="primary" variant="contained">
            Join Match
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FindGames;
