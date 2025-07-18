import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { SporteaButton } from '../../components/common/SporteaButton';
import { SporteaCard } from '../../components/common/SporteaCard';
import SportSelection from './SportSelection';
import MatchDetails from './MatchDetails';
import LocationSelection from './LocationSelection';
import MatchReview from './MatchReview';
import HostedMatches from './HostedMatches';
import { useAuth } from '../../hooks/useAuth';
import { matchService } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { useAchievements } from '../../hooks/useAchievements';
import { XP_VALUES } from '../../services/achievementService';

// Alert component for success/error messages
const Alert = React.forwardRef(function Alert({ severity, children, ...props }, ref) {
  const alertVariants = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-orange-50 border-orange-200 text-orange-800",
    info: "bg-blue-50 border-blue-200 text-blue-800"
  };

  const iconVariants = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-orange-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 p-4 border rounded-lg",
        alertVariants[severity] || alertVariants.info
      )}
      {...props}
    >
      {iconVariants[severity] || iconVariants.info}
      <div>{children}</div>
    </div>
  );
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

      // 🎯 ACHIEVEMENT TRACKING: Award XP and check for achievements (simplified - no streak handling)
      try {
        console.log('🎯 Triggering achievement check for match hosting...');
        console.log('🔍 [DEBUG] awardXP function available:', typeof awardXP);
        console.log('🔍 [DEBUG] XP_VALUES.MATCH_HOSTED:', XP_VALUES.MATCH_HOSTED);
        console.log('🔍 [DEBUG] User ID:', user?.id);

        if (!awardXP) {
          console.error('❌ awardXP function is undefined!');
          throw new Error('awardXP function is not available');
        }

        if (!user?.id) {
          console.error('❌ User ID is not available!');
          throw new Error('User ID is required for XP awarding');
        }

        const result = await awardXP(XP_VALUES.MATCH_HOSTED, 'Hosted a match', {
          actionType: 'MATCH_HOSTED',
          matchId: matchId,
          sport: matchData.sport
        });

        console.log('✅ Achievement check completed for match hosting:', result);
      } catch (achievementError) {
        console.error('❌ Error checking achievements after match creation:', achievementError);
        console.error('❌ Achievement error stack:', achievementError.stack);
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
    <div className="container mx-auto px-4 py-8">
      {!showNewMatch ? (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Host a Match
            </h1>
            <SporteaButton
              variant="primary"
              onClick={() => setShowNewMatch(true)}
            >
              Create New Match
            </SporteaButton>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* User's hosted matches */}
              <HostedMatches />
            </div>
            <div className="lg:col-span-1">
              {/* Tips and information */}
              <SporteaCard variant="elevated" className="h-full">
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-brand-primary mb-4">
                    Hosting Tips
                  </h3>
                  <div className="space-y-3">
                    <p className="text-gray-700">
                      Create an engaging match title and description to attract participants.
                    </p>
                    <p className="text-gray-700">
                      Set clear skill level expectations to ensure a balanced match.
                    </p>
                    <p className="text-gray-700">
                      Choose a convenient location and time for most students.
                    </p>
                    <p className="text-gray-700">
                      Be responsive to participant questions before the match.
                    </p>
                  </div>
                </div>
              </SporteaCard>
            </div>
          </div>
        </>
      ) : (
        <div>
          <div className="flex items-center mb-6">
            <button
              onClick={handleCancel}
              className={cn(
                "p-2 mr-3 rounded-md transition-all",
                "hover:bg-gray-100 text-gray-500 hover:text-brand-primary",
                "focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              )}
              aria-label="back to hosted matches"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeStep === 3 ? 'Review Match' : 'Create New Match'}
            </h1>
          </div>

          <SporteaCard variant="elevated" className="mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                {steps.map((label, index) => (
                  <div key={label} className="flex items-center">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      index <= activeStep
                        ? "bg-brand-primary text-white"
                        : "bg-gray-200 text-gray-500"
                    )}>
                      {index + 1}
                    </div>
                    <span className={cn(
                      "ml-2 text-sm font-medium",
                      index <= activeStep ? "text-brand-primary" : "text-gray-500"
                    )}>
                      {label}
                    </span>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "w-12 h-0.5 mx-4",
                        index < activeStep ? "bg-brand-primary" : "bg-gray-200"
                      )} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </SporteaCard>

          <SporteaCard variant="default">
            <div className="p-6">
              {getStepContent(activeStep)}

              <div className="flex justify-between mt-6">
                <SporteaButton
                  variant="outline"
                  onClick={handleCancel}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Cancel
                </SporteaButton>

                <div className="flex gap-3">
                  {activeStep > 0 && (
                    <SporteaButton
                      variant="outline"
                      onClick={handleBack}
                    >
                      Back
                    </SporteaButton>
                  )}
                  {activeStep === steps.length - 1 ? (
                    <SporteaButton
                      variant="primary"
                      onClick={handleCreateMatch}
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
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Creating...
                        </div>
                      ) : (
                        'Create Match'
                      )}
                    </SporteaButton>
                  ) : (
                    <SporteaButton
                      variant="primary"
                      onClick={handleNext}
                      disabled={
                        (activeStep === 0 && !matchData.sport) ||
                        (activeStep === 1 && (!matchData.title || !matchData.date || !matchData.time)) ||
                        (activeStep === 2 && !matchData.location)
                      }
                    >
                      Next
                    </SporteaButton>
                  )}
                </div>
              </div>
            </div>
          </SporteaCard>
        </div>
      )}
      
      {/* Confirmation dialog for canceling match creation */}
      {openConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <SporteaCard variant="elevated" className="max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cancel Match Creation?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel? All entered information will be lost.
              </p>
              <div className="flex gap-3 justify-end">
                <SporteaButton
                  variant="outline"
                  onClick={() => setOpenConfirmDialog(false)}
                >
                  No, Continue Editing
                </SporteaButton>
                <SporteaButton
                  variant="primary"
                  onClick={() => {
                    setOpenConfirmDialog(false);
                    resetForm();
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Cancel
                </SporteaButton>
              </div>
            </div>
          </SporteaCard>
        </div>
      )}
      
      {/* Success/Error Snackbar */}
      {snackbar.open && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <Alert
            severity={snackbar.severity}
            onClick={() => setSnackbar({...snackbar, open: false})}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span>{snackbar.message}</span>
              {snackbar.severity === 'success' && createdMatchId && (
                <SporteaButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/match/${createdMatchId}`)}
                  className="ml-3 text-white hover:bg-white/20"
                >
                  View Match
                </SporteaButton>
              )}
            </div>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default Host;
