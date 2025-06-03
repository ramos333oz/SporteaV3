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
  IconButton
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const Profile = () => {
  const { user, supabase } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Mock data for profile (will be replaced with real data from Supabase)
  const mockProfile = {
    fullName: user?.user_metadata?.full_name || 'UiTM Student',
    studentId: user?.user_metadata?.student_id || '2023123456',
    bio: 'Sports enthusiast passionate about football and basketball. Looking to connect with fellow athletes!',
    sports: [
      { id: 1, name: 'Football', level: 'Intermediate', icon: <SportsSoccerIcon /> },
      { id: 2, name: 'Basketball', level: 'Beginner', icon: <SportsBasketballIcon /> },
      { id: 3, name: 'Badminton', level: 'Professional', icon: <SportsTennisIcon /> }
    ],
    achievements: [
      { id: 1, name: 'First Match', description: 'Participated in your first match', date: '2023-05-12' },
      { id: 2, name: 'Host Master', description: 'Successfully hosted 5 matches', date: '2023-06-20' },
      { id: 3, name: 'Team Player', description: 'Joined 10 different teams', date: '2023-07-15' },
    ],
    recentActivity: [
      { id: 1, type: 'joined', match: 'Evening Football', date: '2023-11-10' },
      { id: 2, type: 'hosted', match: 'Basketball Tournament', date: '2023-11-05' },
      { id: 3, type: 'achievement', name: 'Social Butterfly', date: '2023-10-30' },
    ]
  };
  
  useEffect(() => {
    // Simulate loading profile data from Supabase
    const fetchProfile = async () => {
      setLoading(true);
      try {
        // In a real implementation, we would fetch the user profile from Supabase here
        // const { data, error } = await supabase
        //   .from('profiles')
        //   .select('*')
        //   .eq('id', user.id)
        //   .single();
        
        // For now, use mock data
        setProfile(mockProfile);
      } catch (error) {
        console.error('Error fetching profile:', error);
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
        <Typography>Loading profile...</Typography>
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
              {profile?.sports.map((sport) => (
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
                        color={
                          sport.level === 'Beginner' ? 'success' : 
                          sport.level === 'Intermediate' ? 'primary' : 
                          'secondary'
                        }
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
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
            <List>
              {profile?.achievements.map((achievement) => (
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
                          {` — ${new Date(achievement.date).toLocaleDateString()}`}
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
            <List>
              {profile?.recentActivity.map((activity) => (
                <React.Fragment key={activity.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        activity.type === 'joined' 
                          ? `Joined "${activity.match}"` 
                          : activity.type === 'hosted' 
                          ? `Hosted "${activity.match}"`
                          : `Earned achievement "${activity.name}"`
                      }
                      secondary={new Date(activity.date).toLocaleDateString()}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
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
