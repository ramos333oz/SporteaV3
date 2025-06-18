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
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
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
import { useToast } from '../contexts/ToastContext';
import { useNavigate, useParams } from 'react-router-dom';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';

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

// Map sport names to their respective icons
const getSportIcon = (sportName) => {
  const sportIcons = {
    'Football': <SportsSoccerIcon />,
    'Soccer': <SportsSoccerIcon />,
    'Basketball': <SportsBasketballIcon />,
    'Badminton': <SportsTennisIcon />,
    'Tennis': <SportsTennisIcon />,
    'Volleyball': <SportsVolleyballIcon />,
    'Baseball': <SportsBaseballIcon />,
    'Boxing': <SportsMmaIcon />,
    'Martial Arts': <SportsMmaIcon />,
    'Gym': <FitnessCenterIcon />,
    'Running': <DirectionsRunIcon />
  };
  
  return sportIcons[sportName] || <SportsSoccerIcon />;
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

// Format time for display
const formatTimeRange = (range) => {
  if (!range) return '';
  
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  return `${formatTime(range.start)} - ${formatTime(range.end)}`;
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
  const [achievements, setAchievements] = useState([
    { id: 1, title: 'First Match', description: 'Participated in first match', icon: <EmojiEventsIcon /> },
    { id: 2, title: 'Match Host', description: 'Successfully hosted a match', icon: <EmojiEventsIcon /> },
    { id: 3, title: 'Social Butterfly', description: 'Made 5+ friends on Sportea', icon: <EmojiEventsIcon /> }
  ]);
  
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
          fullName: profileData.full_name || profileData.username || 'UiTM Student',
          email: profileData.email || '',
          studentId: profileData.student_id || '',
          username: profileData.username || profileData.email?.split('@')[0] || '',
          bio: profileData.bio || 'No bio available',
          avatarUrl: normalizeAvatarUrl(profileData.avatar_url),
          faculty: profileData.faculty || '',
          campus: profileData.campus || '', // Will be displayed as State
          // Parse sports preferences or default to empty array
          sports: Array.isArray(profileData.sport_preferences) 
            ? profileData.sport_preferences.map((sport, index) => ({
                id: index + 1,
                name: sport.name,
                level: sport.level || 'Beginner',
                icon: getSportIcon(sport.name)
              }))
            : [],
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
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle navigating to match details for summary
  const handleViewMatchSummary = (matchId) => {
    navigate(`/match/${matchId}`);
  };

  // Handle deleting a past match
  const handleDeleteMatch = async (match) => {
    if (window.confirm('Are you sure you want to delete this match? This action cannot be undone and all match data will be permanently deleted.')) {
      try {
        const result = await matchService.deleteMatch(match.id);
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to delete the match');
        }
        
        showSuccessToast('Match Deleted', 'The match has been permanently deleted');
        
        // Update state to remove the deleted match
        if (match.host_id === user.id) {
          setHostedMatches(prev => prev.filter(m => m.id !== match.id));
        } else {
          setJoinedMatches(prev => prev.filter(p => p.match?.id !== match.id));
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
          <Button
            variant="outlined"
            color="error"
            startIcon={<PersonRemoveIcon />}
            onClick={handleRemoveFriend}
          >
            Remove Friend
          </Button>
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
          <Box sx={{ display: 'flex', gap: 1 }}>
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
          </Box>
        );
      case 'not-friends':
      default:
        return (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={handleSendFriendRequest}
          >
            Add Friend
          </Button>
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
            <Avatar 
              sx={{ 
                width: 96, 
                height: 96, 
                bgcolor: 'primary.main',
                fontSize: '2.5rem'
              }}
              src={profile?.avatarUrl}
            >
              {profile?.fullName?.charAt(0) || 'U'}
            </Avatar>
            {isOwnProfile && (
            <IconButton
              size="small"
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'background.paper',
                }
              }}
                onClick={() => navigate('/profile/edit')}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            )}
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
            {renderFriendshipButton()}
          </Box>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 4, borderRadius: 3, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              fontWeight: 600,
              py: 1.5
            }
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
              <SportsSoccerIcon sx={{ mr: 1.5, color: 'primary.main' }} />
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
        
        {/* Achievements Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              <EmojiEventsIcon sx={{ mr: 1.5, color: 'primary.main' }} />
              Achievements
            </Typography>
            
            {achievements.length > 0 ? (
              <Grid container spacing={2}>
                {achievements.map(achievement => (
                  <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                    <Card 
                      sx={{ 
                        borderRadius: 3, 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.12)'
                        }
                      }}
                    >
                      <Box sx={{ 
                        bgcolor: 'primary.main', 
                        p: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <Avatar 
                          sx={{ 
                            width: 60, 
                            height: 60, 
                            bgcolor: 'background.paper',
                            color: 'primary.main',
                          }}
                        >
                          {achievement.icon}
                      </Avatar>
                      </Box>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                          {achievement.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {achievement.description}
                          </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
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
                              {new Date(match.created_at).toLocaleDateString()}
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
                              {participation.created_at ? new Date(participation.created_at).toLocaleDateString() : 'Unknown date'}
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