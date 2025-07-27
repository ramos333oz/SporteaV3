import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Avatar, 
  Paper, 
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Alert,
  CircularProgress,
  Skeleton,
  Tooltip
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import {
  UserAvatarWithLevel,
  AchievementCard,
  XPProgressBar
} from '../components/achievements';
import achievementService from '../services/achievementService';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SchoolIcon from '@mui/icons-material/School';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SportsIcon from '@mui/icons-material/Sports';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import TransgenderIcon from '@mui/icons-material/Transgender';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import TimerIcon from '@mui/icons-material/Timer';
import { userService, participantService, matchService, friendshipService, locationService } from '../services/supabase';
import blockingService from '../services/blockingService';
import { useToast } from '../contexts/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import BlockIcon from '@mui/icons-material/Block';

// Utility function to normalize avatar URLs
const normalizeAvatarUrl = (url) => {
  if (!url) return null;
  
  // Check if the avatar URL is already valid and accessible
  if (url.includes('/storage/v1/object/public/')) {
    return url;
  }
  
  // If it's a relative path, construct the full URL
  if (url.startsWith('/')) {
    return `https://fcwwuiitsghknsvnsrxp.supabase.co/storage/v1/object/public${url}`;
  }
  
  return url;
};

// Map sport names to their respective custom icons
const getSportIcon = (sportName) => {
  const sportIconPaths = {
    'Football': '/images/sportslectionicons/football.png',
    'Soccer': '/images/sportslectionicons/football.png',
    'Futsal': '/images/sportslectionicons/futsal.png',
    'Basketball': '/images/sportslectionicons/basketball.png',
    'Badminton': '/images/sportslectionicons/badminton.png',
    'Tennis': '/images/sportslectionicons/tennis.png',
    'Table Tennis': '/images/sportslectionicons/table-tennis.png',
    'Volleyball': '/images/sportslectionicons/volleyball.png',
    'Rugby': '/images/sportslectionicons/rugby.png',
    'Hockey': '/images/sportslectionicons/hockey.png',
    'Squash': '/images/sportslectionicons/squash.png',
    'Baseball': '/images/sportslectionicons/football.png', // Fallback
    'Boxing': '/images/sportslectionicons/football.png', // Fallback
    'Martial Arts': '/images/sportslectionicons/football.png', // Fallback
    'Gym': '/images/sportslectionicons/football.png', // Fallback
    'Running': '/images/sportslectionicons/football.png' // Fallback
  };

  const iconPath = sportIconPaths[sportName] || '/images/sportslectionicons/football.png';

  return (
    <img
      src={iconPath}
      alt={sportName}
      style={{ width: 24, height: 24 }}
    />
  );
};

// Map skill levels to colors
const getSkillLevelColor = (level) => {
  const levelColors = {
    'Beginner': 'success',
    'Intermediate': 'primary',
    'Advanced': 'secondary',
    'Professional': 'error'
  };
  
  return levelColors[level] || 'default';
};

// Time slot mapping for display
const TIME_SLOT_LABELS = {
  '9-11': '9:00 AM - 11:00 AM',
  '11-13': '11:00 AM - 1:00 PM',
  '13-15': '1:00 PM - 3:00 PM',
  '15-17': '3:00 PM - 5:00 PM',
  '17-19': '5:00 PM - 7:00 PM',
  '19-21': '7:00 PM - 9:00 PM',
  '21-23': '9:00 PM - 11:00 PM',
};

// Format time for display - handles both old format (objects) and new format (strings)
const formatTimeRange = (range) => {
  if (!range) return '';

  // New format - time slot ID
  if (typeof range === 'string' && TIME_SLOT_LABELS[range]) {
    return TIME_SLOT_LABELS[range];
  }

  // Old format - object with start/end times
  if (typeof range === 'object' && range.start && range.end) {
    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };

    return `${formatTime(range.start)} - ${formatTime(range.end)}`;
  }

  return '';
};

// Format day name
const formatDay = (day) => {
  return day.charAt(0).toUpperCase() + day.slice(1);
};

// Get gender icon based on gender string
const getGenderIcon = (gender) => {
  switch(gender?.toLowerCase()) {
    case 'male':
      return <MaleIcon sx={{ color: '#2196f3' }} />; // Blue for male
    case 'female':
      return <FemaleIcon sx={{ color: '#e91e63' }} />; // Pink for female
    case 'other':
      return <TransgenderIcon />;
    case 'prefer not to say':
      return <QuestionMarkIcon />;
    default:
      return <PersonIcon />;
  }
};

const Profile = () => {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const { showSuccessToast, showErrorToast } = useToast();
  const { userId } = useParams();
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hostedMatches, setHostedMatches] = useState([]);
  const [joinedMatches, setJoinedMatches] = useState([]);
  const [friendshipStatus, setFriendshipStatus] = useState(null);
  const [friendshipId, setFriendshipId] = useState(null);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [locations, setLocations] = useState({});
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [gamificationData, setGamificationData] = useState(null);
  const [achievementsLoading, setAchievementsLoading] = useState(false);

  // Check if viewing own profile or someone else's
  const isOwnProfile = !userId || (user && userId === user.id);
  const profileId = userId || (user ? user.id : null);

  // Fetch facility names for display
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationsData = await locationService.getLocations();
        // Convert to a lookup map for easier access
        const locationsMap = {};
        locationsData.forEach(location => {
          locationsMap[location.id] = location;
        });
        setLocations(locationsMap);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    
    fetchLocations();
  }, []);
  
  useEffect(() => {
    // Fetch profile data from Supabase
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!profileId) throw new Error('Profile ID is required');
        if (!user) throw new Error('User not authenticated');

        // Check if user can view this profile (blocking restrictions)
        if (!isOwnProfile) {
          const { canView, reason } = await blockingService.canViewProfile(user.id, profileId);
          if (!canView) {
            setError(reason || 'You cannot view this profile');
            setLoading(false);
            return;
          }
        }

        // Fetch user profile from Supabase - use the profileId (from URL), not the current user's ID
        const profileData = await userService.getProfile(profileId);
        
        // Get user data from the users table (excluding columns that don't exist)
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('available_days, available_hours, preferred_facilities, home_location, play_style, gender')
          .eq('id', profileId)
          .single();
          
        if (userDataError) {
          console.error('Error fetching user data:', userDataError);
        }
        
        // Also fetch user preferences from user_preferences table
        const { data: userPreferences, error: preferencesError } = await supabase
          .from('user_preferences')
          .select('age, duration_preference, sport_preferences, skill_level_preferences, time_preferences, location_preferences')
          .eq('user_id', profileId)
          .single();
          
        if (preferencesError && preferencesError.code !== 'PGRST116') {
          console.error('Error fetching user preferences:', preferencesError);
        }
        
        console.log('User Preferences Data:', userPreferences);
        console.log('Profile ID:', profileId);
        console.log('Current User ID:', user.id);
          
        // Transform data to match the expected format
        const formattedProfile = {
          id: profileData.id,
          fullName: profileData.username || profileData.full_name || 'UiTM Student', // Use username as primary display name
          email: profileData.email || '',
          studentId: profileData.student_id || '',
          username: profileData.username || profileData.email?.split('@')[0] || '',
          bio: profileData.bio || 'No bio available',
          avatarUrl: normalizeAvatarUrl(profileData.avatar_url),
          faculty: profileData.faculty || '',
          campus: profileData.campus || '', // Will be displayed as State
          // Parse sports preferences - will be populated after fetching sport names
          sports: [],
          // Add preference fields from userData and userPreferences
          available_days: userData?.available_days || [],
          available_hours: userData?.available_hours || {},
          preferred_facilities: userData?.preferred_facilities || [],
          home_location: userData?.home_location || null,
          play_style: userData?.play_style || 'casual',
          gender: userData?.gender || '',
          // Get age_range_preference and duration_preference from user_preferences table
          age: userPreferences?.age || '',
          duration_preference: userPreferences?.duration_preference || ''
        };

        // Process sport preferences - handle different data formats
        if (Array.isArray(profileData.sport_preferences) && profileData.sport_preferences.length > 0) {
          try {
            console.log('Processing sport preferences:', profileData.sport_preferences);

            // Check if sport preferences already have names (new format)
            const sportsWithNames = profileData.sport_preferences.filter(sport => sport.name);

            if (sportsWithNames.length > 0) {
              // New format: sports already have names and levels
              formattedProfile.sports = sportsWithNames.map((sport, index) => ({
                id: sport.id || index + 1,
                name: sport.name,
                level: sport.level || 'Beginner',
                icon: getSportIcon(sport.name)
              }));
            } else {
              // Old format: need to fetch sport names by IDs
              const sportIds = profileData.sport_preferences
                .map(sport => sport.id || sport)
                .filter(id => id);

              if (sportIds.length > 0) {
                const { data: sportsData, error: sportsError } = await supabase
                  .from('sports')
                  .select('id, name')
                  .in('id', sportIds);

                if (!sportsError && sportsData) {
                  const skillLevels = userPreferences?.skill_level_preferences || {};
                  formattedProfile.sports = sportsData.map((sport, index) => ({
                    id: index + 1,
                    name: sport.name,
                    level: skillLevels[sport.name] || 'Beginner',
                    icon: getSportIcon(sport.name)
                  }));
                }
              }
            }
          } catch (sportsErr) {
            console.error('Error processing sports data:', sportsErr);
          }
        }

        setProfile(formattedProfile);
        
        // Fetch matches hosted by the profile owner (not the current user)
        const hosted = await matchService.getHostedMatches(profileId);
        setHostedMatches(hosted || []);
        
        // Fetch matches joined by the profile owner (not the current user)
        const participants = await participantService.getUserParticipations(profileId);
        setJoinedMatches(participants || []);
        
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (profileId) {
      fetchProfile();
      fetchFriendshipStatus();
    }
  }, [profileId, user, supabase]);

  // Set up real-time subscriptions for activity updates
  useEffect(() => {
    if (!profileId) return;

    // Handle match updates (status changes, cancellations, etc.)
    const handleMatchUpdate = (event) => {
      const { matchId, status, data } = event.detail;
      console.log('[Profile] Match update received:', { matchId, status, data });

      // Update hosted matches
      setHostedMatches(prev => prev.map(match =>
        match.id === matchId ? { ...match, ...data } : match
      ));

      // Update joined matches
      setJoinedMatches(prev => prev.map(participation =>
        participation.match?.id === matchId
          ? { ...participation, match: { ...participation.match, ...data } }
          : participation
      ));
    };

    // Handle participation updates (joins, leaves, status changes)
    const handleParticipationUpdate = (event) => {
      const { matchId, userId: participantUserId, action, data } = event.detail;
      console.log('[Profile] Participation update received:', { matchId, participantUserId, action, data });

      // Only update if it affects the profile being viewed
      if (participantUserId === profileId) {
        if (action === 'joined' || action === 'confirmed') {
          // Refetch joined matches to get the latest data
          participantService.getUserParticipations(profileId)
            .then(participants => setJoinedMatches(participants || []))
            .catch(error => console.error('Error refreshing joined matches:', error));
        } else if (action === 'left' || action === 'removed') {
          // Remove the participation from joined matches
          setJoinedMatches(prev => prev.filter(p => p.match?.id !== matchId));
        }
      }
    };

    // Subscribe to real-time events
    window.addEventListener('sportea:match-update', handleMatchUpdate);
    window.addEventListener('sportea:participation', handleParticipationUpdate);

    // Cleanup subscriptions
    return () => {
      window.removeEventListener('sportea:match-update', handleMatchUpdate);
      window.removeEventListener('sportea:participation', handleParticipationUpdate);
    };
  }, [profileId]);

  // Fetch achievement data
  useEffect(() => {
    const fetchAchievements = async () => {
      if (!profileId) return;

      try {
        setAchievementsLoading(true);

        // Fetch all achievements
        const allAchievements = await achievementService.getAllAchievements();
        setAchievements(allAchievements);

        // Fetch user's achievement progress
        const userAchievementProgress = await achievementService.getUserAchievements(profileId);
        setUserAchievements(userAchievementProgress);

        // Fetch user's gamification data
        const gamification = await achievementService.getUserGamification(profileId);
        setGamificationData(gamification);

      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setAchievementsLoading(false);
      }
    };

    fetchAchievements();
  }, [profileId]);



  // Function to refresh activity data
  const refreshActivityData = async () => {
    if (!profileId) return;

    try {
      console.log('[Profile] Refreshing activity data...');

      // Fetch latest hosted matches
      const hosted = await matchService.getHostedMatches(profileId);
      setHostedMatches(hosted || []);

      // Fetch latest joined matches
      const participants = await participantService.getUserParticipations(profileId);
      setJoinedMatches(participants || []);

      console.log('[Profile] Activity data refreshed successfully');
    } catch (error) {
      console.error('[Profile] Error refreshing activity data:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);

    // Refresh activity data when Activity tab is selected
    if (newValue === 2) {
      refreshActivityData();
    }
  };
  
  // Handle navigating to match details for summary
  const handleViewMatchSummary = (matchId) => {
    navigate(`/match/${matchId}`);
  };

  // Handle deleting a past match
  const handleDeleteMatch = async (match) => {
    if (window.confirm('Are you sure you want to delete this match? This action cannot be undone and all match data will be permanently deleted.')) {
      try {
        console.log('Deleting match', match.id, `(${match.title || match.sport?.name + ' Match'})`);

        const result = await matchService.deleteMatch(match.id);

        if (!result.success) {
          throw new Error(result.message || 'Failed to delete the match');
        }

        console.log('Successfully deleted match', match.id);
        showSuccessToast('Match Deleted', 'The match has been permanently deleted');

        // Refetch data to ensure UI is synchronized with backend
        // This approach is more reliable than local state updates
        try {
          const hosted = await matchService.getHostedMatches(profileId);
          setHostedMatches(hosted || []);

          const participants = await participantService.getUserParticipations(profileId);
          setJoinedMatches(participants || []);

          console.log('Successfully refreshed match data after deletion');
        } catch (refreshError) {
          console.error('Error refreshing match data:', refreshError);
          // Fallback to local state update if refetch fails
          if (match.host_id === user.id) {
            setHostedMatches(prev => prev.filter(m => m.id !== match.id));
          } else {
            setJoinedMatches(prev => prev.filter(p => p.match?.id !== match.id));
          }
        }
      } catch (error) {
        console.error('Error deleting match:', error);
        showErrorToast('Delete Failed', error.message || 'Failed to delete the match. Please try again.');
      }
    }
  };
  
  // Function to fetch friendship status between current user and profile user
  const fetchFriendshipStatus = async () => {
    if (!profileId || !user) return;
    
    try {
      const { success, status, data } = await friendshipService.getFriendshipStatus(profileId);
      
      if (success) {
        setFriendshipStatus(status);
        if (data) {
          setFriendshipId(data.id);
        }
      }
    } catch (error) {
      console.error('Error fetching friendship status:', error);
      setError('Failed to load friendship status');
    }
  };

  // Function to handle sending friend request
  const handleSendFriendRequest = async () => {
    if (!profileId) return;
    
    setActionLoading('send-request');
    try {
      const { success, message } = await friendshipService.sendFriendRequest(profileId);
      
      if (success) {
        showSuccessToast('Friend request sent');
        // Reload friendship status
        fetchFriendshipStatus();
      } else {
        showErrorToast(message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      showErrorToast('Failed to send friend request');
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleAcceptFriendRequest = async () => {
    if (!friendshipId) return;
    
    setActionLoading('accept-request');
    try {
      const { success, message } = await friendshipService.acceptFriendRequest(friendshipId);
      
      if (success) {
        showSuccessToast('Friend request accepted');
        // Reload friendship status without navigating away
        fetchFriendshipStatus();
      } else {
        showErrorToast(message || 'Failed to accept friend request');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showErrorToast('Failed to accept friend request');
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleDeclineFriendRequest = async () => {
    if (!friendshipId) return;
    
    setActionLoading('decline-request');
    try {
      const { success, message } = await friendshipService.declineFriendRequest(friendshipId);
      
      if (success) {
        showSuccessToast('Friend request declined');
        // Reload friendship status
        fetchFriendshipStatus();
      } else {
        showErrorToast(message || 'Failed to decline friend request');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      showErrorToast('Failed to decline friend request');
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    
    setActionLoading('remove-friend');
    try {
      const { success, message } = await friendshipService.removeFriend(friendshipId);
      
      if (success) {
        showSuccessToast('Friend removed');
        // Reload friendship status
        fetchFriendshipStatus();
      } else {
        showErrorToast(message || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      showErrorToast('Failed to remove friend');
    } finally {
      setActionLoading(null);
    }
  };

  // Function to handle blocking user
  const handleBlockUser = async () => {
    if (!profileId) return;

    setActionLoading('block-user');
    try {
      const { success, message } = await friendshipService.blockUser(profileId);

      if (success) {
        showSuccessToast('User blocked successfully');
        // Navigate back to previous page or home
        navigate(-1);
      } else {
        showErrorToast(message || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      showErrorToast('Failed to block user');
    } finally {
      setActionLoading(null);
    }
  };

  // Render friendship action button based on status
  const renderFriendshipButton = () => {
    if (isOwnProfile) return null;
    
    if (friendActionLoading) {
      return (
        <Button
          variant="outlined"
          color="primary"
          disabled
          startIcon={<CircularProgress size={20} />}
        >
          Loading...
        </Button>
      );
    }
    
    switch (friendshipStatus) {
      case 'friends':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<PersonRemoveIcon />}
              onClick={handleRemoveFriend}
            >
              Remove Friend
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<BlockIcon />}
              onClick={handleBlockUser}
            >
              Block
            </Button>
          </Box>
        );
      case 'request-sent':
        return (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<HourglassEmptyIcon />}
            disabled
          >
            Request Sent
          </Button>
        );
      case 'request-received':
        return (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={handleAcceptFriendRequest}
            >
              Accept
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={handleDeclineFriendRequest}
            >
              Decline
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<BlockIcon />}
              onClick={handleBlockUser}
            >
              Block
            </Button>
          </Box>
        );
      case 'not-friends':
      default:
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={handleSendFriendRequest}
            >
              Add Friend
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<BlockIcon />}
              onClick={handleBlockUser}
            >
              Block
            </Button>
          </Box>
        );
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <Skeleton variant="circular" width={96} height={96} />
          <Skeleton variant="rectangular" width="100%" height={60} />
          <Skeleton variant="rectangular" width="100%" height={200} />
          <CircularProgress />
          <Typography>Loading profile data...</Typography>
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Container>
    );
  }
  
  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          Profile not found. Please complete your profile setup.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
              <Box sx={{ position: 'relative', mb: 4 }}>
        {isOwnProfile && (
          <IconButton 
            sx={{ position: 'absolute', top: 0, right: 0 }}
            aria-label="settings"
            onClick={() => navigate('/profile/edit')}
            title="Edit Profile"
          >
            <SettingsIcon />
          </IconButton>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <UserAvatarWithLevel
              user={{
                ...profile,
                level: gamificationData?.current_level || 1
              }}
              size={96}
              badgeSize="large"
              sx={{
                bgcolor: 'primary.main',
                fontSize: '2.5rem'
              }}
            />
          </Box>
          
          <Box>
            <Typography variant="h1" gutterBottom>
              {profile?.fullName}
              {profile?.gender && (
                <Box component="span" sx={{ ml: 1.5, verticalAlign: 'middle', display: 'inline-flex' }}>
                  {getGenderIcon(profile.gender)}
                </Box>
              )}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Student ID: {profile?.studentId || (profile?.email && profile.email.includes('@student.uitm.edu.my') ? profile.email.split('@')[0] : '')}
            </Typography>
            <Typography variant="body1" mt={1}>
              {profile?.bio}
            </Typography>

            {/* XP Progress Bar - Only show on own profile */}
            {isOwnProfile && gamificationData && (
              <Box sx={{ mt: 2, maxWidth: 300 }}>
                <XPProgressBar
                  userId={profile?.id || user?.id}
                  currentXP={gamificationData.total_xp}
                  currentLevel={gamificationData.current_level}
                  size="medium"
                  animated={true}
                />
              </Box>
            )}

            {renderFriendshipButton()}
          </Box>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 4, borderRadius: 3, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.08)', p: 1, bgcolor: 'grey.50' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 'auto',
            '& .MuiTabs-indicator': {
              display: 'none', // Remove default indicator
            },
            '& .MuiTab-root': {
              minHeight: 'auto',
              py: 1.5,
              px: 3,
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: 'text.secondary',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
              '&.Mui-selected': {
                bgcolor: 'background.paper',
                color: 'primary.main',
                fontWeight: 600,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              },
            },
          }}
        >
          <Tab label="Details" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="Achievements" icon={<EmojiEventsIcon />} iconPosition="start" />
          <Tab label="Activity" icon={<HistoryIcon />} iconPosition="start" />
        </Tabs>
        
        {/* Details Tab (Combined Profile Info and Preferences) */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              <img
                src="/images/sportslectionicons/football.png"
                alt="Sports"
                style={{ width: 24, height: 24, marginRight: 12 }}
              />
              Sports
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {profile.sports && profile.sports.length > 0 ? (
                profile.sports.map((sport) => (
                  <Grid item xs={12} sm={6} md={4} key={sport.id}>
                    <Card variant="outlined" sx={{ 
                      borderRadius: 2,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 6px 12px rgba(0,0,0,0.08)'
                      }
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                          {sport.icon}
                          </Avatar>
                          <Typography variant="h3" sx={{ ml: 1.5, fontWeight: 600 }}>
                            {sport.name}
                          </Typography>
                        </Box>
                        <Chip 
                          label={sport.level} 
                          size="small" 
                          color={getSkillLevelColor(sport.level)}
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No sports have been added to this profile yet.
                  </Alert>
                </Grid>
              )}
              {isOwnProfile && (
              <Grid item xs={12} sm={6} md={4}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 2, 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px dashed',
                    borderColor: 'primary.main',
                    cursor: 'pointer',
                      transition: 'all 0.2s',
                    '&:hover': {
                        backgroundColor: 'action.hover',
                        transform: 'scale(1.02)'
                    }
                  }}
                    onClick={() => navigate('/profile/edit')}
                >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <AddCircleOutlineIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h3" color="primary">
                      Add Sport
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 4 }} />
            
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              <SportsScoreIcon sx={{ mr: 1.5, color: 'primary.main' }} />
              Preferences
            </Typography>
            
            <Grid container spacing={3}>
              {/* Faculty Info */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ 
                  borderRadius: 2, 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
                      Faculty Information
                    </Typography>
                    <Typography variant="body1">
                      {profile.faculty || 'No faculty information provided'}
                    </Typography>
                    {profile.campus && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        State: {profile.campus}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Gender */}
              {/* <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ 
                  borderRadius: 2, 
                  height: '100%', 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                      Gender
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getGenderIcon(profile.gender)}
                      <Typography variant="body1" sx={{ ml: 1 }}>
                        {profile.gender || 'Not specified'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid> */}
              
              {/* Age Range Preference */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ 
                  borderRadius: 2, 
                  height: '100%', 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      <AccessibilityNewIcon sx={{ mr: 1, color: 'primary.main' }} />
                      Age
                    </Typography>
                    <Typography variant="body1">
                      {profile.age || 'Age not specified'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Duration Preference */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ 
                  borderRadius: 2, 
                  height: '100%', 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      <TimerIcon sx={{ mr: 1, color: 'primary.main' }} />
                      Preferred Duration
                    </Typography>
                    <Typography variant="body1">
                      {profile.duration_preference || 'No duration preference specified'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Play Style */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ 
                  borderRadius: 2, 
                  height: '100%', 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      <SportsScoreIcon sx={{ mr: 1, color: 'primary.main' }} />
                      Play Style
                    </Typography>
                    <Chip 
                      label={profile.play_style === 'casual' ? 'Casual Player' : 'Competitive Player'} 
                      color={profile.play_style === 'casual' ? 'success' : 'secondary'}
                      sx={{ fontWeight: 500 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {profile.play_style === 'casual' 
                        ? 'Plays for fun and social interaction' 
                        : 'Plays to win and improve skills'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Available Days */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ 
                  borderRadius: 2, 
                  height: '100%', 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      <CalendarMonthIcon sx={{ mr: 1, color: 'primary.main' }} />
                      Available Days
                    </Typography>
                    {profile.available_days && profile.available_days.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {profile.available_days.map(day => (
                          <Chip 
                            key={day} 
                            label={formatDay(day)} 
                            variant="outlined" 
                            size="small"
                            sx={{ borderRadius: '16px' }}
                          />
                        ))}
          </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No availability specified
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Available Hours */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ 
                  borderRadius: 2, 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      <AccessTimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                      Available Hours
                    </Typography>
                    {profile.available_days && profile.available_days.length > 0 && 
                     Object.keys(profile.available_hours || {}).length > 0 ? (
                      <Grid container spacing={2}>
                        {profile.available_days.map(day => {
                          const timeSlots = profile.available_hours[day] || [];
                          return (
                            <Grid item xs={12} sm={6} md={4} key={day}>
                              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}>
                                  {formatDay(day)}
                                </Typography>
                                {timeSlots.length > 0 ? (
                                  <Box>
                                    {timeSlots.map((slot, index) => (
                                      <Typography key={index} variant="body2">
                                        {formatTimeRange(slot)}
                                      </Typography>
                                    ))}
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    No hours specified
                                  </Typography>
                                )}
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No availability hours specified
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Preferred Facilities */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ 
                  borderRadius: 2, 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                      <LocationOnIcon sx={{ mr: 1, color: 'primary.main' }} />
                      Preferred Facilities
                    </Typography>
                    {profile.preferred_facilities && profile.preferred_facilities.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {profile.preferred_facilities.map(facilityId => {
                          const facility = locations[facilityId];
                          return (
                            <Tooltip 
                              key={facilityId} 
                              title={facility ? facility.address : ''}
                              arrow
                              placement="top"
                            >
                              <Chip 
                                label={facility ? facility.name : `Facility ${facilityId}`}
                                variant="outlined"
                                size="small"
                                icon={<LocationOnIcon />}
                                sx={{ borderRadius: '16px' }}
                              />
                            </Tooltip>
                          );
                        })}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No preferred facilities specified
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Achievements Tab with Sub-tabs */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              <EmojiEventsIcon sx={{ mr: 1.5, color: 'primary.main' }} />
              My Achievements
              {gamificationData && (
                <Chip
                  label={`Level ${gamificationData.current_level}`}
                  color="primary"
                  sx={{ ml: 2 }}
                />
              )}
            </Typography>

            {/* Achievements Display */}
            {achievementsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : achievements.length > 0 ? (
              <Grid container spacing={3}>
                {achievements.map(achievement => {
                  const userProgress = userAchievements.find(ua => ua.achievement_id === achievement.id);
                  const isUnlocked = userProgress?.is_completed || false;
                  const currentProgress = userProgress?.current_progress || 0;

                  return (
                    <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                      <AchievementCard
                        achievement={achievement}
                        userProgress={currentProgress}
                        isUnlocked={isUnlocked}
                        showProgress={true}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <EmojiEventsIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" gutterBottom color="text.secondary">
                  No Achievements Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Play matches, join events, and connect with others to earn achievements!
                </Typography>
              </Box>
            )}
          </Box>
        )}
        
        {/* Activity Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              <HistoryIcon sx={{ mr: 1.5, color: 'primary.main' }} />
              Recent Activity
            </Typography>
            
            {hostedMatches.length === 0 && joinedMatches.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                <SportsIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" gutterBottom color="text.secondary">
                  No Activity Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Join or host matches to see your activity here.
                </Typography>
              </Box>
            ) : (
              <List sx={{ 
                bgcolor: 'background.paper',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                {/* Show hosted matches */}
                {hostedMatches.map((match) => (
                  <React.Fragment key={`hosted-${match.id}`}>
                    <ListItem 
                      alignItems="flex-start"
                      sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                      secondaryAction={
                        (match.status === 'completed' || match.status === 'cancelled') && (
                          <Box>
                            <IconButton 
                              edge="end" 
                              aria-label="view" 
                              onClick={() => handleViewMatchSummary(match.id)}
                              title="View Match Summary"
                              sx={{ 
                                color: 'primary.main',
                                '&:hover': {
                                  bgcolor: 'primary.lighter'
                                }
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                            {isOwnProfile && (
                              <IconButton 
                                edge="end" 
                                aria-label="delete" 
                                onClick={() => handleDeleteMatch(match)}
                                title="Delete Match"
                                sx={{ 
                                  color: 'error.main',
                                  '&:hover': {
                                    bgcolor: 'error.lighter'
                                  }
                                }}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            )}
                          </Box>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getSportIcon(match.sport?.name)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {match.sport?.name} Match
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              {match.status === 'completed' ? 'Completed' : 
                               match.status === 'cancelled' ? 'Cancelled' : 'In Progress'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {match.start_time ? new Date(match.start_time).toLocaleDateString() :
                               match.created_at ? new Date(match.created_at).toLocaleDateString() : 'Unknown date'}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}

                {/* Show joined matches */}
                {joinedMatches.map((participation) => (
                  <React.Fragment key={`joined-${participation.id}`}>
                    <ListItem 
                      alignItems="flex-start" 
                      sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                      secondaryAction={
                        (participation.match?.status === 'completed') && (
                          <IconButton 
                            edge="end" 
                            aria-label="view" 
                            onClick={() => handleViewMatchSummary(participation.match?.id)}
                            title="View Match Summary"
                            sx={{ 
                              color: 'primary.main',
                              '&:hover': {
                                bgcolor: 'primary.lighter'
                              }
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          {getSportIcon(participation.match?.sport?.name)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Joined {participation.match?.sport?.name} Match
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography variant="body2" color="text.secondary">
                              {participation.match?.status === 'completed' ? 'Completed' : 
                               participation.match?.status === 'cancelled' ? 'Cancelled' : 'In Progress'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {participation.match?.start_time ? new Date(participation.match.start_time).toLocaleDateString() :
                               participation.joined_at ? new Date(participation.joined_at).toLocaleDateString() : 'Unknown date'}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Profile;