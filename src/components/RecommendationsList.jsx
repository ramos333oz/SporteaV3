import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, CircularProgress, Skeleton, Alert, Paper, Button, Grid, Snackbar, AlertTitle, Chip, IconButton, Tooltip } from '@mui/material';
import EnhancedRecommendationCard from './EnhancedRecommendationCard';
import recommendationService from '../services/recommendationService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

import {
  ErrorOutline,
  Refresh,
  Info,
  SportsSoccer as SportsSoccerIcon,
  Event as EventIcon,
  LocationOn as LocationOnIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';

/**
 * Component for displaying personalized match recommendations
 */
const RecommendationsList = ({ limit = 5, onError = () => {} }) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [message, setMessage] = useState(null);

  const [feedbackSnack, setFeedbackSnack] = useState({ open: false, message: '' });
  // Add a state to track if we're using fallback data
  const [usingFallback, setUsingFallback] = useState(false);
  // Add state to track recommendation metrics
  const [metrics, setMetrics] = useState(null);
  // Track recommendation type
  const [recommendationType, setRecommendationType] = useState('standard');

  // Refs for preventing memory leaks and managing requests
  const mountedRef = useRef(true);
  const debounceTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Close snackbar
  const handleCloseSnack = () => {
    setFeedbackSnack({ ...feedbackSnack, open: false });
  };



  const fetchRecommendations = useCallback(async () => {
    // Only check for user ID, not loading state (to avoid circular dependency)
    if (!user?.id || !mountedRef.current) {
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any pending debounced calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Only update state if component is still mounted
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
      setErrorDetails(null);
      setUsingFallback(false);
    }

    try {
      const result = await recommendationService.getRecommendations(user.id, limit);

      // Only update state if component is still mounted and request wasn't aborted
      if (mountedRef.current && !abortControllerRef.current?.signal.aborted) {
        // Store metrics if available for debugging
        if (result.metrics) {
          setMetrics(result.metrics);
        }

        // Store recommendation type
        setRecommendationType(result.type || 'standard');

        if (result.recommendations?.length > 0) {
          setRecommendations(result.recommendations);
          setMessage(result.message || 'Based on your preferences');

          // If using fallback data from the recommendation service, show an indicator
          if (result.metadata?.isFallback || result.metadata?.type === 'fallback') {
            setUsingFallback(true);
          }
        } else {
          // No recommendations found - show proper empty state
          setRecommendations([]);
          setMessage(result.message || 'No recommended matches found for you');
          setUsingFallback(false);
        }

        // If there was an error but we still got results
        if (result.error) {
          console.warn('Received recommendations with error:', result.error);
          // Store error details but don't display error UI if we have usable results
          setErrorDetails(result.error);
        }
      }
    } catch (err) {
      // Only handle error if component is still mounted and request wasn't aborted
      if (mountedRef.current && !abortControllerRef.current?.signal.aborted) {
        console.error('Error in recommendation component:', err);

        // Capture detailed error info for debugging
        const errorInfo = {
          message: err.message || 'Unknown error',
          code: err.statusCode || 'none',
          details: err.originalError ? err.originalError.message : null
        };

        setError('Unable to load personalized recommendations');
        setErrorDetails(errorInfo);
        setRecommendations([]);
        setUsingFallback(false);

        onError(err);
      }
    } finally {
      // Only update loading state if component is still mounted
      if (mountedRef.current) {
        setLoading(false);
      }
      // Clear the abort controller
      abortControllerRef.current = null;
    }
  }, [user?.id, limit, onError]);

  // Generate user embeddings to improve recommendations
  const generateEmbeddings = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Show a generating message
      setFeedbackSnack({ 
        open: true, 
        message: 'Updating your preference data to improve recommendations...' 
      });
      
      const result = await recommendationService.generateUserEmbedding(user.id);
      
      if (result.success) {
        // Show success message
        setFeedbackSnack({ 
          open: true, 
          message: 'Your preferences have been updated! Refreshing recommendations...' 
        });
        
        // Wait a moment and then refresh recommendations
        setTimeout(() => {
          debouncedFetchRecommendations();
        }, 1500);
      } else {
        // Show error message
        setFeedbackSnack({ 
          open: true, 
          message: 'Could not update your preferences. Please try again later.' 
        });
      }
    } catch (err) {
      console.error('Error generating embeddings:', err);
      setFeedbackSnack({ 
        open: true, 
        message: 'Could not update your recommendations. Please try again later.' 
      });
    }
  }, [user?.id]);

  // Debounced version of fetchRecommendations to prevent rapid successive calls
  const debouncedFetchRecommendations = useCallback(() => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set a new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      fetchRecommendations();
    }, 300); // 300ms debounce
  }, [fetchRecommendations]);

  // Handle manual retry
  const handleRetry = () => {
    fetchRecommendations();
  };

  // Handle feedback from recommendation cards
  const onFeedback = useCallback(async (feedbackType, matchId) => {
    if (!user?.id || !matchId) {
      console.error('Missing user ID or match ID for feedback');
      return;
    }

    try {
      console.log('Submitting feedback:', { feedbackType, matchId, userId: user.id });

      // Show feedback message
      if (feedbackType === 'liked') {
        setFeedbackSnack({
          open: true,
          message: 'Thanks for the feedback! We\'ll show you more matches like this.'
        });
      } else if (feedbackType === 'disliked') {
        setFeedbackSnack({
          open: true,
          message: 'Thanks for the feedback! We\'ll improve your recommendations.'
        });
      } else {
        setFeedbackSnack({
          open: true,
          message: 'Feedback removed.'
        });
      }

      // Submit feedback to database
      if (feedbackType) {
        // First check if feedback already exists for this user-match combination
        const { data: existingFeedback, error: checkError } = await supabase
          .from('recommendation_feedback')
          .select('id')
          .eq('user_id', user.id)
          .eq('match_id', matchId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected if no feedback exists
          console.error('Error checking existing feedback:', checkError);
          return;
        }

        if (existingFeedback) {
          // Update existing feedback
          const { error: updateError } = await supabase
            .from('recommendation_feedback')
            .update({
              feedback_type: feedbackType,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingFeedback.id);

          if (updateError) {
            console.error('Error updating feedback in database:', updateError);
          } else {
            console.log('Feedback updated successfully');
          }
        } else {
          // Insert new feedback
          const { error: insertError } = await supabase
            .from('recommendation_feedback')
            .insert({
              user_id: user.id,
              match_id: matchId,
              feedback_type: feedbackType
            });

          if (insertError) {
            console.error('Error inserting feedback to database:', insertError);
          } else {
            console.log('Feedback inserted successfully');
          }
        }
      } else {
        // Remove feedback if feedbackType is null
        const { error: deleteError } = await supabase
          .from('recommendation_feedback')
          .delete()
          .eq('user_id', user.id)
          .eq('match_id', matchId);

        if (deleteError) {
          console.error('Error removing feedback from database:', deleteError);
        } else {
          console.log('Feedback removed successfully');
        }
      }

    } catch (error) {
      console.error('Error submitting feedback:', error);
      setFeedbackSnack({
        open: true,
        message: 'Failed to submit feedback. Please try again.'
      });
    }
  }, [user?.id]);
  
  // Check if embeddings need to be generated automatically
  useEffect(() => {
    const checkAndGenerateEmbeddings = async () => {
      if (!user?.id) return;
      
      // Check when we last generated embeddings
      const lastEmbeddingTime = parseInt(localStorage.getItem('sportea_last_embedding_time') || '0');
      const now = Date.now();
      
      // If we've never generated embeddings or it's been more than 24 hours
      if (!lastEmbeddingTime || (now - lastEmbeddingTime > 24 * 60 * 60 * 1000)) {
        console.log('Automatically updating user preferences for better recommendations');
        
        try {
          // Quietly attempt to generate embeddings
          const result = await recommendationService.generateUserEmbedding(user.id);
          
          // If successful, refresh recommendations
          if (result.success) {
            // Refresh recommendations after a short delay
            setTimeout(() => {
              debouncedFetchRecommendations();
            }, 2000);
          } else if (result.skipReason === 'recent_error') {
            // If we're skipping due to a recent error, just continue silently
            console.log('Skipping automatic embedding generation due to recent error');
          } else {
            // Log other errors but don't show to user
            console.error('Error in automatic preference update:', result.error);
          }
        } catch (err) {
          // Log the error but don't show to user
          console.error('Exception in automatic preference update:', err);
        }
      }
    };
    
    // Run the check once when component mounts
    checkAndGenerateEmbeddings();
  }, [user?.id]);

  // Initial load effect - only runs when user changes
  useEffect(() => {
    if (user?.id) {
      fetchRecommendations();
    }
  }, [user?.id]); // Removed fetchRecommendations from dependencies to prevent infinite loop

  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false;

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear any pending debounced calls
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>Finding matches for you...</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton 
              key={i} 
              variant="rectangular" 
              height={140} 
              sx={{ borderRadius: 2 }}
              animation="wave"
            />
          ))}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert 
          severity="warning" 
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          <AlertTitle>Recommendation Error</AlertTitle>
          {error}
        </Alert>
        
        {/* Show detailed error info for debugging */}
        {errorDetails && (
          <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(errorDetails, null, 2)}
            </Typography>
          </Paper>
        )}
        

      </Box>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Box sx={{ mt: 2, mb: 6 }}>
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #F5F5F7 0%, #FFFFFF 100%)',
            border: '1px solid rgba(138, 21, 56, 0.1)',
            borderRadius: 3,
            boxShadow: '0px 4px 16px rgba(138, 21, 56, 0.08)'
          }}
        >
          <Box sx={{ mb: 3 }}>
            <SportsSoccerIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.primary">
              No Recommended Matches Found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
              We couldn't find any matches that perfectly match your preferences right now.
              This could be because:
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <EventIcon sx={{ color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No matches scheduled for your available times
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <LocationOnIcon sx={{ color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No matches at your preferred venues
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <SportsSoccerIcon sx={{ color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  No matches for your preferred sports
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <AccessTimeIcon sx={{ color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  All suitable matches are already full
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleRetry}
              startIcon={<Refresh />}
              sx={{
                borderRadius: 3,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0px 4px 12px rgba(138, 21, 56, 0.3)',
                '&:hover': {
                  boxShadow: '0px 6px 16px rgba(138, 21, 56, 0.4)',
                  transform: 'translateY(-2px)',
                }
              }}
            >
              Refresh Recommendations
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.href = '/profile'}
              sx={{
                borderRadius: 3,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0px 4px 12px rgba(138, 21, 56, 0.3)',
                '&:hover': {
                  boxShadow: '0px 6px 16px rgba(138, 21, 56, 0.4)',
                  transform: 'translateY(-2px)',
                }
              }}
            >
              Update Preferences
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.href = '/find'}
              sx={{
                borderRadius: 3,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0px 4px 12px rgba(138, 21, 56, 0.3)',
                '&:hover': {
                  boxShadow: '0px 6px 16px rgba(138, 21, 56, 0.4)',
                  transform: 'translateY(-2px)',
                }
              }}
            >
              Browse All Matches
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">{message}</Typography>
          
          {usingFallback && (
            <Chip 
              label="Fallback Data" 
              size="small" 
              color="warning" 
              variant="outlined"
            />
          )}
          
          {recommendationType === 'enhanced-content-based' && (
            <Tooltip title="Enhanced recommendations based on your preferences and match characteristics">
              <Chip 
                label="Enhanced" 
                size="small" 
                color="success" 
                variant="outlined"
                icon={<Info fontSize="small" />}
              />
            </Tooltip>
          )}
        </Box>
        
        <IconButton 
          size="small" 
          onClick={handleRetry}
          title="Refresh recommendations"
        >
          <Refresh fontSize="small" />
        </IconButton>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {recommendations.map((recommendation) => (
          <EnhancedRecommendationCard
            key={recommendation.match.id}
            recommendation={recommendation}
            isFallback={usingFallback}
            metrics={metrics}
            recommendationType={recommendationType}
            onFeedback={onFeedback}
          />
        ))}
      </Box>
      
      {/* Show metrics for debugging */}
      {metrics && import.meta.env.DEV && (
        <Paper sx={{ p: 2, mt: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(metrics, null, 2)}
          </Typography>
        </Paper>
      )}
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={generateEmbeddings}
          startIcon={<Refresh />}
        >
          Update Recommendations
        </Button>
      </Box>
      
      <Snackbar
        open={feedbackSnack.open}
        autoHideDuration={6000}
        onClose={handleCloseSnack}
        message={feedbackSnack.message}
      />
    </Box>
  );
};

export default RecommendationsList;
