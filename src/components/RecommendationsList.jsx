import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Skeleton, Alert, Paper, Button, Grid, Snackbar, AlertTitle, Chip, IconButton, Tooltip } from '@mui/material';
import RecommendationCard from './RecommendationCard';
import recommendationService from '../services/recommendationService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { ErrorOutline, Refresh, Info } from '@mui/icons-material';

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
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackMatches, setFallbackMatches] = useState([]);
  const [feedbackSnack, setFeedbackSnack] = useState({ open: false, message: '' });
  // Add a state to track if we're using fallback data
  const [usingFallback, setUsingFallback] = useState(false);
  // Add state to track recommendation metrics
  const [metrics, setMetrics] = useState(null);
  // Track recommendation type
  const [recommendationType, setRecommendationType] = useState('standard');

  // Close snackbar
  const handleCloseSnack = () => {
    setFeedbackSnack({ ...feedbackSnack, open: false });
  };

  // Fetch fallback matches if recommendations fail
  const fetchFallbackMatches = useCallback(async () => {
    try {
      // Direct database query as fallback
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          id,
          title,
          start_time,
          end_time,
          max_participants,
          status,
          locations(id, name),
          sports(id, name),
          host_id,
          host:host_id(id, full_name, avatar_url)
        `)
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'completed')
        .order('created_at', { ascending: false }) // Get newest matches
        .limit(limit);
        
      if (error) throw error;
      
      // Format matches to be used in the component
      const formattedMatches = matches.map(match => ({
        match: {
          ...match,
          sport: match.sports,
          location: match.locations
        },
        score: 0.6,
        explanation: 'Recently created match'
      }));
      
      setFallbackMatches(formattedMatches);
      return formattedMatches;
    } catch (err) {
      console.error('Error fetching fallback matches:', err);
      return [];
    }
  }, [limit]);

  const fetchRecommendations = useCallback(async () => {
    console.log('fetchRecommendations called', { userId: user?.id, loading });
    
    // Only check for user ID, not loading state (to avoid circular dependency)
    if (!user?.id) {
      console.log('Early return from fetchRecommendations - missing user ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setUsingFallback(false);
    
    try {
      console.log(`Fetching recommendations (attempt ${retryCount + 1})`);
      const result = await recommendationService.getRecommendations(user.id, limit);
      
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
        if (result.isFallback) {
          setUsingFallback(true);
        }
      } else {
        // Try to get fallback matches if recommendations are empty
        const fallbacks = await fetchFallbackMatches();
        
        if (fallbacks.length > 0) {
          setRecommendations(fallbacks);
          setMessage('Newest matches you might be interested in');
          setUsingFallback(true);
        } else {
          setRecommendations([]);
          setMessage(result.message || 'No recommendations available at this time');
        }
      }
      
      // If there was an error but we still got results
      if (result.error) {
        console.warn('Received recommendations with error:', result.error);
        // Store error details but don't display error UI if we have usable results
        setErrorDetails(result.error);
      }
    } catch (err) {
      console.error('Error in recommendation component:', err);
      
      // Capture detailed error info for debugging
      const errorInfo = {
        message: err.message || 'Unknown error',
        code: err.statusCode || 'none',
        details: err.originalError ? err.originalError.message : null
      };
      
      setError('Unable to load personalized recommendations');
      setErrorDetails(errorInfo);
      
      // Try to show fallback matches on error
      const fallbacks = await fetchFallbackMatches();
      if (fallbacks.length > 0) {
        setRecommendations(fallbacks);
        setMessage('Showing general matches instead of personalized recommendations');
        setUsingFallback(true);
        setError(null); // Clear main error since we have fallback data
      }
      
      onError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit, onError, retryCount, fetchFallbackMatches]);

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
          setRetryCount(prev => prev + 1);
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

  // Handle manual retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchRecommendations();
  };
  
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
              setRetryCount(prev => prev + 1);
            }, 1000);
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

  useEffect(() => {
    console.log('Recommendation component: User state check:', { 
      userId: user?.id || 'undefined', 
      isLoading: loading 
    });
    fetchRecommendations();
  }, [fetchRecommendations, user?.id]);

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
        
        {/* Show fallback matches if available */}
        {fallbackMatches.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              Recent matches you might be interested in
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {fallbackMatches.map((recommendation) => (
                <RecommendationCard 
                  key={recommendation.match.id} 
                  recommendation={recommendation}
                  isFallback={true}
                />
              ))}
            </Box>
          </>
        )}
      </Box>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="info">
          <AlertTitle>No Recommendations</AlertTitle>
          We couldn't find any matches that match your preferences. Try updating your preferences or check back later.
        </Alert>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={generateEmbeddings}
            startIcon={<Refresh />}
          >
            Update Recommendations
          </Button>
        </Box>
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
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {recommendations.map((recommendation) => (
          <RecommendationCard 
            key={recommendation.match.id} 
            recommendation={recommendation}
            isFallback={usingFallback}
            metrics={metrics}
            recommendationType={recommendationType}
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
