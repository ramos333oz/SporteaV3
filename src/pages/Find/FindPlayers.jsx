import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Avatar,
  Button,
  Chip,
  Skeleton,
  Divider,
  Rating,
  Tooltip,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Snackbar,
  Alert,
  IconButton,
  Badge
} from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SchoolIcon from '@mui/icons-material/School';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase, friendshipService } from '../../services/supabase';
import blockingService from '../../services/blockingService';
import { useToast } from '../../contexts/ToastContext';

// Admin account emails to filter out
const ADMIN_EMAILS = [
  'sporteadmin@gmail.com',
  'admin@sportea.com',
  'administrator@sportea.com'
];

/**
 * Helper function to resolve sport names from different data structures
 * Matches the pattern used in InstagramStyleUserCard
 */
const resolveSportName = (sport) => {
  // Handle string sports
  if (typeof sport === 'string') {
    // Check if it's a UUID string that needs mapping
    const sportIdMap = {
      '4746e9c1-f772-4515-8d08-6c28563fbfc9': 'Football',
      'dd400853-7ce6-47bc-aee6-2ee241530f79': 'Basketball',
      'd662bc78-9e50-4785-ac71-d1e591e4a9ce': 'Futsal',
      '66e9893a-2be7-47f0-b7d3-d7191901dd77': 'Volleyball',
      '9a304214-6c57-4c33-8c5f-3f1955b63caf': 'Tennis',
      '845d3461-42fc-45c2-a403-8efcaf237c17': 'Table Tennis',
      'badminton': 'Badminton',
      'squash': 'Squash'
    };
    return sportIdMap[sport] || sport; // Return mapped name or original string
  }

  // Handle objects with name property
  if (sport && sport.name) return sport.name;

  // Handle legacy integer IDs (fallback)
  if (sport && typeof sport.id === 'number') {
    const legacySportMap = {
      1: 'Football',
      2: 'Basketball',
      3: 'Futsal',
      4: 'Badminton',
      5: 'Volleyball',
      6: 'Tennis'
    };
    return legacySportMap[sport.id] || 'Unknown Sport';
  }

  // Handle UUID-based sport IDs (current system)
  if (sport && sport.id) {
    const sportIdMap = {
      '4746e9c1-f772-4515-8d08-6c28563fbfc9': 'Football',
      'dd400853-7ce6-47bc-aee6-2ee241530f79': 'Basketball',
      'd662bc78-9e50-4785-ac71-d1e591e4a9ce': 'Futsal',
      '66e9893a-2be7-47f0-b7d3-d7191901dd77': 'Volleyball',
      '9a304214-6c57-4c33-8c5f-3f1955b63caf': 'Tennis',
      '845d3461-42fc-45c2-a403-8efcaf237c17': 'Table Tennis'
    };
    return sportIdMap[sport.id] || 'Unknown Sport';
  }

  return 'Unknown Sport';
};

/**
 * Helper function to resolve faculty/campus names from IDs
 */
const resolveFacultyName = (faculty) => {
  if (!faculty) return null;

  // If it's already a readable name, return it
  if (typeof faculty === 'string' && !faculty.includes('-')) {
    return faculty;
  }

  // Map common faculty IDs to names (add more as needed)
  const facultyIdMap = {
    'computer-science': 'Computer Science',
    'engineering': 'Engineering',
    'business': 'Business Administration',
    'medicine': 'Medicine',
    'law': 'Law',
    'education': 'Education'
  };

  return facultyIdMap[faculty] || faculty;
};

/**
 * Helper function to resolve campus names from IDs
 */
const resolveCampusName = (campus) => {
  if (!campus) return null;

  // If it's already a readable name, return it
  if (typeof campus === 'string' && !campus.includes('-')) {
    return campus;
  }

  // Map common campus IDs to names (add more as needed)
  const campusIdMap = {
    'shah-alam': 'Shah Alam',
    'puncak-alam': 'Puncak Alam',
    'selangor': 'Selangor',
    'kuala-lumpur': 'Kuala Lumpur',
    'johor': 'Johor',
    'penang': 'Penang'
  };

  return campusIdMap[campus] || campus;
};

// Sport icon mapping function
const getSportIcon = (sportName) => {
  const sportIcons = {
    'Basketball': <i className="fa-solid fa-basketball"></i>,
    'Football': <i className="fa-solid fa-futbol"></i>,
    'Volleyball': <i className="fa-solid fa-volleyball"></i>,
    'Tennis': <i className="fa-solid fa-tennis-ball"></i>,
    'Badminton': <i className="fa-solid fa-shuttlecock"></i>,
    'Swimming': <i className="fa-solid fa-person-swimming"></i>,
    'Running': <i className="fa-solid fa-person-running"></i>,
    'Cycling': <i className="fa-solid fa-bicycle"></i>,
    'Table Tennis': <i className="fa-solid fa-table-tennis-paddle-ball"></i>,
    'Rugby': <i className="fa-solid fa-football"></i>
  };
  
  return sportIcons[sportName] || <i className="fa-solid fa-baseball"></i>;
};

const FindPlayers = React.memo(({ players: propPlayers }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccessToast, showErrorToast } = useToast();
  const [players, setPlayers] = useState(propPlayers || []);
  const [filteredPlayers, setFilteredPlayers] = useState(propPlayers || []);
  const [loading, setLoading] = useState(!propPlayers);
  const [friendships, setFriendships] = useState({});
  const [actionInProgress, setActionInProgress] = useState(null);
  const [sportFilter, setSportFilter] = useState('all');
  const [availableSports, setAvailableSports] = useState([]);

  useEffect(() => {
    if (user) {
      // Only fetch players if propPlayers is not provided
      if (!propPlayers) {
        fetchPlayers();
      } else {
        // Set players and initial filtered players
        const handlePropPlayers = async () => {
          setLoading(true);
          try {
            let initialPlayers = propPlayers.filter(player =>
              player.id !== user.id && !isAdminUser(player.email)
            );

            // Filter out blocked users
            initialPlayers = await blockingService.filterBlockedUsers(initialPlayers, user.id);

            setPlayers(initialPlayers);
            setFilteredPlayers(initialPlayers);

            // Re-fetch friendship statuses for all players in props
            if (initialPlayers.length > 0) {
              refreshFriendshipStatuses(initialPlayers.map(player => player.id));
            }
          } catch (error) {
            console.error('Error filtering prop players:', error);
          } finally {
            setLoading(false);
          }
        };

        handlePropPlayers();
      }
      fetchSports();
    }
  }, [user, propPlayers]);

  // Fetch available sports for filtering
  const fetchSports = async () => {
    try {
      const { data, error } = await supabase
        .from('sports')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      setAvailableSports(data || []);
    } catch (error) {
      console.error('Error fetching sports:', error);
      showErrorToast('Failed to load sports');
    }
  };

  // Helper to refresh friendship statuses for specific users
  const refreshFriendshipStatuses = async (userIds) => {
    try {
      const friendshipData = { ...friendships };
      
      for (const userId of userIds) {
        if (userId !== user.id) { // Skip current user
          const { status, data: friendshipInfo } = await friendshipService.getFriendshipStatus(userId);
          // Production logging optimization: Temporarily disable all logging for performance testing
          // if (import.meta.env.DEV) {
          //   console.log(`Friendship with ${userId}: ${status}`, friendshipInfo);
          // }
          friendshipData[userId] = { status, data: friendshipInfo };
        }
      }
      
      setFriendships(friendshipData);
    } catch (error) {
      console.error('Error refreshing friendship statuses:', error);
    }
  };

  // Helper function to check if user is admin
  const isAdminUser = (email) => {
    return ADMIN_EMAILS.includes(email?.toLowerCase());
  };

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      // Fetch all users except current user and admin accounts
      const { data, error } = await supabase
        .from('users')  // Using the correct table name 'users'
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          bio,
          faculty,
          campus,
          sport_preferences,
          skill_levels,
          email
        `)
        .neq('id', user.id) // Exclude current user
        .not('email', 'in', `(${ADMIN_EMAILS.map(email => `"${email}"`).join(',')})`); // Exclude admin accounts

      if (error) throw error;

      // Double check to ensure current user and admin accounts are not in the results
      let filteredData = data ? data.filter(player =>
        player.id !== user.id && !isAdminUser(player.email)
      ) : [];

      // Filter out blocked users (both users blocked by current user and users who blocked current user)
      filteredData = await blockingService.filterBlockedUsers(filteredData, user.id);

      // Fetch friendship statuses for all users
      if (filteredData && filteredData.length > 0) {
        const userIds = filteredData.map(player => player.id);
        await refreshFriendshipStatuses(userIds);
      }

      setPlayers(filteredData);
      setFilteredPlayers(filteredData);
    } catch (error) {
      console.error('Error fetching players:', error);
      showErrorToast('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const handleSendFriendRequest = async (userId) => {
    setActionInProgress(userId);
    try {
      const { success, message, data, error } = await friendshipService.sendFriendRequest(userId);

      if (success) {
        showSuccessToast('Friend request sent');

        // Update local friendship status with the actual data returned from the service
        setFriendships(prev => ({
          ...prev,
          [userId]: {
            status: 'request-sent',
            data: data // Use the actual friendship data which includes the ID
          }
        }));
      } else {
        showErrorToast(message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      showErrorToast('Failed to send friend request');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelFriendRequest = async (userId) => {
    setActionInProgress(userId);
    try {
      // Get the friendship ID
      const friendshipId = friendships[userId]?.data?.id;
      
      if (!friendshipId) {
        showErrorToast('Friendship not found');
        return;
      }
      
      const { success, error } = await friendshipService.removeFriend(friendshipId);
      
      if (success) {
        showSuccessToast('Friend request cancelled');
        
        // Update local friendship status
        setFriendships(prev => ({
          ...prev,
          [userId]: { status: 'not-friends', data: null }
        }));
      } else {
        showErrorToast('Failed to cancel friend request');
      }
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      showErrorToast('Failed to cancel friend request');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveFriend = async (userId) => {
    setActionInProgress(userId);
    try {
      // Get the friendship ID
      const friendshipId = friendships[userId]?.data?.id;
      
      if (!friendshipId) {
        showErrorToast('Friendship not found');
        return;
      }
      
      const { success, error } = await friendshipService.removeFriend(friendshipId);
      
      if (success) {
        showSuccessToast('Friend removed');
        
        // Update local friendship status
        setFriendships(prev => ({
          ...prev,
          [userId]: { status: 'not-friends', data: null }
        }));
      } else {
        showErrorToast('Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      showErrorToast('Failed to remove friend');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAcceptFriendRequest = async (userId) => {
    setActionInProgress(userId);
    try {
      // Get the friendship ID
      const friendshipId = friendships[userId]?.data?.id;
      
      if (!friendshipId) {
        showErrorToast('Friendship not found');
        return;
      }
      
      const { success, error } = await friendshipService.acceptFriendRequest(friendshipId);
      
      if (success) {
        showSuccessToast('Friend request accepted');
        
        // Update local friendship status
        setFriendships(prev => ({
          ...prev,
          [userId]: { 
            status: 'friends',
            data: { 
              ...prev[userId].data,
              status: 'accepted'
            }
          }
        }));
      } else {
        showErrorToast('Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showErrorToast('Failed to accept friend request');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeclineFriendRequest = async (userId) => {
    setActionInProgress(userId);
    try {
      // Get the friendship ID
      const friendshipId = friendships[userId]?.data?.id;
      
      if (!friendshipId) {
        showErrorToast('Friendship not found');
        return;
      }
      
      const { success, error } = await friendshipService.declineFriendRequest(friendshipId);
      
      if (success) {
        showSuccessToast('Friend request declined');
        
        // Update local friendship status
        setFriendships(prev => ({
          ...prev,
          [userId]: { status: 'not-friends', data: null }
        }));
      } else {
        showErrorToast('Failed to decline friend request');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      showErrorToast('Failed to decline friend request');
    } finally {
      setActionInProgress(null);
    }
  };

  const renderFriendshipButton = (userId) => {
    const isActionDisabled = actionInProgress !== null;
    const isCurrentAction = actionInProgress === userId;
    
    // Check if this is current user (shouldn't happen, but just in case)
    if (userId === user.id) {
      return (
        <Button 
          variant="outlined"
          color="primary"
          disabled={true}
          fullWidth
        >
          This is you
        </Button>
      );
    }
    
    // Get friendship status and handle missing data safely
    const friendshipStatus = friendships[userId]?.status || 'not-friends';

    // Production logging optimization: Only log in development when debugging
    if (import.meta.env.DEV && false) { // Set to true only when debugging friendship issues
      console.log(`Rendering button for user ${userId} with status: ${friendshipStatus}`, friendships[userId]);
    }
    
    switch (friendshipStatus) {
      case 'not-friends':
        return (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => handleSendFriendRequest(userId)}
            disabled={isActionDisabled}
            size="small"
            sx={{
              flex: 1,
              backgroundColor: '#dc2626',
              color: 'white',
              fontSize: '0.8rem',
              py: 0.8,
              minHeight: '32px',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { backgroundColor: '#b91c1c' },
              '&:disabled': { backgroundColor: '#9ca3af' }
            }}
          >
            {isCurrentAction ? 'Sending...' : 'Add Friend'}
          </Button>
        );

      case 'friends':
        return (
          <Button
            variant="outlined"
            startIcon={<CheckCircleIcon />}
            onClick={() => handleRemoveFriend(userId)}
            disabled={isActionDisabled}
            size="small"
            sx={{
              flex: 1,
              borderColor: '#4caf50',
              color: '#4caf50',
              fontSize: '0.8rem',
              py: 0.8,
              minHeight: '32px',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                borderColor: '#388e3c',
                backgroundColor: 'rgba(76, 175, 80, 0.04)',
                color: '#388e3c',
              },
              '&:disabled': {
                borderColor: 'rgba(76, 175, 80, 0.3)',
                color: 'rgba(76, 175, 80, 0.3)',
              }
            }}
          >
            {isCurrentAction ? 'Removing...' : 'Friends'}
          </Button>
        );

      case 'request-sent':
        return (
          <Button
            variant="outlined"
            startIcon={<HourglassEmptyIcon />}
            onClick={() => handleCancelFriendRequest(userId)}
            disabled={isActionDisabled}
            size="small"
            sx={{
              flex: 1,
              borderColor: '#ff9800',
              color: '#ff9800',
              fontSize: '0.8rem',
              py: 0.8,
              minHeight: '32px',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                borderColor: '#f57c00',
                backgroundColor: 'rgba(255, 152, 0, 0.04)',
                color: '#f57c00',
              },
              '&:disabled': {
                borderColor: 'rgba(255, 152, 0, 0.3)',
                color: 'rgba(255, 152, 0, 0.3)',
              }
            }}
          >
            {isCurrentAction ? 'Cancelling...' : 'Pending'}
          </Button>
        );
        
      case 'request-received':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<CheckIcon />}
              onClick={() => handleAcceptFriendRequest(userId)}
              disabled={isActionDisabled}
              sx={{ flex: 1 }}
            >
              {isCurrentAction ? '...' : 'Accept'}
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => handleDeclineFriendRequest(userId)}
              disabled={isActionDisabled}
              sx={{ flex: 1 }}
            >
              {isCurrentAction ? '...' : 'Decline'}
            </Button>
          </Box>
        );
        
      case 'blocked-by-me':
        return (
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<BlockIcon />}
            disabled={true}
            fullWidth
          >
            Blocked
          </Button>
        );
        
      default:
        return (
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => handleSendFriendRequest(userId)}
            disabled={isActionDisabled}
            fullWidth
          >
            Add Friend
          </Button>
        );
    }
  };

  // Update players when propPlayers changes
  useEffect(() => {
    if (propPlayers) {
      // Filter out current user first
      const filteredPropPlayers = propPlayers.filter(player => player.id !== user.id);
      
      // Set players from props
      setPlayers(filteredPropPlayers);
      // Apply filters
      filterPlayers('', sportFilter);
      
      // Refresh friendship statuses for players from props
      if (filteredPropPlayers.length > 0) {
        const userIds = filteredPropPlayers.map(player => player.id);
        refreshFriendshipStatuses(userIds);
      }
    }
  }, [propPlayers, sportFilter, user?.id]);

  // Filter players based on sport filter only (search handled by parent)
  const filterPlayers = (search, sport) => {
    if (!players || players.length === 0) return;
    
    let filtered = [...players];
    
    // Filter out current user in case they're in the data
    filtered = filtered.filter(player => player.id !== user.id);
    
    // Apply sport filter
    if (sport && sport !== 'all') {
      filtered = filtered.filter(player => 
        player.sport_preferences && 
        Array.isArray(player.sport_preferences) && 
        player.sport_preferences.some(playerSport => {
          // Handle case where playerSport might be an object or string
          if (typeof playerSport === 'object' && playerSport.name) {
            return playerSport.name === sport;
          }
          return playerSport === sport;
        })
      );
    }
    
    setFilteredPlayers(filtered);
  };

  const handleSportFilterChange = (e) => {
    setSportFilter(e.target.value);
    filterPlayers('', e.target.value);
  };

  // Render player's sport preferences as chips
  const renderSportPreferences = (preferences) => {
    if (!preferences || !Array.isArray(preferences) || preferences.length === 0) {
      return (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          borderRadius: 2,
          backgroundColor: 'rgba(211, 47, 47, 0.05)',
          border: '1px dashed rgba(211, 47, 47, 0.2)'
        }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontStyle: 'italic'
            }}
          >
            No sports selected yet
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: '#d32f2f',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            mb: 1,
            display: 'block'
          }}
        >
          Sports ({preferences.length})
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
          {preferences.slice(0, 3).map((sport, index) => {
            // Ensure sport is a string, not an object
            const sportName = typeof sport === 'object' ? sport.name : sport;
            return (
              <Chip
                key={index}
                icon={getSportIcon(sportName)}
                label={sportName}
                size="small"
                sx={{
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  color: '#d32f2f',
                  fontWeight: 500,
                  border: '1px solid rgba(211, 47, 47, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(211, 47, 47, 0.15)',
                  }
                }}
              />
            );
          })}
          {preferences.length > 3 && (
            <Chip
              label={`+${preferences.length - 3}`}
              size="small"
              sx={{
                backgroundColor: 'rgba(158, 158, 158, 0.1)',
                color: '#666',
                fontWeight: 500,
                border: '1px solid rgba(158, 158, 158, 0.2)'
              }}
            />
          )}
        </Box>
      </Box>
    );
  };

  const renderSkillLevel = (skillLevels, sport) => {
    // Handle case where sport might be an object
    const sportName = resolveSportName(sport);

    if (!skillLevels || !sportName || !skillLevels[sportName]) {
      return null;
    }

    const level = parseInt(skillLevels[sportName]) || 0;
    const skillLabels = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert'];
    const skillLabel = skillLabels[level - 1] || 'Unrated';

    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1,
        borderRadius: 2,
        backgroundColor: 'var(--accent)',
        border: '1px solid var(--border)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'var(--foreground)',
              fontSize: '0.75rem'
            }}
          >
            {sportName}
          </Typography>
          <Chip
            label={skillLabel}
            size="small"
            sx={{
              height: 18,
              backgroundColor: level >= 4 ? 'var(--chart-1)' : level >= 3 ? 'var(--chart-4)' : 'var(--chart-2)',
              color: 'var(--primary-foreground)',
              fontWeight: 500,
              fontSize: '0.65rem',
              '& .MuiChip-label': { px: 0.5 }
            }}
          />
        </Box>
        <Rating
          value={level}
          readOnly
          size="small"
          icon={<StarIcon sx={{ color: '#dc2626', fontSize: '0.9rem' }} />}
          emptyIcon={<StarIcon sx={{ color: 'rgba(220, 38, 38, 0.2)', fontSize: '0.9rem' }} />}
        />
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Find Players
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="sport-filter-label">
                <FilterListIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Filter by Sport
              </InputLabel>
              <Select
                labelId="sport-filter-label"
                value={sportFilter}
                onChange={handleSportFilterChange}
                label="Filter by Sport"
              >
                <MenuItem value="all">All Sports</MenuItem>
                {availableSports.map(sport => (
                  <MenuItem key={sport.id} value={sport.name}>
                    {getSportIcon(sport.name)}
                    <span style={{ marginLeft: '8px' }}>{sport.name}</span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Skeleton variant="circular" width={50} height={50} />
                    <Box sx={{ ml: 2 }}>
                      <Skeleton variant="text" width={120} />
                      <Skeleton variant="text" width={80} />
                    </Box>
                  </Box>
                  <Skeleton variant="text" />
                  <Skeleton variant="rectangular" height={60} sx={{ mt: 1 }} />
                </CardContent>
                <CardActions>
                  <Skeleton variant="rectangular" height={36} width="100%" />
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {filteredPlayers.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                No players found matching your criteria
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                Try adjusting your search or filters
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredPlayers.map(player => {
                // Extract player information with proper name resolution
                const {
                  full_name,
                  username,
                  avatar_url,
                  faculty,
                  campus,
                  sport_preferences = [],
                  skill_levels,
                  bio
                } = player;

                const displayName = full_name || username || 'Unknown User';
                const resolvedFaculty = resolveFacultyName(faculty);
                const resolvedCampus = resolveCampusName(campus);
                const topSports = (sport_preferences || []).slice(0, 2);

                return (
                  <Grid item xs={12} sm={6} md={4} key={player.id}>
                    <Card
                      sx={{
                        width: '100%',
                        height: 380,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: 'var(--card)',
                        color: 'var(--card-foreground)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        transition: 'all 0.3s ease',
                        boxShadow: 'var(--shadow-sm)',
                        '&:hover': {
                          boxShadow: 'var(--shadow-lg)',
                          transform: 'scale(1.02)'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* User Avatar and Basic Info */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ position: 'relative', mb: 1.5 }}>
                            <Avatar
                              src={avatar_url}
                              onClick={() => handleViewProfile(player.id)}
                              sx={{
                                width: 80,
                                height: 80,
                                border: '2px solid var(--border)',
                                cursor: 'pointer',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                backgroundColor: 'var(--accent)',
                                color: 'var(--primary)',
                                '&:hover': {
                                  borderColor: 'var(--primary)'
                                }
                              }}
                            >
                              {displayName.charAt(0).toUpperCase()}
                            </Avatar>

                            {/* Sports Count Badge */}
                            {(sport_preferences || []).length > 0 && (
                              <Chip
                                label={(sport_preferences || []).length}
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  bottom: -2,
                                  right: -2,
                                  width: 24,
                                  height: 24,
                                  backgroundColor: 'var(--primary)',
                                  color: 'var(--primary-foreground)',
                                  fontSize: '0.7rem',
                                  fontWeight: 'bold',
                                  '& .MuiChip-label': { px: 0 }
                                }}
                              />
                            )}
                          </Box>

                          <Typography
                            variant="h6"
                            onClick={() => handleViewProfile(player.id)}
                            sx={{
                              color: 'var(--foreground)',
                              textAlign: 'center',
                              lineHeight: 1.2,
                              mb: 0.5,
                              cursor: 'pointer',
                              '&:hover': { color: 'var(--primary)' }
                            }}
                          >
                            {displayName}
                          </Typography>

                          {username && full_name && (
                            <Typography variant="caption" sx={{
                              color: 'var(--muted-foreground)',
                              mb: 1,
                              fontSize: '0.8rem'
                            }}>
                              @{username}
                            </Typography>
                          )}
                        </Box>

                        {/* User Details */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, fontSize: '0.8rem' }}>
                          {/* Bio */}
                          {bio && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'var(--muted-foreground)',
                                fontSize: '0.8rem',
                                fontStyle: 'italic',
                                textAlign: 'center',
                                mb: 1,
                                lineHeight: 1.3
                              }}
                            >
                              "{bio.length > 60 ? `${bio.substring(0, 60)}...` : bio}"
                            </Typography>
                          )}

                          {/* Faculty/Campus */}
                          {resolvedFaculty && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--muted-foreground)' }}>
                              <SchoolIcon sx={{ fontSize: 14, color: 'var(--primary)' }} />
                              <Typography variant="caption" sx={{
                                fontSize: '0.8rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {resolvedFaculty}
                              </Typography>
                            </Box>
                          )}

                          {resolvedCampus && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--muted-foreground)' }}>
                              <LocationOnIcon sx={{ fontSize: 14, color: 'var(--primary)' }} />
                              <Typography variant="caption" sx={{
                                fontSize: '0.8rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {resolvedCampus}
                              </Typography>
                            </Box>
                          )}

                          {/* Sports Preferences */}
                          {topSports.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--muted-foreground)' }}>
                              <StarIcon sx={{ fontSize: 14, color: 'var(--primary)' }} />
                              <Typography variant="caption" sx={{
                                fontSize: '0.8rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {topSports.map(sport => resolveSportName(sport)).join(', ')}
                              </Typography>
                            </Box>
                          )}

                          {/* Skill Level for Primary Sport */}
                          {(sport_preferences || []).length > 0 && skill_levels && (
                            <Box sx={{ mt: 1 }}>
                              {renderSkillLevel(skill_levels, (sport_preferences || [])[0])}
                            </Box>
                          )}
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          {renderFriendshipButton(player.id)}
                          <Button
                            onClick={() => handleViewProfile(player.id)}
                            variant="outlined"
                            size="small"
                            sx={{
                              flex: 1,
                              borderColor: 'var(--border)',
                              color: 'var(--primary)',
                              fontSize: '0.8rem',
                              py: 0.8,
                              minHeight: '32px',
                              textTransform: 'none',
                              fontWeight: 500,
                              '&:hover': {
                                backgroundColor: 'var(--accent)',
                                borderColor: 'var(--primary)'
                              }
                            }}
                          >
                            View Profile
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo optimization
  // Only re-render if players data actually changed
  return prevProps.players === nextProps.players;
});

// Set display name for debugging
FindPlayers.displayName = 'FindPlayers';

export default FindPlayers;
