import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Skeleton, Alert, Paper, Button, Grid } from '@mui/material';
import RecommendationCard from './RecommendationCard';
import recommendationService from '../services/recommendationService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

/**
 * Component for displaying personalized match recommendations
 */
const RecommendationsList = ({ limit = 5, onError = () => {} }) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isMockData, setIsMockData] = useState(false);
  const [fallbackMatches, setFallbackMatches] = useState([]);

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
    if (!user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching recommendations (attempt ${retryCount + 1})`);
      const result = await recommendationService.getRecommendations(user.id, limit);
      
      // Check if this is mock data
      if (result.isMockData || result.isFallback) {
        setIsMockData(true);
        console.warn('Using mock recommendation data due to API issues');
      } else {
        setIsMockData(false);
      }
      
      if (result.recommendations?.length > 0) {
        setRecommendations(result.recommendations);
        setMessage(result.message || 'Based on your preferences');
      } else {
        // Try to get fallback matches if recommendations are empty
        const fallbacks = await fetchFallbackMatches();
        
        if (fallbacks.length > 0) {
          setRecommendations(fallbacks);
          setMessage('Newest matches you might be interested in');
          setIsMockData(true);
        } else {
          setRecommendations([]);
          setMessage(result.message || 'No recommendations available at this time');
        }
      }
      
      // If there was an error but we still got results
      if (result.error) {
        console.warn('Received recommendations with error:', result.error);
      }
    } catch (err) {
      console.error('Error in recommendation component:', err);
      setError('Unable to load recommendations. Please try again.');
      
      // Try to show fallback matches on error
      const fallbacks = await fetchFallbackMatches();
      if (fallbacks.length > 0) {
        setRecommendations(fallbacks);
        setMessage('Newest matches you might be interested in');
        setIsMockData(true);
        setError(null); // Clear error since we have fallback data
      }
      
      onError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit, onError, retryCount, fetchFallbackMatches]);

  // Handle manual retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchRecommendations();
  };

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (loading) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Personalized Recommendations</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...Array(3)].map((_, index) => (
            <Paper key={index} elevation={1} sx={{ p: 2, borderRadius: 2 }}>
              <Skeleton variant="rectangular" height={40} width="50%" sx={{ mb: 1 }} />
              <Skeleton variant="text" width="70%" />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Skeleton variant="rectangular" width={60} height={24} />
                <Skeleton variant="rectangular" width={60} height={24} />
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    );
  }

  if (error && recommendations.length === 0) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Personalized Recommendations</Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleRetry}
          sx={{ mt: 1 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Personalized Recommendations</Typography>
        <Alert severity="info">
          No recommended matches available at this time. Try checking back later or create your own match!
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Personalized Recommendations</Typography>
      {message && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{message}</Typography>
          {isMockData && (
            <Alert severity="info" sx={{ py: 0, mb: 2 }} size="small">
              Temporary data - service is under maintenance
            </Alert>
          )}
        </Box>
      )}
      <Grid container spacing={2}>
        {recommendations.map(({ match, score, explanation }, index) => (
          <Grid item xs={12} sm={6} md={4} key={match.id || index}>
            <RecommendationCard
              match={match}
              score={score}
              explanation={explanation}
              isMockData={isMockData}
              onFeedback={(feedbackType) => {
                // Don't track feedback for mock data
                if (!isMockData && match.id) {
                  recommendationService.trackRecommendationAction(
                    user.id,
                    match.id,
                    feedbackType,
                    score,
                    'personalized',
                    explanation
                  );
                }
              }}
            />
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={handleRetry}
          size="small"
        >
          Refresh Recommendations
        </Button>
      </Box>
    </Box>
  );
};

export default RecommendationsList;
