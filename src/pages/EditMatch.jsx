import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Stack,
  InputAdornment,
  Container,
  Divider
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { addHours, format, parseISO } from 'date-fns';
import SportsIcon from '@mui/icons-material/Sports';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TitleIcon from '@mui/icons-material/Title';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TimerIcon from '@mui/icons-material/Timer';

import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { matchService } from '../services/supabase';
import { invalidateAllCache } from '../services/simplifiedRecommendationService';

const EditMatch = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    sport_id: '',
    location_id: '',
    start_date: new Date(),
    start_time: new Date(),
    duration_minutes: 60,
    max_participants: 10,
    skill_level: 'Intermediate',
    description: ''
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sports, setSports] = useState([]);
  const [locations, setLocations] = useState([]);
  const [originalMatch, setOriginalMatch] = useState(null);

  // Load match data
  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        setLoading(true);
        
        // Fetch match details
        const matchData = await matchService.getMatch(matchId);
        setOriginalMatch(matchData);
        
        if (!matchData) {
          setError('Match not found');
          return;
        }
        
        // Check if user is the host
        if (matchData.host_id !== user?.id) {
          setError('You are not authorized to edit this match');
          return;
        }

        // Parse dates from the match data
        const startTime = parseISO(matchData.start_time);
        const endTime = parseISO(matchData.end_time);
        const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

        // Update form data with match details
        setFormData({
          title: matchData.title || '',
          sport_id: matchData.sport_id || '',
          location_id: matchData.location_id || '',
          start_date: startTime || new Date(),
          start_time: startTime || new Date(),
          duration_minutes: durationMinutes || 60,
          max_participants: matchData.max_participants || 10,
          skill_level: matchData.skill_level || 'Intermediate',
          description: matchData.description || ''
        });

        // Fetch sports and locations for dropdowns
        const [sportsData, locationsData] = await Promise.all([
          fetchSports(),
          fetchLocations()
        ]);

        setSports(sportsData);
        setLocations(locationsData);
      } catch (err) {
        console.error('Error loading match data:', err);
        setError('Failed to load match data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (matchId && user) {
      fetchMatchData();
    }
  }, [matchId, user]);

  // Fetch sports for dropdown
  const fetchSports = async () => {
    try {
      const { data, error } = await matchService.supabase
        .from('sports')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching sports:', err);
      return [];
    }
  };

  // Fetch locations for dropdown
  const fetchLocations = async () => {
    try {
      const { data, error } = await matchService.supabase
        .from('locations')
        .select('id, name, campus')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching locations:', err);
      return [];
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle date/time picker changes
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      start_date: date
    }));
  };

  const handleTimeChange = (time) => {
    setFormData(prev => ({
      ...prev,
      start_time: time
    }));
  };

  // Calculate end time based on start time and duration
  const calculateEndTime = () => {
    const combinedDateTime = new Date(
      formData.start_date.getFullYear(),
      formData.start_date.getMonth(),
      formData.start_date.getDate(),
      formData.start_time.getHours(),
      formData.start_time.getMinutes()
    );
    
    return addHours(combinedDateTime, formData.duration_minutes / 60);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);

      // Validate form data
      if (!formData.title) {
        setError('Please enter a title');
        return;
      }

      if (!formData.sport_id) {
        setError('Please select a sport');
        return;
      }

      if (!formData.location_id) {
        setError('Please select a location');
        return;
      }

      // Combine date and time for start_time
      const startDateTime = new Date(
        formData.start_date.getFullYear(),
        formData.start_date.getMonth(),
        formData.start_date.getDate(),
        formData.start_time.getHours(),
        formData.start_time.getMinutes()
      );

      // Calculate end_time based on duration
      const endDateTime = addHours(startDateTime, formData.duration_minutes / 60);

      // Prepare match data for update
      const matchData = {
        title: formData.title,
        sport_id: formData.sport_id,
        location_id: formData.location_id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        max_participants: parseInt(formData.max_participants, 10),
        skill_level: formData.skill_level,
        description: formData.description
      };

      // Update match in database
      await matchService.updateMatch(matchId, matchData);

      // Invalidate all recommendation caches since match details changed
      try {
        invalidateAllCache();
        console.log('All recommendation caches invalidated after match update');

        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('sportea:match-updated', {
          detail: { matchId }
        }));
      } catch (cacheError) {
        console.warn('Failed to invalidate recommendation caches:', cacheError);
        // Don't fail the entire operation if cache invalidation fails
      }

      showSuccessToast('Match Updated', 'Your match has been updated successfully');
      navigate(`/match/${matchId}`);
    } catch (err) {
      console.error('Error updating match:', err);
      setError('Failed to update match. Please try again.');
      showErrorToast('Update Failed', 'There was a problem updating your match');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel editing and go back to match details
  const handleCancel = () => {
    navigate(`/match/${matchId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate(`/match/${matchId}`)}
        >
          Back to Match
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={2}
        sx={{
          p: 4,
          borderRadius: 2,
          bgcolor: 'grey.50',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            mb: 4,
            fontWeight: 600,
            color: 'text.primary',
            fontFamily: 'Libre Baskerville, serif'
          }}
        >
          Edit Match
        </Typography>

        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontWeight: 600,
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <TitleIcon sx={{ fontSize: '1.2rem' }} />
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              {/* Title */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Match Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TitleIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    }
                  }}
                />
              </Grid>

              {/* Sport */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Sport</InputLabel>
                  <Select
                    name="sport_id"
                    value={formData.sport_id}
                    onChange={handleChange}
                    startAdornment={
                      <InputAdornment position="start">
                        <SportsIcon color="action" />
                      </InputAdornment>
                    }
                    sx={{
                      borderRadius: 1.5,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderRadius: 1.5,
                      }
                    }}
                  >
                    {sports.map((sport) => (
                      <MenuItem key={sport.id} value={sport.id}>
                        {sport.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Location */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Location</InputLabel>
                  <Select
                    name="location_id"
                    value={formData.location_id}
                    onChange={handleChange}
                    startAdornment={
                      <InputAdornment position="start">
                        <LocationOnIcon color="action" />
                      </InputAdornment>
                    }
                    sx={{
                      borderRadius: 1.5,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderRadius: 1.5,
                      }
                    }}
                  >
                    {locations.map((location) => (
                      <MenuItem key={location.id} value={location.id}>
                        {location.name} ({location.campus})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Schedule Section */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontWeight: 600,
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <ScheduleIcon sx={{ fontSize: '1.2rem' }} />
              Schedule
            </Typography>
            <Grid container spacing={2}>
              {/* Date Picker */}
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Date"
                    value={formData.start_date}
                    onChange={handleDateChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        InputProps: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarTodayIcon color="action" />
                            </InputAdornment>
                          ),
                        },
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                          }
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              {/* Time Picker */}
              <Grid item xs={12} sm={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <TimePicker
                    label="Start Time"
                    value={formData.start_time}
                    onChange={handleTimeChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        InputProps: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <AccessTimeIcon color="action" />
                            </InputAdornment>
                          ),
                        },
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5,
                          }
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              {/* Duration */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  name="duration_minutes"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TimerIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Participants Section */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontWeight: 600,
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <PeopleIcon sx={{ fontSize: '1.2rem' }} />
              Participants
            </Typography>
            <Grid container spacing={2}>
              {/* Max Participants */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Participants"
                  name="max_participants"
                  type="number"
                  value={formData.max_participants}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PeopleIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    }
                  }}
                />
              </Grid>

              {/* Skill Level */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Skill Level</InputLabel>
                  <Select
                    name="skill_level"
                    value={formData.skill_level}
                    onChange={handleChange}
                    startAdornment={
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    }
                    sx={{
                      borderRadius: 1.5,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderRadius: 1.5,
                      }
                    }}
                  >
                    <MenuItem value="Beginner">Beginner</MenuItem>
                    <MenuItem value="Intermediate">Intermediate</MenuItem>
                    <MenuItem value="Advanced">Advanced</MenuItem>
                    <MenuItem value="All Levels">All Levels</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Additional Details Section */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontWeight: 600,
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <DescriptionIcon sx={{ fontSize: '1.2rem' }} />
              Additional Details
            </Typography>
            <Grid container spacing={2}>
              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  multiline
                  rows={4}
                  placeholder="Describe your match, any special requirements, or additional information..."
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                        <DescriptionIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1.5,
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Display any errors */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 1.5,
                '& .MuiAlert-message': {
                  fontWeight: 500
                }
              }}
            >
              {error}
            </Alert>
          )}

          {/* Form Actions */}
          <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={submitting}
                sx={{
                  minWidth: 120,
                  borderRadius: 1.5,
                  fontWeight: 500,
                  textTransform: 'none',
                  borderColor: 'grey.300',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover'
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                sx={{
                  minWidth: 140,
                  borderRadius: 1.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    boxShadow: '0 4px 12px rgba(155, 44, 44, 0.3)'
                  },
                  '&:disabled': {
                    bgcolor: 'grey.300'
                  }
                }}
              >
                {submitting ? (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CircularProgress size={20} color="inherit" />
                    <span>Updating...</span>
                  </Stack>
                ) : (
                  'Update Match'
                )}
              </Button>
            </Stack>
          </Paper>
        </form>
      </Paper>
    </Container>
  );
};

export default EditMatch; 