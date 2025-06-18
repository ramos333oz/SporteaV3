import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  TextField,
  Grid,
  Paper,
  FormLabel,
  FormGroup,
  FormControlLabel,
  RadioGroup,
  Radio,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Alert,
  IconButton,
} from '@mui/material';
import {
  AccessTime,
  ExpandMore,
  LocationOn,
  School,
  CalendarMonth,
  SportsScore,
  AddLocationAlt,
  Delete
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { styled } from '@mui/material/styles';

const DayBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  '&.selected': {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    borderColor: theme.palette.primary.main,
  },
}));

const DAYS_OF_WEEK = [
  { day: 'monday', label: 'Mon' },
  { day: 'tuesday', label: 'Tue' },
  { day: 'wednesday', label: 'Wed' },
  { day: 'thursday', label: 'Thu' },
  { day: 'friday', label: 'Fri' },
  { day: 'saturday', label: 'Sat' },
  { day: 'sunday', label: 'Sun' },
];

/**
 * Component for editing user preferences related to match recommendations
 */
const ProfilePreferences = ({ value, onChange, facilities = [] }) => {
  // Initial state structure
  const [preferences, setPreferences] = useState({
    available_days: value?.available_days || [],
    available_hours: value?.available_hours || {},
    preferred_facilities: value?.preferred_facilities || [],
    home_location: value?.home_location || null,
    play_style: value?.play_style || 'casual',
  });

  // Reset preferences when value prop changes
  useEffect(() => {
    setPreferences({
      available_days: value?.available_days || [],
      available_hours: value?.available_hours || {},
      preferred_facilities: value?.preferred_facilities || [],
      home_location: value?.home_location || null,
      play_style: value?.play_style || 'casual',
    });
  }, [value]);

  // Handle available days selection
  const handleDayToggle = (day) => {
    setPreferences(prev => {
      const newDays = [...prev.available_days];
      const dayIndex = newDays.indexOf(day);
      
      if (dayIndex === -1) {
        newDays.push(day);
      } else {
        newDays.splice(dayIndex, 1);
      }
      
      const updated = { ...prev, available_days: newDays };
      if (onChange) {
        onChange(updated);
      }
      return updated;
    });
  };

  // Handle time range changes for a specific day
  const handleTimeChange = (day, index, field, value) => {
    setPreferences(prev => {
      // Ensure the structure exists
      const availableHours = { ...prev.available_hours };
      if (!availableHours[day]) availableHours[day] = [];
      if (!availableHours[day][index]) availableHours[day][index] = { start: '09:00', end: '17:00' };
      
      // Format time as HH:MM
      const formattedTime = value instanceof Date 
        ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` 
        : value;
      
      // Update the specific field
      availableHours[day][index] = {
        ...availableHours[day][index],
        [field]: formattedTime
      };
      
      const updated = { ...prev, available_hours: availableHours };
      if (onChange) {
        onChange(updated);
      }
      return updated;
    });
  };

  // Add a new time range for a day
  const addTimeRange = (day) => {
    setPreferences(prev => {
      const availableHours = { ...prev.available_hours };
      if (!availableHours[day]) availableHours[day] = [];
      
      availableHours[day].push({ start: '09:00', end: '17:00' });
      
      const updated = { ...prev, available_hours: availableHours };
      if (onChange) {
        onChange(updated);
      }
      return updated;
    });
  };

  // Remove a time range for a day
  const removeTimeRange = (day, index) => {
    setPreferences(prev => {
      const availableHours = { ...prev.available_hours };
      if (!availableHours[day]) return prev;
      
      availableHours[day].splice(index, 1);
      if (availableHours[day].length === 0) delete availableHours[day];
      
      const updated = { ...prev, available_hours: availableHours };
      if (onChange) {
        onChange(updated);
      }
      return updated;
    });
  };

  // Handle facility selection
  const handleFacilityChange = (event) => {
    const { value } = event.target;
    setPreferences(prev => {
      const updated = { ...prev, preferred_facilities: value };
      if (onChange) {
        onChange(updated);
      }
      return updated;
    });
  };

  // Handle play style change
  const handlePlayStyleChange = (event) => {
    const { value } = event.target;
    setPreferences(prev => {
      const updated = { ...prev, play_style: value };
      if (onChange) {
        onChange(updated);
      }
      return updated;
    });
  };

  // Convert time string to Date object for TimePicker
  const parseTimeString = (timeStr) => {
    if (!timeStr) return new Date();
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <CalendarMonth sx={{ mr: 1 }} />
          Available Days
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          {DAYS_OF_WEEK.map(({ day, label }) => (
            <DayBox
              key={day}
              className={preferences.available_days.includes(day) ? 'selected' : ''}
              onClick={() => handleDayToggle(day)}
            >
              <Typography variant="body2">{label}</Typography>
            </DayBox>
          ))}
        </Box>

        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <AccessTime sx={{ mr: 1 }} />
          Available Hours
        </Typography>
        
        {preferences.available_days.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Please select available days first to set your available hours.
          </Alert>
        ) : (
          <Box sx={{ mb: 3 }}>
            {preferences.available_days.map(day => (
              <Accordion key={day} defaultExpanded={false}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>
                    {day.charAt(0).toUpperCase() + day.slice(1)} Hours
                    {preferences.available_hours[day]?.length > 0 && 
                      ` (${preferences.available_hours[day].length} time slot${preferences.available_hours[day].length !== 1 ? 's' : ''})`
                    }
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {preferences.available_hours[day]?.map((range, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                      <TimePicker
                        label="Start Time"
                        value={parseTimeString(range.start)}
                        onChange={(newValue) => handleTimeChange(day, index, 'start', newValue)}
                        renderInput={(params) => <TextField size="small" {...params} />}
                      />
                      <Typography>to</Typography>
                      <TimePicker
                        label="End Time"
                        value={parseTimeString(range.end)}
                        onChange={(newValue) => handleTimeChange(day, index, 'end', newValue)}
                        renderInput={(params) => <TextField size="small" {...params} />}
                      />
                      <IconButton 
                        color="error" 
                        onClick={() => removeTimeRange(day, index)}
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  ))}
                  <Button 
                    variant="outlined" 
                    startIcon={<AccessTime />}
                    onClick={() => addTimeRange(day)}
                    size="small"
                  >
                    Add Time Slot
                  </Button>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <LocationOn sx={{ mr: 1 }} />
          Preferred Facilities
        </Typography>
        <FormControl sx={{ mb: 3, width: '100%' }}>
          <InputLabel id="facilities-label">Preferred Facilities</InputLabel>
          <Select
            labelId="facilities-label"
            multiple
            value={preferences.preferred_facilities}
            onChange={handleFacilityChange}
            input={<OutlinedInput label="Preferred Facilities" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => {
                  const facility = facilities.find(f => f.id === value);
                  return (
                    <Chip 
                      key={value} 
                      label={facility?.name || value} 
                      size="small"
                      icon={<LocationOn />}
                    />
                  );
                })}
              </Box>
            )}
          >
            {facilities.map((facility) => (
              <MenuItem key={facility.id} value={facility.id}>
                <Checkbox checked={preferences.preferred_facilities.indexOf(facility.id) > -1} />
                <ListItemText primary={facility.name} secondary={facility.address} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SportsScore sx={{ mr: 1 }} />
          Play Style Preference
        </Typography>
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <RadioGroup
            value={preferences.play_style || 'casual'}
            onChange={handlePlayStyleChange}
            row
          >
            <FormControlLabel 
              value="casual" 
              control={<Radio />} 
              label="Casual - I play for fun and social interaction" 
            />
            <FormControlLabel 
              value="competitive" 
              control={<Radio />} 
              label="Competitive - I play to win and improve my skills" 
            />
          </RadioGroup>
        </FormControl>
      </Box>
    </LocalizationProvider>
  );
};

export default ProfilePreferences; 