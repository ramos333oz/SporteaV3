import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Stepper,
  Step,
  StepLabel,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SportSelection from './SportSelection';
import MatchDetails from './MatchDetails';
import LocationSelection from './LocationSelection';
import MatchReview from './MatchReview';
import HostedMatches from './HostedMatches';
import { useAuth } from '../../hooks/useAuth';
import { matchService } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAchievements } from '../../hooks/useAchievements';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

// Alert component for success/error messages
const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const Host = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { awardXP } = useAchievements();
  const [activeStep, setActiveStep] = useState(0);
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [createdMatchId, setCreatedMatchId] = useState(null);
  
  // Match creation state
  const [matchData, setMatchData] = useState({
    sport: '',
    sportIcon: null,
    title: '',
    description: '',
    date: null,
    time: null,
    duration: 60, // in minutes
    maxParticipants: 0,
    minParticipants: 0,
    skillLevel: 'Intermediate',
    location: null,
    courtName: '',
    isPrivate: false,
    invitedFriends: [],
    termsAccepted: false // Add terms acceptance tracking
  });
  
  const steps = ['Select Sport', 'Match Details', 'Location', 'Review'];
  
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleUpdateMatchData = (updates) => {
    setMatchData((prevData) => ({
      ...prevData,
      ...updates
    }));
  };
  
  const handleCancel = () => {
    if (activeStep > 0) {
      setOpenConfirmDialog(true);
    } else {
      resetForm();
    }
  };
  
  const resetForm = () => {
    setActiveStep(0);
    setMatchData({
      sport: '',
      sportIcon: null,
      title: '',
      description: '',
      date: null,
      time: null,
      duration: 60,
      maxParticipants: 0,
      minParticipants: 0,
      skillLevel: 'Intermediate',
      location: null,
      courtName: '',
      isPrivate: false,
      invitedFriends: [],
      termsAccepted: false // Reset terms acceptance
    });
    setShowNewMatch(false);
  };
  
  const handleCreateMatch = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!matchData.date) {
        throw new Error('Match date is required');
      }
      if (!matchData.sport) {
        throw new Error('Sport selection is required');
      }
      if (!matchData.location || !matchData.location.id) {
        throw new Error('Location selection is required');
      }
      if (!user || !user.id) {
        throw new Error('User must be logged in to create a match');
      }
      if (!matchData.termsAccepted) {
        throw new Error('You must accept the terms and conditions to create a match');
      }
      
      // Format the date and time for the database
      const startDateTime = new Date(matchData.date);

      // Handle different time formats
      let hours = 0;
      let minutes = 0;

      if (matchData.time) {
        if (typeof matchData.time === 'string' && matchData.time.includes(':')) {
          // Format: "HH:MM" string
          const timeParts = matchData.time.split(':');
          hours = parseInt(timeParts[0], 10);
          minutes = parseInt(timeParts[1], 10);
        } else if (matchData.time instanceof Date) {
          // Format: Date object - get the time components directly
          hours = matchData.time.getHours();
          minutes = matchData.time.getMinutes();
        } else {
          console.warn('Unexpected time format:', matchData.time);
          // Use current time as fallback
          const now = new Date();
          hours = now.getHours();
          minutes = now.getMinutes();
        }
      } else {
        console.warn('No time provided, defaulting to current time');
        const now = new Date();
        hours = now.getHours();
        minutes = now.getMinutes();
      }

      // Set the hours and minutes in local time
      // This ensures the time is interpreted correctly regardless of timezone
      startDateTime.setHours(hours, minutes, 0, 0); // Set seconds and milliseconds to 0

      console.log('Selected time:', { hours, minutes });
      console.log('Start DateTime (local):', startDateTime.toString());
      console.log('Start DateTime (ISO/UTC):', startDateTime.toISOString());
      
      // Calculate end time based on duration
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + (matchData.duration || 60)); // Default to 60 min if missing
      
      // Prepare match data for database
      const matchDataForDB = {
        title: matchData.title || 'Untitled Match',
        description: matchData.description || '',
        sport_id: matchData.sport_id || matchData.sport, // Use explicit sport_id if available
        sport_name: matchData.sportName, // Include the sport name for better error reporting
        host_id: user.id,
        location_id: matchData.location.id,
        court_name: matchData.courtName || '',
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration_minutes: parseInt(matchData.duration || 60, 10), // Ensure numeric
        max_participants: parseInt(matchData.maxParticipants || 10, 10), // Ensure numeric
        min_participants: parseInt(matchData.minParticipants || 2, 10), // Ensure numeric
        skill_level: matchData.skillLevel || 'Beginner',
        is_private: matchData.isPrivate === true, // Convert to proper boolean
        status: 'upcoming'
        // Don't set created_at - let Supabase handle it with default values
      };
      
      console.log('Match data after formatting:', matchDataForDB);
      
      console.log('Creating match with data:', matchDataForDB);
      
      // Save to Supabase
      const result = await matchService.createMatch(matchDataForDB);
      console.log('Supabase response:', result);
      
      // Extract data and error, handling different response formats
      // The service now consistently returns { data, error } format
      const { data, error } = result;
      
      if (error) {
        console.error('Error creating match:', error);
        throw error;
      }
      
      if (!data) {
        console.error('No data returned from createMatch');
        throw new Error('Failed to create match: No data returned');
      }
      
      // Extract the match ID, handling both direct data and nested formats
      const matchId = data.id || (typeof data === 'object' ? data.id || Object.values(data)[0]?.id : null);
      
      if (!matchId) {
        console.error('Match created but no ID returned:', data);
        throw new Error('Match created but could not retrieve ID');
      }
      
      // Store the created match ID for potential redirection
      setCreatedMatchId(matchId);
      console.log('Match created successfully with ID:', matchId);

      // 🎯 ACHIEVEMENT TRACKING: Check for "Getting Started" achievement
      try {
        console.log('🎯 Triggering achievement check for match hosting...');
        await awardXP(0, 'Match hosted', {
          actionType: 'MATCH_HOSTED',
          matchId: matchId,
          sport: matchData.sport,
          updateStreak: true
        });
        console.log('✅ Achievement check completed for match hosting');
      } catch (achievementError) {
        console.error('❌ Error checking achievements after match creation:', achievementError);
        // Don't fail the match creation if achievement tracking fails
      }

      // Show success message
      setSnackbar({
        open: true,
        message: 'Match created successfully!',
        severity: 'success'
      });
      
      // Reset form and go back to matches list
      resetForm();
      
    } catch (error) {
      console.error('Error creating match:', error);

      // Enhanced error handling for rate limiting and conflicts
      let errorMessage = error.message;
      let severity = 'error';

      if (error.type === 'RATE_LIMIT_EXCEEDED') {
        severity = 'warning';
        if (error.code === 'daily_limit_reached') {
          errorMessage = 'You\'ve reached your daily hosting limit of 2 matches. Try again tomorrow.';
        } else if (error.code === 'weekly_limit_exceeded') {
          errorMessage = 'You\'ve reached your weekly hosting limit. Weekly limits reset on Monday.';
        } else if (error.code === 'monthly_limit_exceeded') {
          errorMessage = 'You\'ve reached your monthly hosting limit. Monthly limits reset on the 1st.';
        } else if (error.code === 'cooldown_active') {
          errorMessage = 'Please wait 4 hours between hosting matches to ensure quality.';
        }
      } else if (error.type === 'BOOKING_CONFLICT') {
        severity = 'warning';
        errorMessage = 'This court is already booked for the selected time. Please choose a different time or court.';
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: severity
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <SportSelection 
            matchData={matchData}
            onUpdateMatchData={handleUpdateMatchData}
          />
        );
      case 1:
        return (
          <MatchDetails 
            matchData={matchData}
            onUpdateMatchData={handleUpdateMatchData}
          />
        );
      case 2:
        return (
          <LocationSelection 
            matchData={matchData}
            onUpdateMatchData={handleUpdateMatchData}
          />
        );
      case 3:
        return (
          <MatchReview 
            matchData={matchData}
            onUpdateMatchData={handleUpdateMatchData}
          />
        );
      default:
        return 'Unknown step';
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      {!showNewMatch ? (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h1" component="h1">
              Host a Match
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => setShowNewMatch(true)}
              sx={{ borderRadius: 2 }}
            >
              Create New Match
            </Button>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {/* User's hosted matches */}
              <HostedMatches />
            </Grid>
            <Grid item xs={12} md={4}>
              {/* Tips and information */}
              <Card 
                elevation={2} 
                sx={{ 
                  borderRadius: 3,
                  height: '100%',
                  bgcolor: 'secondary.light'
                }}
              >
                <CardContent>
                  <Typography variant="h3" component="h3" gutterBottom color="primary">
                    Hosting Tips
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Create an engaging match title and description to attract participants.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Set clear skill level expectations to ensure a balanced match.
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Choose a convenient location and time for most students.
                  </Typography>
                  <Typography variant="body1">
                    Be responsive to participant questions before the match.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton 
              onClick={handleCancel} 
              sx={{ mr: 1 }}
              aria-label="back to hosted matches"
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h1" component="h1">
              {activeStep === 3 ? 'Review Match' : 'Create New Match'}
            </Typography>
          </Box>
          
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              mb: 3,
              borderRadius: 3
            }}
          >
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            
            <Box>
              {getStepContent(activeStep)}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  sx={{ borderRadius: 2 }}
                >
                  Cancel
                </Button>
                <Box>
                  {activeStep > 0 && (
                    <Button
                      variant="outlined"
                      onClick={handleBack}
                      sx={{ mr: 1, borderRadius: 2 }}
                    >
                      Back
                    </Button>
                  )}
                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={handleCreateMatch}
                      sx={{ borderRadius: 2 }}
                      disabled={isSubmitting || !matchData.termsAccepted || !matchData.canCreateMatch}
                      title={
                        !matchData.termsAccepted
                          ? 'You must accept the terms and conditions to create a match'
                          : !matchData.canCreateMatch
                          ? 'Please resolve validation issues before creating the match'
                          : ''
                      }
                    >
                      {isSubmitting ? (
                        <>
                          <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                          Creating...
                        </>
                      ) : (
                        'Create Match'
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ borderRadius: 2 }}
                      disabled={
                        (activeStep === 0 && !matchData.sport) ||
                        (activeStep === 1 && (!matchData.title || !matchData.date || !matchData.time)) ||
                        (activeStep === 2 && !matchData.location)
                      }
                    >
                      Next
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
      
      {/* Confirmation dialog for canceling match creation */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Cancel Match Creation?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to cancel? All entered information will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="primary">
            No, Continue Editing
          </Button>
          <Button 
            onClick={() => {
              setOpenConfirmDialog(false);
              resetForm();
            }} 
            color="error"
            autoFocus
          >
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success/Error Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({...snackbar, open: false})} 
          severity={snackbar.severity}
        >
          {snackbar.message}
          {snackbar.severity === 'success' && createdMatchId && (
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate(`/match/${createdMatchId}`)}
              sx={{ ml: 2 }}
            >
              View Match
            </Button>
          )}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Host;
