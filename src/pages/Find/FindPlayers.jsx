import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Card,
  CardContent,
  CardActions,
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
  Alert
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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase, friendshipService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';

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

const FindPlayers = ({ players: propPlayers }) => {
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
        const initialPlayers = propPlayers.filter(player => player.id !== user.id);
        setPlayers(initialPlayers);  // Use filtered players here instead of raw propPlayers
        setFilteredPlayers(initialPlayers);
        setLoading(false);
        
        // Re-fetch friendship statuses for all players in props
        if (initialPlayers.length > 0) {
          refreshFriendshipStatuses(initialPlayers.map(player => player.id));
        }
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
          console.log(`Friendship with ${userId}: ${status}`, friendshipInfo);
          friendshipData[userId] = { status, data: friendshipInfo };
        }
      }
      
      setFriendships(friendshipData);
    } catch (error) {
      console.error('Error refreshing friendship statuses:', error);
    }
  };

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      // Fetch all users except current user
      const { data, error } = await supabase
        .from('profiles')  // Using the correct table name 'profiles'
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          bio,
          faculty,
          campus,
          sport_preferences,
          skill_levels
        `)
        .neq('id', user.id); // Exclude current user
        
      if (error) throw error;
      
      // Double check to ensure current user is not in the results
      const filteredData = data ? data.filter(player => player.id !== user.id) : [];
      
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
      const { success, message, error } = await friendshipService.sendFriendRequest(userId);
      
      if (success) {
        showSuccessToast('Friend request sent');
        
        // Update local friendship status
        setFriendships(prev => ({
          ...prev,
          [userId]: { 
            status: 'request-sent',
            data: { requester_id: user.id, addressee_id: userId, status: 'pending' }
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
    
    // Log friendship status for debugging - can be removed after fixing the issue
    console.log(`Rendering button for user ${userId} with status: ${friendshipStatus}`, friendships[userId]);
    
    switch (friendshipStatus) {
      case 'not-friends':
        return (
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => handleSendFriendRequest(userId)}
            disabled={isActionDisabled}
            fullWidth
          >
            {isCurrentAction ? 'Sending...' : 'Add Friend'}
          </Button>
        );
        
      case 'friends':
        return (
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<PeopleIcon />}
            onClick={() => handleRemoveFriend(userId)}
            disabled={isActionDisabled}
            fullWidth
          >
            {isCurrentAction ? 'Removing...' : 'Friends'}
          </Button>
        );
        
      case 'request-sent':
        return (
          <Button 
            variant="outlined" 
            color="secondary"
            startIcon={<HourglassEmptyIcon />}
            onClick={() => handleCancelFriendRequest(userId)}
            disabled={isActionDisabled}
            fullWidth
          >
            {isCurrentAction ? 'Cancelling...' : 'Cancel Request'}
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
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No sport preferences
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
        {preferences.slice(0, 3).map((sport, index) => {
          // Ensure sport is a string, not an object
          const sportName = typeof sport === 'object' ? sport.name : sport;
          return (
            <Chip 
              key={index}
              icon={getSportIcon(sportName)}
              label={sportName}
              size="small"
              variant="outlined"
            />
          );
        })}
        {preferences.length > 3 && (
          <Chip 
            label={`+${preferences.length - 3} more`}
            size="small"
            variant="outlined"
          />
        )}
      </Box>
    );
  };

  const renderSkillLevel = (skillLevels, sport) => {
    // Handle case where sport might be an object
    const sportName = typeof sport === 'object' ? sport.name : sport;
    
    if (!skillLevels || !sportName || !skillLevels[sportName]) {
      return null;
    }
    
    const level = skillLevels[sportName];
    return (
      <Tooltip title={`${sportName} skill level: ${level}/5`}>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {sportName}:
          </Typography>
          <Rating 
            value={parseInt(level) || 0} 
            readOnly 
            size="small" 
          />
        </Box>
      </Tooltip>
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
              {filteredPlayers.map(player => (
                <Grid item xs={12} sm={6} md={4} key={player.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar 
                          src={player.avatar_url} 
                          alt={player.full_name || player.username}
                          sx={{ width: 50, height: 50 }}
                        >
                          {(player.full_name?.[0] || player.username?.[0] || '?').toUpperCase()}
                        </Avatar>
                        <Box sx={{ ml: 2 }}>
                          <Typography variant="h6" component="div" noWrap>
                            {player.full_name || player.username || 'Anonymous User'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {player.username ? `@${player.username}` : ''}
                            {player.faculty && player.campus ? ` • ${player.faculty}, ${player.campus}` : 
                             player.faculty ? ` • ${player.faculty}` : 
                             player.campus ? ` • ${player.campus}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {player.bio && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {player.bio.length > 100 ? `${player.bio.substring(0, 100)}...` : player.bio}
                        </Typography>
                      )}
                      
                      <Divider sx={{ my: 1 }} />
                      
                      {renderSportPreferences(player.sport_preferences)}
                      
                      {player.sport_preferences && 
                       player.sport_preferences.length > 0 && 
                       player.skill_levels && 
                       renderSkillLevel(player.skill_levels, player.sport_preferences[0])}
                    </CardContent>
                    
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Grid container spacing={1}>
                        <Grid item xs={7}>
                          {renderFriendshipButton(player.id)}
                        </Grid>
                        <Grid item xs={5}>
                          <Button 
                            variant="outlined"
                            onClick={() => handleViewProfile(player.id)}
                            fullWidth
                          >
                            View Profile
                          </Button>
                        </Grid>
                      </Grid>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default FindPlayers;
