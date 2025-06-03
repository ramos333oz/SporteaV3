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
import { userService, participantService, matchService } from '../services/supabase';

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
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hostedMatches, setHostedMatches] = useState([]);
  const [joinedMatches, setJoinedMatches] = useState([]);
  
  useEffect(() => {
    // Fetch profile data from Supabase
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!user?.id) throw new Error('User not authenticated');
        
        // Fetch user profile from Supabase
        const profileData = await userService.getProfile(user.id);
        
        // Transform data to match the expected format
        const formattedProfile = {
          id: profileData.id,
          fullName: profileData.full_name || user.user_metadata?.full_name || 'UiTM Student',
          email: profileData.email || user.email,
          studentId: profileData.student_id || user.user_metadata?.student_id || '',
          username: profileData.username || user.email?.split('@')[0] || '',
          bio: profileData.bio || 'No bio available',
          avatarUrl: profileData.avatar_url,
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
        
        // Fetch user's hosted matches
        const hosted = await matchService.getHostedMatches(user.id);
        setHostedMatches(hosted || []);
        
        // Fetch user's joined matches (as participant)
        const participants = await participantService.getUserParticipations(user.id);
        setJoinedMatches(participants || []);
        
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchProfile();
    }
  }, [user]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
        <IconButton 
          sx={{ position: 'absolute', top: 0, right: 0 }}
          aria-label="settings"
        >
          <SettingsIcon />
        </IconButton>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar 
              sx={{ 
                width: 96, 
                height: 96, 
                bgcolor: 'primary.main',
                fontSize: '2.5rem'
              }}
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
              Student ID: {profile?.studentId}
            </Typography>
            <Typography variant="body1" mt={1}>
              {profile?.bio}
            </Typography>
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
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getSportIcon(match.sport?.name)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`Hosted "${match.title}"`}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {match.sport?.name} - {match.location?.name}
                            </Typography>
                            {` — ${new Date(match.start_time).toLocaleDateString()}`}
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
                
                {/* Show joined matches */}
                {joinedMatches.map((participation) => (
                  <React.Fragment key={`joined-${participation.id}`}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          {getSportIcon(participation.match?.sport?.name)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`Joined "${participation.match?.title}"`}
                        secondary={
                          <>
                            <Chip 
                              size="small" 
                              label={participation.status} 
                              color={
                                participation.status === 'confirmed' ? 'success' :
                                participation.status === 'pending' ? 'warning' :
                                'error'
                              }
                              sx={{ mr: 1 }}
                            />
                            {` — ${new Date(participation.joined_at).toLocaleDateString()}`}
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button variant="outlined" color="primary">
          Edit Profile
        </Button>
      </Box>
    </Container>
  );
};

export default Profile;
