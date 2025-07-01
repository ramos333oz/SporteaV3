import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Alert,
  AlertTitle,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Collapse,
  CircularProgress,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { matchService } from '../../services/supabase';
import { format } from 'date-fns';

const ValidationStatus = ({ matchData, onValidationChange }) => {
  const [validationStatus, setValidationStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [rateLimits, setRateLimits] = useState(null);

  // Check validation status when match data changes
  useEffect(() => {
    if (matchData.location && matchData.sport && matchData.date && matchData.time) {
      checkValidation();
    }
  }, [matchData.location, matchData.sport, matchData.date, matchData.time]);

  // Load rate limits on component mount
  useEffect(() => {
    loadRateLimits();
  }, []);

  const loadRateLimits = async () => {
    try {
      const result = await matchService.checkRateLimits();
      if (result.data) {
        setRateLimits(result.data);
      }
    } catch (error) {
      console.error('Error loading rate limits:', error);
    }
  };

  const checkValidation = async () => {
    setLoading(true);
    try {
      // Prepare match data for validation
      const startDateTime = new Date(matchData.date);
      if (matchData.time) {
        const timeDate = new Date(matchData.time);
        startDateTime.setHours(timeDate.getHours(), timeDate.getMinutes());
      }
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + (matchData.duration || 60));

      const validationData = {
        location_id: matchData.location.id,
        sport_id: matchData.sport_id || matchData.sport?.id || matchData.sport,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString()
      };

      const result = await matchService.validateMatchCreation(validationData);
      
      if (result.data) {
        setValidationStatus(result.data);
        setRateLimits(result.data.rate_limits);
        
        // Notify parent component about validation status
        if (onValidationChange) {
          onValidationChange(result.data.can_create && !hasRateLimitIssues(result.data.rate_limits));
        }
      }
    } catch (error) {
      console.error('Error checking validation:', error);
      setValidationStatus({ error: error.message });
      if (onValidationChange) {
        onValidationChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const hasRateLimitIssues = (limits) => {
    if (!limits) return false;
    return limits.cooldown?.active || 
           limits.daily?.remaining <= 0 || 
           limits.weekly?.remaining <= 0 || 
           limits.monthly?.remaining <= 0;
  };

  const formatTimeRemaining = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return format(date, 'MMM d, yyyy \'at\' h:mm a');
  };

  const getRateLimitStatus = () => {
    if (!rateLimits) return null;

    const issues = [];
    
    if (rateLimits.cooldown?.active) {
      issues.push({
        type: 'error',
        title: 'Cooldown Period Active',
        message: `You must wait ${Math.ceil(rateLimits.cooldown.remaining_minutes)} minutes before hosting another match`,
        nextAvailable: rateLimits.cooldown.next_available_time
      });
    }

    if (rateLimits.daily?.remaining <= 0) {
      issues.push({
        type: 'error',
        title: 'Daily Limit Reached',
        message: `You've reached your daily limit of ${rateLimits.daily.limit} matches`,
        nextAvailable: rateLimits.daily.reset_time
      });
    }

    if (rateLimits.weekly?.remaining <= 0) {
      issues.push({
        type: 'error',
        title: 'Weekly Limit Reached',
        message: `You've reached your weekly limit of ${rateLimits.weekly.limit} matches`,
        nextAvailable: rateLimits.weekly.reset_time
      });
    }

    if (rateLimits.monthly?.remaining <= 0) {
      issues.push({
        type: 'error',
        title: 'Monthly Limit Reached',
        message: `You've reached your monthly limit of ${rateLimits.monthly.limit} matches`,
        nextAvailable: rateLimits.monthly.reset_time
      });
    }

    return issues;
  };

  const getConflictStatus = () => {
    if (!validationStatus?.conflicts) return null;

    if (validationStatus.conflicts.has_conflict) {
      return {
        type: 'error',
        title: 'Court Booking Conflict',
        message: validationStatus.conflicts.message,
        conflicts: validationStatus.conflicts.conflicts,
        suggestions: validationStatus.conflicts.suggestions
      };
    }

    return {
      type: 'success',
      title: 'No Conflicts Found',
      message: 'This court is available for your selected time'
    };
  };

  if (loading) {
    return (
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} />
          <Typography>Checking availability and rate limits...</Typography>
        </Box>
      </Paper>
    );
  }

  const rateLimitIssues = getRateLimitStatus();
  const conflictStatus = getConflictStatus();
  const hasIssues = (rateLimitIssues && rateLimitIssues.length > 0) || 
                   (conflictStatus && conflictStatus.type === 'error');

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h3" component="h3">
          Validation Status
        </Typography>
        <Button
          onClick={() => setShowDetails(!showDetails)}
          endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          size="small"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
      </Box>

      {/* Rate Limit Issues */}
      {rateLimitIssues && rateLimitIssues.map((issue, index) => (
        <Alert 
          key={index}
          severity={issue.type} 
          sx={{ mb: 2 }}
          icon={<ErrorIcon />}
        >
          <AlertTitle>{issue.title}</AlertTitle>
          {issue.message}
          {issue.nextAvailable && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Next available: {formatTimeRemaining(issue.nextAvailable)}
            </Typography>
          )}
        </Alert>
      ))}

      {/* Conflict Status */}
      {conflictStatus && (
        <Alert 
          severity={conflictStatus.type} 
          sx={{ mb: 2 }}
          icon={conflictStatus.type === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
        >
          <AlertTitle>{conflictStatus.title}</AlertTitle>
          {conflictStatus.message}
          
          {conflictStatus.conflicts && conflictStatus.conflicts.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={500}>Conflicting matches:</Typography>
              {conflictStatus.conflicts.map((conflict, index) => (
                <Typography key={index} variant="body2" sx={{ ml: 1 }}>
                  • {conflict.title} by {conflict.host_name} ({format(new Date(conflict.start_time), 'h:mm a')} - {format(new Date(conflict.end_time), 'h:mm a')})
                </Typography>
              ))}
            </Box>
          )}
          
          {conflictStatus.suggestions && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={500}>Suggestions:</Typography>
              {conflictStatus.suggestions.alternative_times && conflictStatus.suggestions.alternative_times.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">Alternative times:</Typography>
                  {conflictStatus.suggestions.alternative_times.map((time, index) => (
                    <Chip 
                      key={index}
                      label={`${format(new Date(time.start_time), 'h:mm a')} - ${format(new Date(time.end_time), 'h:mm a')}`}
                      size="small"
                      sx={{ mr: 1, mt: 0.5 }}
                    />
                  ))}
                </Box>
              )}
              
              {conflictStatus.suggestions.alternative_courts && conflictStatus.suggestions.alternative_courts.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">Alternative courts:</Typography>
                  {conflictStatus.suggestions.alternative_courts.map((court, index) => (
                    <Chip 
                      key={index}
                      label={court.name}
                      size="small"
                      sx={{ mr: 1, mt: 0.5 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Alert>
      )}

      {/* Success Status */}
      {!hasIssues && rateLimits && (
        <Alert severity="success" icon={<CheckCircleIcon />}>
          <AlertTitle>Ready to Create Match</AlertTitle>
          All validations passed. You can create this match.
        </Alert>
      )}

      {/* Rate Limit Details */}
      <Collapse in={showDetails}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h4" gutterBottom>Rate Limit Status</Typography>
        
        {rateLimits && (
          <List dense>
            <ListItem>
              <ListItemIcon>
                <AccessTimeIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Daily Hosting"
                secondary={`${rateLimits.daily?.current || 0} / ${rateLimits.daily?.limit || 2} matches (${rateLimits.daily?.remaining || 0} remaining)`}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <AccessTimeIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Weekly Hosting"
                secondary={`${rateLimits.weekly?.current || 0} / ${rateLimits.weekly?.limit || 10} matches (${rateLimits.weekly?.remaining || 0} remaining)`}
              />
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <AccessTimeIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Monthly Hosting"
                secondary={`${rateLimits.monthly?.current || 0} / ${rateLimits.monthly?.limit || 30} matches (${rateLimits.monthly?.remaining || 0} remaining)`}
              />
            </ListItem>
            
            {rateLimits.cooldown && (
              <ListItem>
                <ListItemIcon>
                  <AccessTimeIcon color={rateLimits.cooldown.active ? "error" : "success"} />
                </ListItemIcon>
                <ListItemText
                  primary="Cooldown Period"
                  secondary={
                    rateLimits.cooldown.active 
                      ? `Active - ${Math.ceil(rateLimits.cooldown.remaining_minutes)} minutes remaining`
                      : "Not active"
                  }
                />
              </ListItem>
            )}
          </List>
        )}
      </Collapse>
    </Paper>
  );
};

export default ValidationStatus;
