import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link,
  Container,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  FormHelperText,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
  OutlinedInput,
  ListItemText,
  Grid,
  Radio,
  RadioGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ResendConfirmation from '../components/ResendConfirmation';
import { ExpandMore, SportsBasketball, AccessTime, LocationOn, Cake } from '@mui/icons-material';
import { sportService, locationService, supabase } from '../services/supabase';
import { subYears } from 'date-fns';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    username: '',
    studentId: '',
    password: '',
    confirmPassword: '',
    // New preference fields
    sport_preferences: [],
    available_days: [],
    preferred_facilities: [],
    faculty: '',
    play_style: 'casual',
    gender: '',
    age: '',
    birth_date: null,
    duration_preference: '',
    sports: [],
    skillLevels: {},
    campus: '',
    state: '',
    avatar: null,
    avatarUrl: null
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [existingEmail, setExistingEmail] = useState('');
  
  // Data for dropdown options
  const [sports, setSports] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  
  const { signUp } = useAuth();
  const navigate = useNavigate();

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

  // Load sports and locations data
  useEffect(() => {
    const loadOptions = async () => {
      setIsLoadingOptions(true);
      try {
        // Load sports
        const sportsData = await sportService.getAllSports();
        setSports(sportsData || []);
        
        // Load locations for facilities
        const locationsData = await locationService.getAllLocations();
        setLocations(locationsData || []);
      } catch (error) {
        console.error('Error loading options:', error);
      } finally {
        setIsLoadingOptions(false);
      }
    };
    
    loadOptions();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle multi-select changes
  const handleMultiSelectChange = (event, fieldName) => {
    const { value } = event.target;
    setFormData({
      ...formData,
      [fieldName]: typeof value === 'string' ? value.split(',') : value
    });
  };

  // Handle birth date change
  const handleBirthDateChange = (newDate) => {
    const calculatedAge = calculateAge(newDate);
    setFormData({
      ...formData,
      birth_date: newDate,
      age: calculatedAge
    });
  };
  
  // Handle checkbox array changes
  const handleCheckboxChange = (item, fieldName) => {
    const currentItems = [...formData[fieldName]];
    const currentIndex = currentItems.indexOf(item);
    
    if (currentIndex === -1) {
      currentItems.push(item);
    } else {
      currentItems.splice(currentIndex, 1);
    }
    
    setFormData({
      ...formData,
      [fieldName]: currentItems
    });
  };
  
  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;
    
    let strength = 0;
    // Length check
    if (password.length >= 8) strength += 25;
    // Contains lowercase letters
    if (/[a-z]/.test(password)) strength += 25;
    // Contains uppercase letters
    if (/[A-Z]/.test(password)) strength += 25;
    // Contains numbers or special characters
    if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 25;
    
    return strength;
  };
  
  const passwordStrength = calculatePasswordStrength(formData.password);
  
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return 'error';
    if (passwordStrength < 75) return 'warning';
    return 'success';
  };
  
  const validateForm = () => {
    // Email domain validation
    if (!formData.email.endsWith('@student.uitm.edu.my')) {
      setError('Only @student.uitm.edu.my email addresses are allowed');
      return false;
    }
    
    // Password match validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    // Password strength validation
    if (passwordStrength < 50) {
      setError('Password is too weak. Please include uppercase letters, numbers, or special characters.');
      return false;
    }
    
    // Terms agreement validation
    if (!agreeToTerms) {
      setError('You must agree to the Terms and Conditions');
      return false;
    }
    
    return true;
  };
  
  // Add a handler for adding sports with skill levels
  const handleAddSport = (sportId) => {
    if (formData.sports.includes(sportId)) {
      return; // Sport already added
    }
    
    // Find the sport by ID
    const sport = sports.find(s => s.id === sportId);
    if (!sport) return;
    
    // Default skill level is "Beginner"
    const skillLevel = formData.skillLevels[sportId] || "Beginner";
    
    // Add to sports array for UI tracking
    setFormData({
      ...formData,
      sports: [...formData.sports, sportId],
      // Update sport_preferences array with proper format
      sport_preferences: [
        ...formData.sport_preferences,
        { name: sport.name, level: skillLevel, id: sportId }
      ]
    });
  };

  // Handle removing a sport
  const handleRemoveSport = (sportId) => {
    setFormData({
      ...formData,
      sports: formData.sports.filter(id => id !== sportId),
      // Also remove from sport_preferences
      sport_preferences: formData.sport_preferences.filter(sp => sp.id !== sportId)
    });
  };

  // Handle skill level change
  const handleSkillLevelChange = (sportId, level) => {
    // Update skill levels map
    const updatedSkillLevels = {
      ...formData.skillLevels,
      [sportId]: level
    };
    
    // Also update the sport_preferences array to keep it in sync
    const updatedPreferences = formData.sport_preferences.map(sport => {
      if (sport.id === sportId) {
        return { ...sport, level };
      }
      return sport;
    });
    
    setFormData({
      ...formData,
      skillLevels: updatedSkillLevels,
      sport_preferences: updatedPreferences
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Format the sport preferences data properly
      const sport_preferences = formData.sport_preferences.map(sport => ({
        name: sport.name,
        level: sport.level
      }));
      
      // Separate user data (goes to users table) from preferences (goes to user_preferences table)
      const userData = {
        full_name: formData.fullName,
        username: formData.username,
        student_id: formData.studentId,
        faculty: formData.faculty,
        campus: formData.state, // Use state field for campus value
        gender: formData.gender,
        play_style: formData.play_style,
        avatar: formData.avatar,
        avatarUrl: formData.avatarUrl
      };

      // Preferences data (will be stored in user_preferences table after successful registration)
      const preferencesData = {
        sport_preferences: sport_preferences,
        available_days: formData.available_days,
        preferred_facilities: formData.preferred_facilities,
        duration_preference: formData.duration_preference,
        age: formData.age,
        birth_date: formData.birth_date ? formData.birth_date.toISOString().split('T')[0] : null,
        time_preferences: {
          days: formData.available_days,
          hours: []
        },
        location_preferences: formData.preferred_facilities
      };
      
      const { data, error } = await signUp(formData.email, formData.password, userData);
      
      if (error) {
        // Check if this is a case of unverified existing account
        if (error.includes('User already registered') ||
            error.toLowerCase().includes('already exists')) {
          setNeedsVerification(true);
          setExistingEmail(formData.email);
          throw new Error('This email is already registered but not verified.');
        }
        throw new Error(error);
      }

      // Store user preferences if registration was successful
      if (data?.user) {
        try {
          const { error: prefError } = await supabase
            .from('user_preferences')
            .insert({
              user_id: data.user.id,
              ...preferencesData
            });

          if (prefError) {
            console.error('Error storing user preferences:', prefError);
            // Don't throw error here as the main registration was successful
          }
        } catch (prefErr) {
          console.error('Exception storing user preferences:', prefErr);
          // Don't throw error here as the main registration was successful
        }
      }

      // Set verification sent flag to show verification pending screen
      setVerificationSent(true);
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verification pending screen
  if (verificationSent) {
    return (
      <Container component="main" maxWidth="sm" sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center' }}>
        <Paper 
          elevation={2} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            width: '100%',
            borderRadius: 3,
            backgroundColor: 'background.light'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/Sportea_logo/Sportea.png"
              alt="Sportea Logo"
              sx={{
                height: 160,
                width: 'auto',
                mb: 2,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
              }}
            />
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#8A1538',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
                mx: 'auto'
              }}
            >
              <Box
                component="span"
                sx={{
                  color: 'white',
                  fontSize: 36
                }}
              >
                ✉️
              </Box>
            </Box>
          </Box>

          <Typography
            variant="h4"
            component="h1"
            sx={{
              mb: 2,
              textAlign: 'center',
              fontWeight: 600,
              color: '#8A1538'
            }}
          >
            Check Your Email
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
            We sent a verification link to <strong>{formData.email}</strong>
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Click the link in the email to verify your account. If you don't see it, check your spam folder.
          </Typography>
          
          <Button
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
            onClick={() => navigate('/login')}
          >
            Back to Login
          </Button>
        </Paper>
      </Container>
    );
  }
  

  
  // Duration preferences
  const durationOptions = [
    "Less than 1 hour",
    "1 hour",
    "2 hours",
    "2+ hours"
  ];
  
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
  
  return (
    <Container component="main" maxWidth="sm" sx={{ py: 4 }}>
      <Paper 
        elevation={2} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          width: '100%',
          borderRadius: 3
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            component="img"
            src="/Sportea_logo/Sportea.png"
            alt="Sportea Logo"
            sx={{
              height: 200,
              width: 'auto',
              mb: 2,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
            }}
          />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 600,
              color: '#8A1538',
              mb: 1
            }}
          >
            Join Sportea
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
            Create your account to get started
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          Connect with UiTM students for sports
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}
        
        {needsVerification && (
          <>
            <Divider sx={{ my: 3, width: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                Need to verify your email?
              </Typography>
            </Divider>
            <ResendConfirmation prefilledEmail={existingEmail} />
          </>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          {/* Personal Information Section */}
          <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Personal Information</Typography>
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleChange}
            placeholder="student@student.uitm.edu.my"
            helperText="Must be a valid @student.uitm.edu.my email"
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="fullName"
            label="Full Name"
            name="fullName"
            autoComplete="name"
            value={formData.fullName}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            value={formData.username}
            onChange={handleChange}
            helperText="Choose a unique username (not your student ID)"
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="studentId"
            label="Student ID"
            name="studentId"
            value={formData.studentId}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
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
          
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
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
          
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
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
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
              <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ mb: 2 }}>
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
                        <Cake />
                      </InputAdornment>
                    )
                  }
                }
              }}
            />
          </Box>
          
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
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
          
          {/* Preferences Section */}
          <Accordion defaultExpanded sx={{ mt: 3, mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SportsBasketball sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Sports Preferences</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="sports-preferences-label">Sports You Enjoy</InputLabel>
                <Select
                  labelId="sports-preferences-label"
                  id="sport_preferences"
                  multiple
                  value={formData.sport_preferences}
                  onChange={(e) => handleMultiSelectChange(e, 'sport_preferences')}
                  input={<OutlinedInput label="Sports You Enjoy" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const sport = sports.find(s => s.id === value) || { name: value };
                        return <Chip key={value} label={sport.name} />;
                      })}
                    </Box>
                  )}
                >
                  {isLoadingOptions ? (
                    <MenuItem disabled>Loading sports...</MenuItem>
                  ) : (
                    sports.map((sport) => (
                      <MenuItem key={sport.id} value={sport.id}>
                        <Checkbox checked={formData.sport_preferences.indexOf(sport.id) > -1} />
                        <ListItemText primary={sport.name} />
                      </MenuItem>
                    ))
                  )}
                </Select>
                <FormHelperText>Select sports you're interested in playing</FormHelperText>
              </FormControl>
              
              <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Play Style</Typography>
                <RadioGroup
                  row
                  name="play_style"
                  value={formData.play_style}
                  onChange={handleChange}
                >
                  <FormControlLabel value="casual" control={<Radio />} label="Casual" />
                  <FormControlLabel value="competitive" control={<Radio />} label="Competitive" />
                </RadioGroup>
                <FormHelperText>How do you prefer to play?</FormHelperText>
              </FormControl>
            </AccordionDetails>
          </Accordion>
          
          <Accordion sx={{ mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Availability</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Days Available</Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <Grid item key={day}>
                    <Chip
                      label={day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      onClick={() => handleCheckboxChange(day, 'available_days')}
                      color={formData.available_days.includes(day) ? 'primary' : 'default'}
                      variant={formData.available_days.includes(day) ? 'filled' : 'outlined'}
                    />
                  </Grid>
                ))}
              </Grid>
              <FormHelperText>Select days when you're typically available to play</FormHelperText>
            </AccordionDetails>
          </Accordion>
          
          <Accordion sx={{ mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Preferred Facilities</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="facilities-label">Preferred Facilities</InputLabel>
                <Select
                  labelId="facilities-label"
                  id="preferred_facilities"
                  multiple
                  value={formData.preferred_facilities}
                  onChange={(e) => handleMultiSelectChange(e, 'preferred_facilities')}
                  input={<OutlinedInput label="Preferred Facilities" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const location = locations.find(l => l.id === value) || { name: value };
                        return <Chip key={value} label={location.name} />;
                      })}
                    </Box>
                  )}
                >
                  {isLoadingOptions ? (
                    <MenuItem disabled>Loading facilities...</MenuItem>
                  ) : (
                    locations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        <Checkbox checked={formData.preferred_facilities.indexOf(location.id) > -1} />
                        <ListItemText primary={location.name} secondary={location.campus} />
                      </MenuItem>
                    ))
                  )}
                </Select>
                <FormHelperText>Select facilities where you prefer to play</FormHelperText>
              </FormControl>
            </AccordionDetails>
          </Accordion>
          
          {/* Sports Selection */}
          <Accordion defaultExpanded sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="sports-content"
              id="sports-header"
              sx={{ backgroundColor: 'background.light' }}
            >
              <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                <SportsBasketball sx={{ mr: 1 }} />
                Sports Preferences
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="add-sport-label">Add Sport</InputLabel>
                <Select
                  labelId="add-sport-label"
                  id="add-sport"
                  value=""
                  onChange={(e) => handleAddSport(e.target.value)}
                  label="Add Sport"
                >
                  {sports
                    .filter(sport => !formData.sports.includes(sport.id))
                    .map(sport => (
                      <MenuItem key={sport.id} value={sport.id}>
                        {sport.name}
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
              
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Selected Sports:</Typography>
              
              {formData.sports.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No sports selected
                </Typography>
              ) : (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {formData.sports.map(sportId => {
                    const sport = sports.find(s => s.id === sportId);
                    return sport ? (
                      <Grid item xs={12} key={sport.id}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle1">{sport.name}</Typography>
                            <Button 
                              size="small" 
                              color="error" 
                              onClick={() => handleRemoveSport(sport.id)}
                            >
                              Remove
                            </Button>
                          </Box>
                          
                          <FormControl component="fieldset">
                            <Typography variant="subtitle2" gutterBottom>Skill Level:</Typography>
                            <RadioGroup
                              row
                              value={formData.skillLevels[sport.id] || 'Beginner'}
                              onChange={(e) => handleSkillLevelChange(sport.id, e.target.value)}
                            >
                              <FormControlLabel value="Beginner" control={<Radio size="small" />} label="Beginner" />
                              <FormControlLabel value="Intermediate" control={<Radio size="small" />} label="Intermediate" />
                              <FormControlLabel value="Advanced" control={<Radio size="small" />} label="Advanced" />
                            </RadioGroup>
                          </FormControl>
                        </Paper>
                      </Grid>
                    ) : null;
                  })}
                </Grid>
              )}
            </AccordionDetails>
          </Accordion>
          
          {/* Password Section */}
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Security</Typography>
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            sx={{ mb: 1 }}
          />
          
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={passwordStrength} 
              color={getPasswordStrengthColor()}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <FormHelperText>
              {passwordStrength < 50 && 'Weak password'}
              {passwordStrength >= 50 && passwordStrength < 75 && 'Moderate password'}
              {passwordStrength >= 75 && 'Strong password'}
            </FormHelperText>
          </Box>
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            sx={{ mb: 3 }}
          />
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={agreeToTerms} 
                onChange={(e) => setAgreeToTerms(e.target.checked)} 
                color="primary"
              />
            }
            label={
              <Typography variant="caption">
                I agree to the {' '}
                <Link component={RouterLink} to="/terms" color="primary">
                  Terms and Conditions
                </Link>
              </Typography>
            }
            sx={{ mb: 3 }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mb: 2, height: 48 }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body1">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" color="primary">
                Sign In
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
