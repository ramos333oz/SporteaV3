import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Avatar, 
  Grid, 
  IconButton, 
  Divider, 
  Chip, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Autocomplete,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';

// Map sport names to their respective icons (same as in Profile.jsx)
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

// Available sports and skill levels for selection
const availableSports = [
  'Football', 'Basketball', 'Badminton', 'Tennis', 'Volleyball', 
  'Baseball', 'Boxing', 'Martial Arts', 'Gym', 'Running', 'Soccer'
];

const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];

const ProfileEdit = () => {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const { showSuccessToast, showErrorToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    bio: '',
    avatarUrl: null,
    faculty: '',
    campus: '',
    sports: []
  });
  
  // New sport state
  const [newSport, setNewSport] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('Beginner');
  const [showSportForm, setShowSportForm] = useState(false);
  
  // File upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const profileData = await userService.getProfile(user.id);
        
        setFormData({
          username: profileData.username || '',
          fullName: profileData.full_name || '',
          bio: profileData.bio || '',
          avatarUrl: profileData.avatar_url || null,
          faculty: profileData.faculty || '',
          campus: profileData.campus || '',
          sports: Array.isArray(profileData.sport_preferences) 
            ? profileData.sport_preferences.map((sport, index) => ({
                id: index + 1,
                name: sport.name,
                level: sport.level || 'Beginner'
              }))
            : []
        });
        
        if (profileData.avatar_url) {
          setAvatarPreview(profileData.avatar_url);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      showErrorToast('Invalid file type', 'Please upload a JPEG, PNG, or GIF image.');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showErrorToast('File too large', 'Please upload an image smaller than 2MB.');
      return;
    }
    
    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Remove avatar
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setFormData(prev => ({
      ...prev,
      avatarUrl: null
    }));
  };
  
  // Upload avatar to storage
  const uploadAvatar = async () => {
    if (!avatarFile) return null;
    
    try {
      // Create a unique file path for the avatar
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Upload the file to the 'avatars' bucket
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100);
          }
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
        
      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };
  
  // Add a new sport to the list
  const handleAddSport = () => {
    if (!newSport) {
      showErrorToast('Please select a sport');
      return;
    }
    
    // Check if sport already exists
    const sportExists = formData.sports.some(sport => 
      sport.name.toLowerCase() === newSport.toLowerCase()
    );
    
    if (sportExists) {
      showErrorToast('This sport is already in your preferences');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      sports: [
        ...prev.sports,
        {
          id: Date.now(), // Use timestamp as temporary ID
          name: newSport,
          level: newSkillLevel
        }
      ]
    }));
    
    // Reset sport form
    setNewSport('');
    setNewSkillLevel('Beginner');
    setShowSportForm(false);
  };
  
  // Remove a sport from the list
  const handleRemoveSport = (sportId) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.filter(sport => sport.id !== sportId)
    }));
  };
  
  // Submit form data
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Upload avatar if a new one is selected
      let avatarUrl = formData.avatarUrl;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }
      
      // Prepare data for update
      const updateData = {
        username: formData.username,
        full_name: formData.fullName,
        bio: formData.bio,
        avatar_url: avatarUrl,
        faculty: formData.faculty,
        campus: formData.campus,
        sport_preferences: formData.sports.map(sport => ({
          name: sport.name,
          level: sport.level
        })),
        updated_at: new Date().toISOString()
      };
      
      // Update user profile
      await userService.updateProfile(user.id, updateData);
      
      showSuccessToast('Profile updated successfully');
      navigate(`/profile`);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
      showErrorToast('Error updating profile');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <CircularProgress />
          <Typography>Loading profile data...</Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Edit Profile
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Avatar Upload */}
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar 
                  src={avatarPreview} 
                  sx={{ 
                    width: 100, 
                    height: 100,
                    fontSize: '2.5rem'
                  }}
                >
                  {formData.fullName?.charAt(0) || formData.username?.charAt(0) || 'U'}
                </Avatar>
                <Box sx={{ 
                  position: 'absolute', 
                  bottom: -10, 
                  right: -10, 
                  display: 'flex', 
                  gap: 1 
                }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="avatar-upload"
                    type="file"
                    onChange={handleAvatarChange}
                  />
                  <label htmlFor="avatar-upload">
                    <IconButton 
                      color="primary" 
                      component="span" 
                      sx={{ 
                        bgcolor: 'background.paper',
                        boxShadow: 1
                      }}
                    >
                      <PhotoCamera />
                    </IconButton>
                  </label>
                  {avatarPreview && (
                    <IconButton 
                      color="error" 
                      onClick={handleRemoveAvatar}
                      sx={{ 
                        bgcolor: 'background.paper',
                        boxShadow: 1
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Grid>
            
            {/* Basic Info */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                required
                helperText="Choose a unique username"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                helperText="Your real name (optional)"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                multiline
                rows={3}
                helperText="Tell others about yourself"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Faculty"
                name="faculty"
                value={formData.faculty}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                helperText="Your faculty at UiTM"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Campus"
                name="campus"
                value={formData.campus}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                helperText="Your campus location"
              />
            </Grid>
            
            {/* Sports Preferences */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Sports Preferences</Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<AddIcon />}
                  onClick={() => setShowSportForm(true)}
                >
                  Add Sport
                </Button>
              </Box>
              
              {showSportForm && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.neutral' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                      <Autocomplete
                        value={newSport}
                        onChange={(e, newValue) => setNewSport(newValue)}
                        options={availableSports}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            label="Select Sport" 
                            variant="outlined" 
                            fullWidth 
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Skill Level</InputLabel>
                        <Select
                          value={newSkillLevel}
                          onChange={(e) => setNewSkillLevel(e.target.value)}
                          label="Skill Level"
                        >
                          {skillLevels.map(level => (
                            <MenuItem key={level} value={level}>
                              {level}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          variant="contained" 
                          color="primary" 
                          onClick={handleAddSport}
                          fullWidth
                        >
                          Add
                        </Button>
                        <Button 
                          variant="outlined" 
                          color="secondary" 
                          onClick={() => setShowSportForm(false)}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              )}
              
              {formData.sports.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You haven't added any sports to your profile yet.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {formData.sports.map((sport) => (
                    <Grid item xs={12} sm={6} md={4} key={sport.id}>
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center' 
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getSportIcon(sport.name)}
                              <Typography variant="h6" sx={{ ml: 1 }}>
                                {sport.name}
                              </Typography>
                            </Box>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleRemoveSport(sport.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          <Chip 
                            label={sport.level} 
                            size="small" 
                            color="primary"
                            sx={{ mt: 1 }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>
            
            {/* Submit Buttons */}
            <Grid item xs={12} sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="outlined" 
                color="secondary"
                onClick={() => navigate('/profile')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={saving}
                startIcon={saving && <CircularProgress size={20} color="inherit" />}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default ProfileEdit;