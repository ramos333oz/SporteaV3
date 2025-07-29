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
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ResendConfirmation from '../components/ResendConfirmation';
import { ExpandMore, SportsBasketball, AccessTime, LocationOn, Cake } from '@mui/icons-material';
import { sportService, locationService, supabase } from '../services/supabase';
import { subYears } from 'date-fns';
import { checkEmailExists, isValidEmailDomain, getEmailErrorMessage, getEmailSuggestions } from '../utils/emailValidation';
import DotGrid from '../components/animations/DotGrid';

// Predefined time slots for availability selection
const TIME_SLOTS = [
  { id: '9-11', label: '9:00 AM - 11:00 AM', start: '09:00', end: '11:00' },
  { id: '11-13', label: '11:00 AM - 1:00 PM', start: '11:00', end: '13:00' },
  { id: '13-15', label: '1:00 PM - 3:00 PM', start: '13:00', end: '15:00' },
  { id: '15-17', label: '3:00 PM - 5:00 PM', start: '15:00', end: '17:00' },
  { id: '17-19', label: '5:00 PM - 7:00 PM', start: '17:00', end: '19:00' },
  { id: '19-21', label: '7:00 PM - 9:00 PM', start: '19:00', end: '21:00' },
  { id: '21-23', label: '9:00 PM - 11:00 PM', start: '21:00', end: '23:00' },
];

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
    available_hours: {},
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
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Email validation states
  const [emailValidation, setEmailValidation] = useState({
    isChecking: false,
    exists: false,
    isConfirmed: false,
    error: null,
    suggestions: null
  });
  const [showEmailDialog, setShowEmailDialog] = useState(false);

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

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;

    let strength = 0;
    // Length check
    if (password.length >= 8) strength += 25;
    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 25;
    // Lowercase check
    if (/[a-z]/.test(password)) strength += 25;
    // Number or special character check
    if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 25;

    return strength;
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return 'error';
    if (passwordStrength < 75) return 'warning';
    return 'success';
  };

  // Email validation function
  const validateEmail = async (email) => {
    if (!email || !email.trim()) {
      setEmailValidation({
        isChecking: false,
        exists: false,
        isConfirmed: false,
        error: null,
        suggestions: null
      });
      return;
    }

    setEmailValidation(prev => ({ ...prev, isChecking: true }));

    try {
      // Check domain first
      if (!isValidEmailDomain(email)) {
        const errorMessage = getEmailErrorMessage(email, { exists: false, isConfirmed: false, error: null });
        const suggestions = getEmailSuggestions(email, { exists: false, isConfirmed: false });

        setEmailValidation({
          isChecking: false,
          exists: false,
          isConfirmed: false,
          error: errorMessage,
          suggestions
        });
        return;
      }

      // Check if email exists
      const result = await checkEmailExists(email);
      const errorMessage = getEmailErrorMessage(email, result);
      const suggestions = getEmailSuggestions(email, result);

      setEmailValidation({
        isChecking: false,
        exists: result.exists,
        isConfirmed: result.isConfirmed,
        error: errorMessage,
        suggestions
      });

      // Show dialog if email exists and is confirmed
      if (result.exists && result.isConfirmed) {
        setShowEmailDialog(true);
      }

    } catch (error) {
      console.error('Email validation error:', error);
      setEmailValidation({
        isChecking: false,
        exists: false,
        isConfirmed: false,
        error: 'Unable to validate email. Please try again.',
        suggestions: null
      });
    }
  };

  // Real-time form validation check
  const checkFormValidity = () => {
    const requiredFields = [
      'email', 'fullName', 'username', 'studentId', 'faculty', 'state',
      'gender', 'birth_date', 'duration_preference', 'play_style', 'password', 'confirmPassword'
    ];

    const hasRequiredFields = requiredFields.every(field => {
      if (field === 'password' || field === 'confirmPassword') {
        return formData[field] && formData[field].length > 0;
      }
      return formData[field] && formData[field].toString().trim().length > 0;
    });

    const hasSports = formData.sport_preferences && formData.sport_preferences.length > 0;
    const hasAvailability = formData.available_days && formData.available_days.length > 0;
    const hasTimeSlots = formData.available_days.some(day =>
      formData.available_hours[day] && formData.available_hours[day].length > 0
    );
    const hasFacilities = formData.preferred_facilities && formData.preferred_facilities.length > 0;
    const passwordsMatch = formData.password === formData.confirmPassword;
    const strongPassword = passwordStrength >= 50;

    const emailValid = !emailValidation.error && !emailValidation.exists;

    const isValid = hasRequiredFields && hasSports && hasAvailability && hasTimeSlots &&
                   hasFacilities && passwordsMatch && strongPassword && agreeToTerms && emailValid;

    setIsFormValid(isValid);
  };

  // Check form validity whenever formData or agreeToTerms changes
  useEffect(() => {
    checkFormValidity();
  }, [formData, agreeToTerms]);

  // Function to extract Student ID from email
  const extractStudentIdFromEmail = (email) => {
    if (!email) return '';

    // Only extract student ID from @student.uitm.edu.my emails
    if (!email.endsWith('@student.uitm.edu.my')) return '';

    // Extract the part before @ symbol
    const beforeAt = email.split('@')[0];

    // For UiTM student emails, the part before @ should be the student ID
    // Return the full part before @ as it should be the complete student ID
    return beforeAt;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Update form data
    const updatedFormData = {
      ...formData,
      [name]: value
    };

    // Auto-populate Student ID when email changes
    if (name === 'email') {
      const extractedStudentId = extractStudentIdFromEmail(value);
      updatedFormData.studentId = extractedStudentId;

      // Clear both email and studentId errors when email changes
      if (fieldErrors.email || fieldErrors.studentId) {
        setFieldErrors(prev => ({
          ...prev,
          email: '',
          studentId: ''
        }));
      }

      // Trigger email validation with debounce
      setTimeout(() => {
        validateEmail(value);
      }, 500);
    } else {
      // Clear field error when user starts typing
      if (fieldErrors[name]) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }

    setFormData(updatedFormData);
  };
  


  // Handle multi-select changes
  const handleMultiSelectChange = (event, fieldName) => {
    const { value } = event.target;
    setFormData({
      ...formData,
      [fieldName]: typeof value === 'string' ? value.split(',') : value
    });

    // Clear field error when user makes selection
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
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

    // Clear field error when user makes selection
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }

    // Special handling for available_days - clear time slots for removed days
    if (fieldName === 'available_days') {
      const updatedHours = { ...formData.available_hours };
      // Remove time slots for days that are no longer selected
      Object.keys(updatedHours).forEach(day => {
        if (!currentItems.includes(day)) {
          delete updatedHours[day];
        }
      });
      setFormData(prev => ({
        ...prev,
        [fieldName]: currentItems,
        available_hours: updatedHours
      }));
      return;
    }
  };

  // Handle time slot toggle for a specific day
  const handleTimeSlotToggle = (day, timeSlotId) => {
    const availableHours = { ...formData.available_hours };
    if (!availableHours[day]) availableHours[day] = [];

    const slotIndex = availableHours[day].indexOf(timeSlotId);
    if (slotIndex === -1) {
      // Add time slot
      availableHours[day].push(timeSlotId);
    } else {
      // Remove time slot
      availableHours[day].splice(slotIndex, 1);
      if (availableHours[day].length === 0) {
        delete availableHours[day];
      }
    }

    setFormData({
      ...formData,
      available_hours: availableHours
    });

    // Clear available_hours error when user makes selection
    if (fieldErrors.available_hours) {
      setFieldErrors(prev => ({
        ...prev,
        available_hours: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Basic required fields validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else {
      // Email domain validation - only accept @student.uitm.edu.my
      const allowedDomain = '@student.uitm.edu.my';
      if (!formData.email.endsWith(allowedDomain)) {
        errors.email = 'This application only accepts @student.uitm.edu.my email addresses';
        isValid = false;
      }
    }

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
      isValid = false;
    }

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
      isValid = false;
    }

    if (!formData.studentId.trim()) {
      errors.studentId = 'Student ID is required - please enter a valid @student.uitm.edu.my email address';
      isValid = false;
    }
    // TEMPORARY: Allow alphanumeric characters for testing with non-student email domains
    // TODO: Restore numeric-only validation for production

    if (!formData.faculty) {
      errors.faculty = 'Faculty selection is required';
      isValid = false;
    }

    if (!formData.state) {
      errors.state = 'State selection is required';
      isValid = false;
    }

    if (!formData.gender) {
      errors.gender = 'Gender selection is required';
      isValid = false;
    }

    if (!formData.birth_date) {
      errors.birth_date = 'Birth date is required';
      isValid = false;
    }

    if (!formData.duration_preference) {
      errors.duration_preference = 'Preferred duration is required';
      isValid = false;
    }

    // Sports preferences validation
    if (!formData.sport_preferences || formData.sport_preferences.length === 0) {
      errors.sport_preferences = 'At least one sport must be selected';
      isValid = false;
    }

    // Play style validation (should always have a default, but check anyway)
    if (!formData.play_style) {
      errors.play_style = 'Play style selection is required';
      isValid = false;
    }

    // Availability validation
    if (!formData.available_days || formData.available_days.length === 0) {
      errors.available_days = 'At least one available day must be selected';
      isValid = false;
    }

    // Available hours validation
    const hasTimeSlots = formData.available_days.some(day =>
      formData.available_hours[day] && formData.available_hours[day].length > 0
    );
    if (formData.available_days.length > 0 && !hasTimeSlots) {
      errors.available_hours = 'At least one time slot must be selected for your available days';
      isValid = false;
    }

    // Preferred facilities validation
    if (!formData.preferred_facilities || formData.preferred_facilities.length === 0) {
      errors.preferred_facilities = 'At least one preferred facility must be selected';
      isValid = false;
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (passwordStrength < 50) {
      errors.password = 'Password is too weak. Please include uppercase letters, numbers, or special characters.';
      isValid = false;
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Terms agreement validation
    if (!agreeToTerms) {
      errors.terms = 'You must agree to the Terms and Conditions';
      isValid = false;
    }

    setFieldErrors(errors);

    if (!isValid) {
      setError('Please complete all required fields before creating your account.');
    } else {
      setError('');
    }

    return isValid;
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
      const sport_preferences = formData.sport_preferences.map(sport =>
        typeof sport === 'string' ? sport : sport.name || sport
      );

      // Convert available_hours to the format expected by the backend
      const convertedHours = [];
      Object.keys(formData.available_hours).forEach(day => {
        formData.available_hours[day].forEach(timeSlotId => {
          const timeSlot = TIME_SLOTS.find(slot => slot.id === timeSlotId);
          if (timeSlot) {
            convertedHours.push({
              day: day,
              start: timeSlot.start,
              end: timeSlot.end
            });
          }
        });
      });

      // Calculate age from birth date
      const age = formData.birth_date ?
        new Date().getFullYear() - formData.birth_date.getFullYear() : 20;

      // Comprehensive user metadata for database trigger
      const userData = {
        // Basic user information
        full_name: formData.fullName,
        username: formData.username,
        student_id: formData.studentId,
        faculty: formData.faculty,
        campus: formData.state, // Use state field for campus value
        gender: formData.gender,
        play_style: formData.play_style,
        age: age,
        birth_date: formData.birth_date ? formData.birth_date.toISOString().split('T')[0] : null,
        duration_preference: formData.duration_preference,

        // Sports and preferences data
        sport_preferences: JSON.stringify(sport_preferences),
        available_days: JSON.stringify(formData.available_days),
        available_hours: JSON.stringify(formData.available_hours),
        preferred_facilities: JSON.stringify(formData.preferred_facilities),

        // Time preferences for recommendation system
        time_preferences: JSON.stringify({
          days: formData.available_days,
          hours: convertedHours
        })
      };
      
      const { data, error } = await signUp(formData.email, formData.password, userData);

      if (error) {
        // Check if this is a case of existing account
        const errorMessage = typeof error === 'string' ? error : error.message || error.toString();

        if (errorMessage.includes('User already registered') ||
            errorMessage.toLowerCase().includes('already exists') ||
            errorMessage.includes('already been registered')) {

          // Show the email dialog with suggestions
          setShowEmailDialog(true);
          throw new Error('This email address is already registered. Please try logging in instead.');
        }

        throw new Error(errorMessage);
      }

      // Registration successful - database trigger will handle profile creation
      if (data?.user) {
        console.log('Registration successful for user:', data.user.email);
        console.log('Database trigger will create user profile automatically');

        // Set verification sent flag to show verification pending screen
        setVerificationSent(true);
        setRegisteredEmail(formData.email);
      } else {
        throw new Error('Registration failed - no user data returned');
      }
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verification pending screen
  if (verificationSent) {
    return (
      <Box sx={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
        {/* Animated Background */}
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            opacity: 0.15, // Subtle background effect
          }}
        >
          <DotGrid
            dotSize={8}
            gap={25}
            baseColor="#9b2c2c"
            activeColor="#b91c1c"
            proximity={120}
            shockRadius={200}
            shockStrength={4}
            resistance={600}
            returnDuration={1.2}
          />
        </Box>

        {/* Verification Content */}
        <Container
          component="main"
          maxWidth="sm"
          sx={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1
          }}
        >
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
            We sent a verification link to <strong>{registeredEmail || formData.email}</strong>
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
    </Box>
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
    <Box sx={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Animated Background */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          opacity: 0.15, // Subtle background effect
        }}
      >
        <DotGrid
          dotSize={8}
          gap={25}
          baseColor="#9b2c2c"
          activeColor="#b91c1c"
          proximity={120}
          shockRadius={200}
          shockStrength={4}
          resistance={600}
          returnDuration={1.2}
        />
      </Box>

      {/* Register Content */}
      <Container
        component="main"
        maxWidth="sm"
        sx={{
          py: 4,
          position: 'relative',
          zIndex: 1
        }}
      >
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
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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
            placeholder="2022812796@student.uitm.edu.my"
            helperText={
              emailValidation.isChecking
                ? "Checking email availability..."
                : emailValidation.error
                  ? emailValidation.error
                  : fieldErrors.email
                    ? fieldErrors.email
                    : "Must be a valid @student.uitm.edu.my email address"
            }
            error={!!fieldErrors.email || !!emailValidation.error}
            InputProps={{
              endAdornment: emailValidation.isChecking ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : null
            }}
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
            helperText={fieldErrors.fullName}
            error={!!fieldErrors.fullName}
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
            helperText={fieldErrors.username || "Choose a unique username (not your student ID)"}
            error={!!fieldErrors.username}
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
            disabled={true}
            helperText={fieldErrors.studentId}
            error={!!fieldErrors.studentId}
            sx={{
              mb: 2,
              '& .MuiInputBase-input.Mui-disabled': {
                backgroundColor: '#f5f5f5',
                WebkitTextFillColor: '#666666'
              },
              '& .MuiOutlinedInput-root.Mui-disabled': {
                backgroundColor: '#f5f5f5'
              }
            }}
          />
          
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }} error={!!fieldErrors.faculty}>
            <InputLabel id="faculty-label">Faculty *</InputLabel>
            <Select
              labelId="faculty-label"
              id="faculty"
              name="faculty"
              value={formData.faculty}
              onChange={handleChange}
              label="Faculty *"
            >
              <MenuItem value="">Select Faculty</MenuItem>
              {facultyOptions.map((faculty) => (
                <MenuItem key={faculty} value={faculty}>
                  {faculty}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.faculty && <FormHelperText>{fieldErrors.faculty}</FormHelperText>}
          </FormControl>
          
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }} error={!!fieldErrors.state}>
            <InputLabel id="state-label">State *</InputLabel>
            <Select
              labelId="state-label"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              label="State *"
            >
              <MenuItem value="">Select State</MenuItem>
              {stateOptions.map((state) => (
                <MenuItem key={state} value={state}>
                  {state}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.state && <FormHelperText>{fieldErrors.state}</FormHelperText>}
          </FormControl>
          
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }} error={!!fieldErrors.gender}>
            <InputLabel id="gender-label">Gender *</InputLabel>
            <Select
              labelId="gender-label"
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              label="Gender *"
            >
              <MenuItem value="">Select Gender</MenuItem>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
              <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
            </Select>
            {fieldErrors.gender && <FormHelperText>{fieldErrors.gender}</FormHelperText>}
          </FormControl>
          
          <Box sx={{ mb: 2 }}>
            <DatePicker
              label="Birth Date *"
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
                  required: true,
                  error: !!fieldErrors.birth_date,
                  helperText: fieldErrors.birth_date || (formData.age ? `Age: ${formData.age} years` : "Select your birth date (must be 18-65 years old)"),
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
          
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }} error={!!fieldErrors.duration_preference}>
            <InputLabel id="duration-label">Preferred Duration *</InputLabel>
            <Select
              labelId="duration-label"
              id="duration_preference"
              name="duration_preference"
              value={formData.duration_preference}
              onChange={handleChange}
              label="Preferred Duration *"
            >
              <MenuItem value="">Select Duration</MenuItem>
              {durationOptions.map((duration) => (
                <MenuItem key={duration} value={duration}>
                  {duration}
                </MenuItem>
              ))}
            </Select>
            {fieldErrors.duration_preference && <FormHelperText>{fieldErrors.duration_preference}</FormHelperText>}
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
              <FormControl fullWidth sx={{ mb: 2 }} error={!!fieldErrors.sport_preferences}>
                <InputLabel id="sports-preferences-label">Sports You Enjoy *</InputLabel>
                <Select
                  labelId="sports-preferences-label"
                  id="sport_preferences"
                  multiple
                  value={formData.sport_preferences}
                  onChange={(e) => handleMultiSelectChange(e, 'sport_preferences')}
                  input={<OutlinedInput label="Sports You Enjoy *" />}
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
                <FormHelperText error={!!fieldErrors.sport_preferences}>
                  {fieldErrors.sport_preferences || "Select sports you're interested in playing"}
                </FormHelperText>
              </FormControl>
              
              <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }} error={!!fieldErrors.play_style}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Play Style *</Typography>
                <RadioGroup
                  row
                  name="play_style"
                  value={formData.play_style}
                  onChange={handleChange}
                >
                  <FormControlLabel value="casual" control={<Radio />} label="Casual" />
                  <FormControlLabel value="competitive" control={<Radio />} label="Competitive" />
                </RadioGroup>
                <FormHelperText error={!!fieldErrors.play_style}>
                  {fieldErrors.play_style || "How do you prefer to play?"}
                </FormHelperText>
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
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Days Available *</Typography>
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
              <FormHelperText error={!!fieldErrors.available_days}>
                {fieldErrors.available_days || "Select days when you're typically available to play"}
              </FormHelperText>

              {/* Time Slots Section */}
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Available Time Slots *</Typography>
              {formData.available_days.length === 0 ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Please select available days first to set your available time slots.
                </Alert>
              ) : (
                <Box sx={{ mb: 2 }}>
                  {formData.available_days.map(day => (
                    <Paper key={day} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                        {formData.available_hours[day]?.length > 0 &&
                          ` (${formData.available_hours[day].length} slot${formData.available_hours[day].length !== 1 ? 's' : ''} selected)`
                        }
                      </Typography>
                      <Grid container spacing={1}>
                        {TIME_SLOTS.map(timeSlot => {
                          const isSelected = formData.available_hours[day]?.includes(timeSlot.id) || false;
                          return (
                            <Grid item xs={12} sm={6} md={4} key={timeSlot.id}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => handleTimeSlotToggle(day, timeSlot.id)}
                                    color="primary"
                                  />
                                }
                                label={
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {timeSlot.label}
                                  </Typography>
                                }
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Paper>
                  ))}
                </Box>
              )}
              <FormHelperText error={!!fieldErrors.available_hours}>
                {fieldErrors.available_hours || "Select time slots when you're available to play"}
              </FormHelperText>
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
              <FormControl fullWidth sx={{ mb: 2 }} error={!!fieldErrors.preferred_facilities}>
                <InputLabel id="facilities-label">Preferred Facilities *</InputLabel>
                <Select
                  labelId="facilities-label"
                  id="preferred_facilities"
                  multiple
                  value={formData.preferred_facilities}
                  onChange={(e) => handleMultiSelectChange(e, 'preferred_facilities')}
                  input={<OutlinedInput label="Preferred Facilities *" />}
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
                <FormHelperText error={!!fieldErrors.preferred_facilities}>
                  {fieldErrors.preferred_facilities || "Select facilities where you prefer to play"}
                </FormHelperText>
              </FormControl>
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
            helperText={fieldErrors.password}
            error={!!fieldErrors.password}
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
            helperText={fieldErrors.confirmPassword}
            error={!!fieldErrors.confirmPassword}
            sx={{ mb: 3 }}
          />
          
          <FormControl error={!!fieldErrors.terms} sx={{ mb: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreeToTerms}
                  onChange={(e) => {
                    setAgreeToTerms(e.target.checked);
                    // Clear terms error when user checks the box
                    if (fieldErrors.terms) {
                      setFieldErrors(prev => ({
                        ...prev,
                        terms: ''
                      }));
                    }
                  }}
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
            />
            {fieldErrors.terms && <FormHelperText>{fieldErrors.terms}</FormHelperText>}
          </FormControl>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading || !isFormValid}
            sx={{
              mb: 2,
              height: 48,
              opacity: (!isFormValid && !isLoading) ? 0.6 : 1
            }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>

          {!isFormValid && !isLoading && (
            <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
              Please complete all required fields to create your account
            </Typography>
          )}
          
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

      {/* Email Already Exists Dialog */}
      <Dialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Email Already Registered
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            The email address <strong>{formData.email}</strong> is already registered and confirmed.
          </Typography>
          {emailValidation.suggestions?.message && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {emailValidation.suggestions.message}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEmailDialog(false)}>
            Cancel
          </Button>
          {emailValidation.suggestions?.secondaryAction && (
            <Button
              onClick={() => {
                setShowEmailDialog(false);
                navigate(emailValidation.suggestions.secondaryAction.url);
              }}
              color="secondary"
            >
              {emailValidation.suggestions.secondaryAction.text}
            </Button>
          )}
          {emailValidation.suggestions?.primaryAction && (
            <Button
              onClick={() => {
                setShowEmailDialog(false);
                navigate(emailValidation.suggestions.primaryAction.url);
              }}
              variant="contained"
              color="primary"
            >
              {emailValidation.suggestions.primaryAction.text}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  </Box>
  );
};

export default Register;
