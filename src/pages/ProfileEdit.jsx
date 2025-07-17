import React, { useState, useEffect, useRef } from 'react';
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
  CardContent,
  InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService, locationService } from '../services/supabase';
import recommendationServiceV3 from '../services/recommendationServiceV3';
import { useToast } from '../contexts/ToastContext';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import AddIcon from '@mui/icons-material/Add';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import CakeIcon from '@mui/icons-material/Cake';
import ProfilePreferences from '../components/ProfilePreferences';
import { subYears, isAfter, isBefore } from 'date-fns';
import { invalidateUserCache } from '../services/simplifiedRecommendationService';

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
  const { showSuccessToast, showErrorToast, showWarningToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    bio: '',
    avatarUrl: null,
    faculty: '',
    campus: '',
    state: '',
    sports: [],
    // New preference fields
    available_days: [],
    available_hours: {},
    preferred_facilities: [],
    home_location: null,
    play_style: 'casual',
    gender: '',
    age: '',
    birth_date: null,
    duration_preference: '',
  });
  
  // New sport state
  const [newSport, setNewSport] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('Beginner');

  // Age calculation function
  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Birth date validation
  const getMinBirthDate = () => subYears(new Date(), 65); // Maximum age 65
  const getMaxBirthDate = () => subYears(new Date(), 18); // Minimum age 18
  const [showSportForm, setShowSportForm] = useState(false);
  
  // File upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState(null); // Store original avatar URL
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null); // Ref for file input
  
  // Faculty options
  const facultyOptions = [
    "COMPUTER SCIENCES",
    "ENGINEERING",
    "ARTS",
    "MASSCOM",
    "SPORT SCIENCES AND RECREATION",
    "LANGUAGE",
    "APB"
  ];
  
  // State options (replacing campus)
  const stateOptions = [
    "SELANGOR",
    "SARAWAK",
    "SABAH",
    "JOHOR",
    "PAHANG",
    "PERAK",
    "NEGERI SEMBILAN",
    "KEDAH",
    "PERLIS",
    "KELANTAN",
    "MELAKA",
    "TERENGGANU",
    "PENANG"
  ];
  
  // Gender options
  const genderOptions = [
    "Male",
    "Female",
    "Other",
    "Prefer not to say"
  ];
  
  // Age range preferences
  const ageRangeOptions = [
    "18-21",
    "21-25",
    "25-30",
    "30+"
  ];
  
  // Duration preferences
  const durationOptions = [
    "Less than 1 hour",
    "1 hour",
    "2 hours",
    "2+ hours"
  ];
  
  // Fetch locations for facility selection
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationsData = await locationService.getLocations();
        setLocations(locationsData || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    
    fetchLocations();
  }, []);
  
  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get profile data from userService
        const profileData = await userService.getProfile(user.id);
        
        // Get user data from the users table (all valid columns only)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('available_days, available_hours, preferred_facilities, faculty, campus, home_location, play_style, gender')
          .eq('id', user.id)
          .single();
        
        if (userError) {
          console.error('Error fetching user data:', userError);
        }
        
        // Also fetch user preferences from user_preferences table
        const { data: userPreferences, error: preferencesError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (preferencesError && preferencesError.code !== 'PGRST116') {
          console.error('Error fetching user preferences:', preferencesError);
        }
        
        // Log values to see what's happening
        console.log('Profile Data:', profileData);
        console.log('User Data:', userData);
        console.log('User Preferences:', userPreferences);
        
        // Prepare combined data from all sources
        setFormData({
          username: profileData.username || '',
          fullName: profileData.full_name || '',
          bio: profileData.bio || '',
          avatarUrl: profileData.avatar_url || null,
          faculty: userData?.faculty || '',
          campus: userData?.campus || '', 
          state: userData?.campus || '', // Map campus to state for the form
          gender: userData?.gender || '',
          age: userPreferences?.age || '',
          birth_date: userPreferences?.birth_date ? new Date(userPreferences.birth_date) : null,
          duration_preference: userPreferences?.duration_preference || '',
          sports: Array.isArray(profileData.sport_preferences) 
            ? profileData.sport_preferences.map((sport, index) => ({
                id: index + 1,
                name: sport.name,
                level: sport.level || 'Beginner'
              }))
            : userPreferences?.sport_preferences 
              ? userPreferences.sport_preferences.map((sport, index) => ({
                  id: index + 1,
                  name: sport.name,
                  level: sport.level || 'Beginner'
                }))
              : [],
          // Add new preference fields from user data and user_preferences
          available_days: userData?.available_days || userPreferences?.time_preferences?.days || [],
          available_hours: {
            ...(userData?.available_hours || {}),
            available_times: userData?.available_hours?.available_times || 
                          userPreferences?.time_preferences?.hours || []
          },
          preferred_facilities: userData?.preferred_facilities || userPreferences?.location_preferences || [],
          home_location: userData?.home_location || null,
          play_style: userData?.play_style || 'casual'
        });
        
        if (profileData.avatar_url) {
          setAvatarPreview(profileData.avatar_url);
          setOriginalAvatarUrl(profileData.avatar_url); // Store original for restore functionality
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user, supabase]);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle birth date change
  const handleBirthDateChange = (newDate) => {
    const calculatedAge = calculateAge(newDate);
    setFormData(prev => ({
      ...prev,
      birth_date: newDate,
      age: calculatedAge
    }));
  };
  
  // Handle avatar file selection
  // Validate image file
  const validateImageFile = (file) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showErrorToast('Invalid file type', 'Please upload a JPEG, PNG, GIF, or WebP image.');
      return false;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast('File too large', 'Please upload an image smaller than 5MB.');
      return false;
    }

    return true;
  };

  // Process selected file
  const processSelectedFile = (file) => {
    if (!validateImageFile(file)) return;

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processSelectedFile(file);
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processSelectedFile(files[0]);
    }
  };
  
  // Remove avatar
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Mark avatar for deletion by setting a flag
    setFormData(prev => ({
      ...prev,
      avatarUrl: null,
      removeAvatar: true // Flag to indicate avatar should be removed
    }));
  };

  // Restore avatar (undo removal)
  const handleRestoreAvatar = () => {
    // Reset file input and avatar file state
    setAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setFormData(prev => ({
      ...prev,
      removeAvatar: false
    }));

    // If there was an original avatar, restore the preview
    if (formData.avatarUrl) {
      setAvatarPreview(formData.avatarUrl);
    }
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
    if (!newSport || !newSkillLevel) {
      return;
    }
    
    // Generate a unique ID for the new sport
    const sportId = Date.now().toString();
    
    const updatedSports = [
      ...formData.sports,
      {
        id: sportId,
        name: newSport,
        level: newSkillLevel
      }
    ];
    
    setFormData({
      ...formData,
      sports: updatedSports
    });
    
    // Reset form
    setNewSport('');
    setNewSkillLevel('');
    setShowSportForm(false);
  };
  
  // Remove a sport from the list
  const handleRemoveSport = (sportId) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.filter(sport => sport.id !== sportId)
    }));
  };
  
  // Handle preference changes from ProfilePreferences component
  const handlePreferenceChange = (preferences) => {
    setFormData(prev => {
      // Make sure we preserve the structure needed for the database
      const updatedPreferences = {
        ...prev,
        ...preferences,
        // Ensure available_hours has the right structure with available_times
        available_hours: {
          ...preferences.available_hours,
          available_times: extractAvailableTimes(preferences.available_hours)
        }
      };
      return updatedPreferences;
    });
  };
  
  // Extract available times from the available_hours object structure
  const extractAvailableTimes = (availableHours) => {
    if (!availableHours) return [];
    
    // Skip if it's already in the right format
    if (availableHours.available_times) return availableHours.available_times;
    
    const availableTimes = [];
    // Process each day's time slots
    Object.keys(availableHours).forEach(day => {
      if (Array.isArray(availableHours[day])) {
        availableHours[day].forEach(timeSlot => {
          if (timeSlot.start && timeSlot.end) {
            availableTimes.push({
              day,
              start: timeSlot.start,
              end: timeSlot.end
            });
          }
        });
      }
    });
    
    return availableTimes;
  };
  
  // Process available hours from database format to component format
  const processAvailableHours = (availableHours) => {
    if (!availableHours) return {};
    
    console.log("Processing available hours:", availableHours);
    
    // If there are no available_times, return as is
    if (!availableHours.available_times || !Array.isArray(availableHours.available_times) || availableHours.available_times.length === 0) {
      return availableHours;
    }
    
    // Convert from array format to day-based object format
    const processedHours = {};
    
    availableHours.available_times.forEach(timeSlot => {
      const { day, start, end } = timeSlot;
      
      if (!day || !start || !end) return;
      
      if (!processedHours[day]) {
        processedHours[day] = [];
      }
      
      processedHours[day].push({ start, end });
    });
    
    console.log("Processed hours:", processedHours);
    return processedHours;
  };
  
  // Submit form data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      // Update user profile in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: formData.username,
          full_name: formData.fullName,
          bio: formData.bio,
          faculty: formData.faculty,
          campus: formData.state, // Store state in the campus field
          gender: formData.gender,
          available_days: formData.available_days,
          available_hours: formData.available_hours,
          preferred_facilities: formData.preferred_facilities,
          home_location: formData.home_location,
          play_style: formData.play_style,
          sport_preferences: formData.sports
        })
        .eq('id', user.id);
        
      if (updateError) throw new Error(updateError.message);
      
      // Now also update the user_preferences table for the recommendation system
      const preferenceData = {
        user_id: user.id,
        sport_preferences: formData.sports.map(sport => ({ 
          name: sport.name, 
          level: sport.level 
        })),
        skill_level_preferences: {
          default: formData.sports.length > 0 ? formData.sports[0].level : 'intermediate'
        },
        time_preferences: {
          days: formData.available_days,
          hours: formData.available_hours.available_times || []
        },
        location_preferences: formData.preferred_facilities,
        age: formData.age,
        birth_date: formData.birth_date ? formData.birth_date.toISOString().split('T')[0] : null,
        duration_preference: formData.duration_preference
      };
      
      // Check if user_preferences entry exists
      const { data: existingPrefs, error: checkError } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (checkError) throw new Error(checkError.message);
      
      // Update or insert user_preferences
      if (existingPrefs) {
        // Update existing preferences
        const { error: prefUpdateError } = await supabase
          .from('user_preferences')
          .update(preferenceData)
          .eq('user_id', user.id);
          
        if (prefUpdateError) throw new Error(prefUpdateError.message);
      } else {
        // Insert new preferences
        const { error: prefInsertError } = await supabase
          .from('user_preferences')
          .insert(preferenceData);
          
        if (prefInsertError) throw new Error(prefInsertError.message);
      }
      
      // Handle avatar update if needed
      if (avatarFile) {
        const avatarUrl = await uploadAvatar();
        // Update avatar_url in the database
        if (avatarUrl) {
          const { error: avatarUpdateError } = await supabase
            .from('users')
            .update({ avatar_url: avatarUrl })
            .eq('id', user.id);

          if (avatarUpdateError) throw new Error(avatarUpdateError.message);
        }
      } else if (formData.removeAvatar) {
        // Remove avatar from database if user requested removal
        const { error: avatarRemoveError } = await supabase
          .from('users')
          .update({ avatar_url: null })
          .eq('id', user.id);

        if (avatarRemoveError) throw new Error(avatarRemoveError.message);
      }
      
      // Invalidate recommendation cache since user preferences changed
      try {
        invalidateUserCache(user.id);
        console.log('Recommendation cache invalidated after profile update');

        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('sportea:user-preferences-updated', {
          detail: { userId: user.id }
        }));
      } catch (cacheError) {
        console.warn('Failed to invalidate recommendation cache:', cacheError);
        // Don't fail the entire operation if cache invalidation fails
      }

      showSuccessToast('Profile Updated', 'Your profile has been updated successfully');
      navigate('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
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
              <Box
                sx={{
                  position: 'relative',
                  p: 2,
                  border: isDragOver ? '2px dashed #1976d2' : '2px dashed transparent',
                  borderRadius: 2,
                  transition: 'border-color 0.2s',
                  bgcolor: isDragOver ? 'action.hover' : 'transparent'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Avatar
                  src={avatarPreview}
                  sx={{
                    width: 100,
                    height: 100,
                    fontSize: '2.5rem',
                    opacity: formData.removeAvatar ? 0.5 : 1,
                    filter: formData.removeAvatar ? 'grayscale(100%)' : 'none',
                    transition: 'opacity 0.3s, filter 0.3s'
                  }}
                >
                  {formData.fullName?.charAt(0) || formData.username?.charAt(0) || 'U'}
                </Avatar>
                {formData.removeAvatar && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      bgcolor: 'error.main',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Will be removed
                  </Box>
                )}
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
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                  />
                  <IconButton
                    color="primary"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      bgcolor: 'background.paper',
                      boxShadow: 1
                    }}
                    title="Upload profile picture"
                  >
                    <PhotoCamera />
                  </IconButton>
                  {(avatarPreview || formData.removeAvatar) && (
                    <IconButton
                      color={formData.removeAvatar ? "primary" : "error"}
                      onClick={formData.removeAvatar ? handleRestoreAvatar : handleRemoveAvatar}
                      sx={{
                        bgcolor: 'background.paper',
                        boxShadow: 1
                      }}
                      title={formData.removeAvatar ? "Restore avatar" : "Remove avatar"}
                    >
                      {formData.removeAvatar ? <RestoreIcon /> : <DeleteIcon />}
                    </IconButton>
                  )}
                </Box>
                {isDragOver && (
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      bottom: -30,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      color: 'primary.main',
                      fontWeight: 'bold'
                    }}
                  >
                    Drop image here
                  </Typography>
                )}
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
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    '& textarea': {
                      padding: '14px'
                    }
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" variant="outlined">
                <InputLabel id="faculty-label">Faculty</InputLabel>
                <Select
                  labelId="faculty-label"
                  id="faculty"
                  name="faculty"
                  value={formData.faculty}
                  onChange={handleChange}
                  label="Faculty"
                >
                  <MenuItem value="">Select Faculty</MenuItem>
                  {facultyOptions.map((faculty) => (
                    <MenuItem key={faculty} value={faculty}>
                      {faculty}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" variant="outlined">
                <InputLabel id="state-label">State</InputLabel>
                <Select
                  labelId="state-label"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  label="State"
                >
                  <MenuItem value="">Select State</MenuItem>
                  {stateOptions.map((state) => (
                    <MenuItem key={state} value={state}>
                      {state}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" variant="outlined">
                <InputLabel id="gender-label">Gender</InputLabel>
                <Select
                  labelId="gender-label"
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  label="Gender"
                >
                  <MenuItem value="">Select Gender</MenuItem>
                  {genderOptions.map((gender) => (
                    <MenuItem key={gender} value={gender}>
                      {gender}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Birth Date"
                value={formData.birth_date}
                onChange={handleBirthDateChange}
                minDate={getMinBirthDate()}
                maxDate={getMaxBirthDate()}
                slots={{
                  textField: TextField
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: "normal",
                    variant: "outlined",
                    helperText: formData.age ? `Age: ${formData.age} years` : "Select your birth date (must be 18-65 years old)",
                    InputProps: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CakeIcon />
                        </InputAdornment>
                      )
                    }
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal" variant="outlined">
                <InputLabel id="duration-label">Preferred Duration</InputLabel>
                <Select
                  labelId="duration-label"
                  id="duration_preference"
                  name="duration_preference"
                  value={formData.duration_preference}
                  onChange={handleChange}
                  label="Preferred Duration"
                >
                  <MenuItem value="">Select Duration</MenuItem>
                  {durationOptions.map((duration) => (
                    <MenuItem key={duration} value={duration}>
                      {duration}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
            
            {/* Recommendation Preferences Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h5" sx={{ mb: 3 }}>
                Match Recommendation Preferences
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <ProfilePreferences 
                    value={{
                      available_days: formData.available_days,
                      available_hours: processAvailableHours(formData.available_hours),
                      preferred_facilities: formData.preferred_facilities,
                      home_location: formData.home_location,
                      play_style: formData.play_style
                    }}
                    onChange={handlePreferenceChange}
                    facilities={locations}
                  />
                </CardContent>
              </Card>
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