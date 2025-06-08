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
  Skeleton
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
import { userService, participantService, matchService, friendshipService } from '../services/supabase';
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
  
  // Check if viewing own profile or someone else's
  const isOwnProfile = !userId || (user && userId === user.id);
  const profileId = userId || (user ? user.id : null);
  
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
          campus: profileData.campus || '',
          // Parse sports preferences or default to empty array
          sports: Array.isArray(profileData.sport_preferences) 
            ? profileData.sport_preferences.map((sport, index) => ({
                id: index + 1,
                name: sport.name,
                level: sport.level || 'Beginner',
                icon: getSportIcon(sport.name)
              }))
            : []
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
  }, [profileId, user]);
  
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
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Box>
            <Typography variant="h1" gutterBottom>
              {profile?.fullName}
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
      
      <Paper sx={{ mb: 4, borderRadius: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Sports" />
          <Tab label="Achievements" />
          <Tab label="Activity" />
        </Tabs>
        
        {/* Sports Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2}>
              {profile.sports && profile.sports.length > 0 ? (
                profile.sports.map((sport) => (
                  <Grid item xs={12} sm={6} md={4} key={sport.id}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {sport.icon}
                          <Typography variant="h3" sx={{ ml: 1 }}>
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
                    You haven't added any sports to your profile yet.
                  </Alert>
                </Grid>
              )}
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
                    backgroundColor: 'secondary.main',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'secondary.light',
                    }
                  }}
                >
                  <CardContent>
                    <Typography variant="h3" color="primary" align="center">
                      Add Sport
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Achievements Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            {/* This is a placeholder for real achievements - we'll implement this in a future task */}
            <Alert severity="info" sx={{ mb: 3 }}>
              Achievements feature is coming soon! This will track your sports milestones.
            </Alert>
            
            <List>
              {/* Show some placeholder achievements */}
              {[
                { id: 1, name: 'First Match', description: 'Join your first match', date: new Date() },
                { id: 2, name: 'Host Master', description: 'Host 5 successful matches', date: new Date() },
                { id: 3, name: 'Team Player', description: 'Join 10 different teams', date: new Date() }
              ].map((achievement) => (
                <React.Fragment key={achievement.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <EmojiEventsIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={achievement.name}
                      secondary={
                        <>
                          <Typography
                            sx={{ display: 'inline' }}
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {achievement.description}
                          </Typography>
                          {` — Coming soon`}
                        </>
                      }
                    />
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          </Box>
        )}
        
        {/* Activity Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Recent Activity</Typography>
            
            {hostedMatches.length === 0 && joinedMatches.length === 0 ? (
              <Alert severity="info">
                No recent activity. Join or host matches to see them here.
              </Alert>
            ) : (
              <List>
                {/* Show hosted matches */}
                {hostedMatches.map((match) => (
                  <React.Fragment key={`hosted-${match.id}`}>
                    <ListItem 
                      alignItems="flex-start"
                      secondaryAction={
                        (match.status === 'completed' || match.status === 'cancelled') && (
                          <Box>
                            <IconButton 
                              edge="end" 
                              aria-label="view" 
                              onClick={() => handleViewMatchSummary(match.id)}
                              title="View Match Summary"
                            >
                              <VisibilityIcon />
                            </IconButton>
                            {isOwnProfile && (
                              <IconButton 
                                edge="end" 
                                aria-label="delete" 
                                onClick={() => handleDeleteMatch(match)}
                                title="Delete Match"
                                sx={{ color: 'error.main' }}
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
                        primary={`${match.sport?.name} Match`}
                        secondary={`${match.status === 'completed' ? 'Completed' : match.status === 'cancelled' ? 'Cancelled' : 'In Progress'}`}
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