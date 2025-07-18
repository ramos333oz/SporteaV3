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
  Grid,
  Paper,
  FormControlLabel,
  RadioGroup,
  Radio,
  Alert,
} from '@mui/material';
import {
  AccessTime,
  LocationOn,
  CalendarMonth,
  SportsScore,
} from '@mui/icons-material';
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

// Predefined time slots for KNN recommendation system
const TIME_SLOTS = [
  { id: '9-11', label: '9:00 AM - 11:00 AM', start: '09:00', end: '11:00' },
  { id: '11-13', label: '11:00 AM - 1:00 PM', start: '11:00', end: '13:00' },
  { id: '13-15', label: '1:00 PM - 3:00 PM', start: '13:00', end: '15:00' },
  { id: '15-17', label: '3:00 PM - 5:00 PM', start: '15:00', end: '17:00' },
  { id: '17-19', label: '5:00 PM - 7:00 PM', start: '17:00', end: '19:00' },
  { id: '19-21', label: '7:00 PM - 9:00 PM', start: '19:00', end: '21:00' },
  { id: '21-23', label: '9:00 PM - 11:00 PM', start: '21:00', end: '23:00' },
];

// Migration function to convert old time format to new time slot format
const migrateAvailableHours = (availableHours) => {
  if (!availableHours || typeof availableHours !== 'object') return {};

  const migratedHours = {};

  Object.keys(availableHours).forEach(day => {
    if (Array.isArray(availableHours[day])) {
      // Check if it's old format (objects with start/end) or new format (strings)
      const timeSlots = availableHours[day];

      if (timeSlots.length > 0 && typeof timeSlots[0] === 'object' && timeSlots[0].start) {
        // Old format - convert to new format
        migratedHours[day] = [];
        timeSlots.forEach(slot => {
          // Find matching predefined time slot
          const matchingSlot = TIME_SLOTS.find(ts =>
            ts.start === slot.start && ts.end === slot.end
          );
          if (matchingSlot) {
            migratedHours[day].push(matchingSlot.id);
          }
        });
      } else {
        // New format - use as is
        migratedHours[day] = timeSlots.filter(slot =>
          TIME_SLOTS.some(ts => ts.id === slot)
        );
      }
    }
  });

  return migratedHours;
};

/**
 * Component for editing user preferences related to match recommendations
 */
const ProfilePreferences = ({ value, onChange, facilities = [] }) => {
  // Initial state structure
  const [preferences, setPreferences] = useState({
    available_days: value?.available_days || [],
    available_hours: migrateAvailableHours(value?.available_hours) || {},
    preferred_facilities: value?.preferred_facilities || [],
    home_location: value?.home_location || null,
    play_style: value?.play_style || 'casual',
  });

  // Reset preferences when value prop changes
  useEffect(() => {
    setPreferences({
      available_days: value?.available_days || [],
      available_hours: migrateAvailableHours(value?.available_hours) || {},
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
        // Remove time slots for this day when day is deselected
        const availableHours = { ...prev.available_hours };
        delete availableHours[day];
        const updated = { ...prev, available_days: newDays, available_hours: availableHours };
        if (onChange) {
          onChange(updated);
        }
        return updated;
      }

      const updated = { ...prev, available_days: newDays };
      if (onChange) {
        onChange(updated);
      }
      return updated;
    });
  };

  // Handle time slot toggle for a specific day
  const handleTimeSlotToggle = (day, timeSlotId) => {
    setPreferences(prev => {
      const availableHours = { ...prev.available_hours };
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

  return (
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
          Available Time Slots
        </Typography>

        {preferences.available_days.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Please select available days first to set your available time slots.
          </Alert>
        ) : (
          <Box sx={{ mb: 3 }}>
            {preferences.available_days.map(day => (
              <Paper key={day} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                  {preferences.available_hours[day]?.length > 0 &&
                    ` (${preferences.available_hours[day].length} slot${preferences.available_hours[day].length !== 1 ? 's' : ''} selected)`
                  }
                </Typography>
                <Grid container spacing={1}>
                  {TIME_SLOTS.map(timeSlot => {
                    const isSelected = preferences.available_hours[day]?.includes(timeSlot.id) || false;
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
                          sx={{
                            m: 0,
                            p: 1,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: isSelected ? 'primary.main' : 'divider',
                            backgroundColor: isSelected ? 'primary.light' : 'transparent',
                            '&:hover': {
                              backgroundColor: isSelected ? 'primary.light' : 'action.hover',
                            },
                            transition: 'all 0.2s ease',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        />
                      </Grid>
                    );
                  })}
                </Grid>
              </Paper>
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
  );
};

export default ProfilePreferences; 