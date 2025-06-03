import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Slider,
  InputAdornment
} from '@mui/material';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TitleIcon from '@mui/icons-material/Title';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleIcon from '@mui/icons-material/People';
import { format, addDays, addHours, isBefore } from 'date-fns';

const MatchDetails = ({ matchData, onUpdateMatchData }) => {
  const minDate = new Date();
  const maxDate = addDays(new Date(), 30); // Allow booking up to 30 days in advance
  
  // Initialize default values if they don't exist
  React.useEffect(() => {
    if (!matchData.date) {
      onUpdateMatchData({ date: addDays(new Date(), 1) });
    }
    if (!matchData.time) {
      onUpdateMatchData({ time: addHours(new Date(), 3) });
    }
  }, [matchData.date, matchData.time, onUpdateMatchData]);
  
  const handleTitleChange = (event) => {
    onUpdateMatchData({ title: event.target.value });
  };
  
  const handleDescriptionChange = (event) => {
    onUpdateMatchData({ description: event.target.value });
  };
  
  const handleDateChange = (newDate) => {
    onUpdateMatchData({ date: newDate });
  };
  
  const handleTimeChange = (newTime) => {
    onUpdateMatchData({ time: newTime });
  };
  
  const handleDurationChange = (event, newValue) => {
    onUpdateMatchData({ duration: newValue });
  };
  
  const handleSkillLevelChange = (event) => {
    onUpdateMatchData({ skillLevel: event.target.value });
  };
  
  const handleMaxParticipantsChange = (event) => {
    const value = parseInt(event.target.value, 10);
    if (value >= matchData.minParticipants && value <= 100) {
      onUpdateMatchData({ maxParticipants: value });
    }
  };
  
  const handlePrivateChange = (event) => {
    onUpdateMatchData({ isPrivate: event.target.checked });
  };
  
  // Format the value for the duration slider
  const valueLabelFormat = (value) => {
    if (value < 60) {
      return `${value} min`;
    }
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
  };
  
  // Check if the selected date and time is in the future
  const isValidDateTime = () => {
    if (!matchData.date || !matchData.time) return true; // No validation if not set yet
    
    const selectedDateTime = new Date(
      matchData.date.getFullYear(),
      matchData.date.getMonth(),
      matchData.date.getDate(),
      matchData.time.getHours(),
      matchData.time.getMinutes()
    );
    
    return isBefore(new Date(), selectedDateTime);
  };
  
  // Get default values for date and time if not set
  const getDefaultDate = () => {
    if (!matchData.date) {
      // Set a default date if not already set
      setTimeout(() => {
        onUpdateMatchData({ date: addDays(new Date(), 1) });
      }, 0);
    }
    return matchData.date || addDays(new Date(), 1);
  };
  
  const getDefaultTime = () => {
    if (!matchData.time) {
      // Set a default time if not already set
      setTimeout(() => {
        onUpdateMatchData({ time: addHours(new Date(), 3) });
      }, 0);
    }
    return matchData.time || addHours(new Date(), 3);
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h2" component="h2" gutterBottom>
          Match Details
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Provide essential information about your {matchData.sport} match to help potential participants decide if they want to join.
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Match Title */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              id="match-title"
              label="Match Title"
              value={matchData.title}
              onChange={handleTitleChange}
              placeholder={`${matchData.sport.charAt(0).toUpperCase() + matchData.sport.slice(1)} match at UiTM`}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TitleIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          {/* Match Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              id="match-description"
              label="Description"
              value={matchData.description}
              onChange={handleDescriptionChange}
              placeholder="Provide details about your match, rules, equipment needed, etc."
              multiline
              rows={4}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DescriptionIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          {/* Date and Time */}
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Date"
              value={getDefaultDate()}
              onChange={handleDateChange}
              slots={{
                textField: TextField
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EventIcon />
                      </InputAdornment>
                    )
                  }
                }
              }}
              minDate={minDate}
              maxDate={maxDate}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TimePicker
              label="Start Time"
              value={getDefaultTime()}
              onChange={handleTimeChange}
              slots={{
                textField: TextField
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: !isValidDateTime(),
                  helperText: !isValidDateTime() ? "Start time must be in the future" : "",
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccessTimeIcon />
                      </InputAdornment>
                    )
                  }
                }
              }}
            />
          </Grid>
          
          {/* Duration */}
          <Grid item xs={12}>
            <Typography variant="body1" gutterBottom>
              Duration
            </Typography>
            <Slider
              value={matchData.duration}
              onChange={handleDurationChange}
              valueLabelDisplay="auto"
              valueLabelFormat={valueLabelFormat}
              step={15}
              marks={[
                { value: 30, label: '30m' },
                { value: 60, label: '1h' },
                { value: 120, label: '2h' },
                { value: 180, label: '3h' },
              ]}
              min={30}
              max={180}
            />
          </Grid>
          
          {/* Skill Level */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="skill-level-label">Skill Level</InputLabel>
              <Select
                labelId="skill-level-label"
                id="skill-level"
                value={matchData.skillLevel}
                label="Skill Level"
                onChange={handleSkillLevelChange}
              >
                <MenuItem value="Beginner">Beginner - Just starting out</MenuItem>
                <MenuItem value="Intermediate">Intermediate - Casual player</MenuItem>
                <MenuItem value="Professional">Professional - Competitive level</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Max Participants */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              id="max-participants"
              label="Maximum Participants"
              type="number"
              value={matchData.maxParticipants}
              onChange={handleMaxParticipantsChange}
              InputProps={{
                inputProps: { min: matchData.minParticipants, max: 100 },
                startAdornment: (
                  <InputAdornment position="start">
                    <PeopleIcon />
                  </InputAdornment>
                ),
              }}
              helperText={`Minimum ${matchData.minParticipants} participants required for ${matchData.sport}`}
            />
          </Grid>
          
          {/* Private Match Switch */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={matchData.isPrivate}
                  onChange={handlePrivateChange}
                  color="primary"
                />
              }
              label="Private Match (invitation only)"
            />
            {matchData.isPrivate && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Private matches will not appear in search results. You'll need to invite participants directly.
              </Typography>
            )}
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default MatchDetails;
