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
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Stack,
  InputAdornment,
  Container
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
import LockIcon from '@mui/icons-material/Lock';

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
    description: '',
    rules: '',
    is_private: false,
    access_code: ''
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
          description: matchData.description || '',
          rules: matchData.rules || '',
          is_private: matchData.is_private || false,
          access_code: matchData.access_code || ''
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
        description: formData.description,
        rules: formData.rules,
        is_private: formData.is_private,
        access_code: formData.is_private ? formData.access_code : null
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
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Edit Match
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Title */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TitleIcon />
                    </InputAdornment>
                  ),
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
                      <SportsIcon />
                    </InputAdornment>
                  }
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
                      <LocationOnIcon />
                    </InputAdornment>
                  }
                >
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name} ({location.campus})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date Picker */}
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date"
                  value={formData.start_date}
                  onChange={handleDateChange}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            {/* Time Picker */}
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Start Time"
                  value={formData.start_time}
                  onChange={handleTimeChange}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            {/* Duration */}
            <Grid item xs={12} sm={6}>
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
                      <AccessTimeIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

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
                      <PeopleIcon />
                    </InputAdornment>
                  ),
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
                >
                  <MenuItem value="Beginner">Beginner</MenuItem>
                  <MenuItem value="Intermediate">Intermediate</MenuItem>
                  <MenuItem value="Advanced">Advanced</MenuItem>
                  <MenuItem value="All Levels">All Levels</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Private Match Toggle */}
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_private"
                    checked={formData.is_private}
                    onChange={handleChange}
                    color="primary"
                  />
                }
                label="Private Match"
              />
            </Grid>

            {/* Access Code (shown only when is_private is true) */}
            {formData.is_private && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Access Code"
                  name="access_code"
                  value={formData.access_code}
                  onChange={handleChange}
                  helperText="Share this code with people you want to invite"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DescriptionIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Rules */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rules"
                name="rules"
                value={formData.rules}
                onChange={handleChange}
                multiline
                rows={3}
                helperText="Optional: Add any specific rules for this match"
              />
            </Grid>
          </Grid>

          {/* Display any errors */}
          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}

          {/* Form Actions */}
          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={submitting}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
              fullWidth
            >
              {submitting ? <CircularProgress size={24} /> : 'Update Match'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default EditMatch; 