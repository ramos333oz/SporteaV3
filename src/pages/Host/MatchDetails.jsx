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
    // Clean the title to remove any unwanted placeholder text or IDs
    let cleanTitle = event.target.value;

    // Remove UUID patterns that might appear in the title
    cleanTitle = cleanTitle.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '');

    // Remove "Court A1" or similar court references if they appear
    cleanTitle = cleanTitle.replace(/\s*\(?\s*Court\s+[A-Z]\d+\s*\)?\s*/gi, '');

    // Clean up excessive spaces (3 or more consecutive spaces) but preserve normal spacing
    cleanTitle = cleanTitle.replace(/\s{3,}/g, ' ').trim();

    onUpdateMatchData({ title: cleanTitle });
  };
  
  const handleDescriptionChange = (event) => {
    // Clean the description to remove any unwanted court references
    let cleanDescription = event.target.value;

    // Remove "Court A1" or similar court references if they appear
    cleanDescription = cleanDescription.replace(/\s*\(?\s*Court\s+[A-Z]\d+\s*\)?\s*/gi, '');

    // Clean up excessive spaces (3 or more consecutive spaces) but preserve normal spacing and line breaks
    cleanDescription = cleanDescription.replace(/[ \t]{3,}/g, ' ').replace(/^\s{3,}|\s{3,}$/gm, '');

    onUpdateMatchData({ description: cleanDescription });
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
          Provide essential information about your {matchData.sportName || matchData.sportDisplayName || 'sport'} match to help potential participants decide if they want to join.
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
              placeholder={`${(matchData.sportName || matchData.sportDisplayName || 'Sport')} match at UiTM`}
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
              value={matchData.description || ''}
              onChange={handleDescriptionChange}
              placeholder="Provide details about your match, rules, equipment needed, etc."
              multiline
              rows={4}
              sx={{
                '& .MuiInputBase-root': {
                  alignItems: 'flex-start',
                },
                '& .MuiInputAdornment-root': {
                  alignSelf: 'flex-start',
                  marginTop: '14px',
                },
                '& .MuiInputBase-input': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                }
              }}
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
              helperText={`Minimum ${matchData.minParticipants} participants required for ${matchData.sportName || matchData.sportDisplayName || 'this sport'}`}
            />
          </Grid>
          

        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default MatchDetails;
