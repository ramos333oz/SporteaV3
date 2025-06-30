import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  People as PeopleIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import UserRecommendationCard from './UserRecommendationCard';

/**
 * Component for displaying a horizontal scrollable list of user recommendations
 * Similar to Instagram's "People you may know" section
 */
const UserRecommendationsList = ({
  limit = 10,
  onError,
  title = "People you may know",
  showTitle = true
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const scrollContainerRef = React.useRef(null);

  // Fetch user recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Call the get-similar-users edge function
      const { data, error: functionError } = await supabase.functions.invoke('get-similar-users', {
        body: {
          userId: user.id,
          limit: limit,
          offset: 0,
          filters: {
            minScore: 0.3, // Only show users with at least 30% similarity
            sameGender: false, // Allow all genders
            sameCampus: false // Allow all campuses
          }
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to fetch recommendations');
      }

      if (data?.similar_users) {
        setRecommendations(data.similar_users);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      console.error('Error fetching user recommendations:', err);
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  // Initial fetch
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Update scroll buttons visibility
  const updateScrollButtons = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      setScrollPosition(scrollLeft);
    }
  }, []);

  // Handle scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons(); // Initial check
      
      return () => {
        container.removeEventListener('scroll', updateScrollButtons);
      };
    }
  }, [updateScrollButtons, recommendations]);

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Handle user connection
  const handleConnect = async (userId) => {
    try {
      // Here you would implement the actual connection logic
      // For now, we'll just show a success message and remove the user from recommendations
      setRecommendations(prev => prev.filter(rec => rec.id !== userId));
      setSnackbar({
        open: true,
        message: 'Connection request sent!',
        severity: 'success'
      });

      // TODO: Implement actual connection logic
      // This might involve creating a friend request, sending a notification, etc.
      console.log('Connecting to user:', userId);
    } catch (error) {
      console.error('Error connecting to user:', error);
      setSnackbar({
        open: true,
        message: 'Failed to send connection request',
        severity: 'error'
      });
    }
  };

  // Handle user dismissal
  const handleDismiss = async (userId) => {
    try {
      // Remove from local state
      setRecommendations(prev => prev.filter(rec => rec.id !== userId));

      // Update the recommendation feedback in the database
      await supabase
        .from('user_user_recommendations')
        .update({ 
          feedback: 'not_interested',
          interacted_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('recommended_user_id', userId);

      setSnackbar({
        open: true,
        message: 'User removed from recommendations',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error dismissing user:', error);
    }
  };

  // Handle view profile
  const handleViewProfile = (userId) => {
    // Mark as viewed
    supabase
      .from('user_user_recommendations')
      .update({
        viewed_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('recommended_user_id', userId)
      .then(() => {
        console.log('Marked recommendation as viewed');
      });

    // Navigate to user profile
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <IconButton color="inherit" size="small" onClick={fetchRecommendations}>
            <RefreshIcon />
          </IconButton>
        }
        sx={{ mb: 2 }}
      >
        {error}
      </Alert>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          No user recommendations available at the moment.
        </Typography>
        <Button 
          variant="outlined" 
          onClick={fetchRecommendations}
          sx={{ mt: 2 }}
          startIcon={<RefreshIcon />}
        >
          Refresh
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      {/* Header */}
      {showTitle && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
            <Chip 
              label={`${recommendations.length} suggestions`} 
              size="small" 
              variant="outlined" 
            />
          </Box>
          
          <Tooltip title="Refresh recommendations">
            <IconButton onClick={fetchRecommendations} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Scrollable container with navigation */}
      <Box sx={{ position: 'relative' }}>
        {/* Left scroll button */}
        {canScrollLeft && (
          <IconButton
            onClick={scrollLeft}
            sx={{
              position: 'absolute',
              left: -20,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'background.paper',
              }
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <IconButton
            onClick={scrollRight}
            sx={{
              position: 'absolute',
              right: -20,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'background.paper',
              }
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        )}

        {/* Recommendations container */}
        <Box
          ref={scrollContainerRef}
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            pb: 1,
            '&::-webkit-scrollbar': {
              display: 'none'
            },
            scrollbarWidth: 'none'
          }}
        >
          {recommendations.map((recommendation) => (
            <UserRecommendationCard
              key={recommendation.id}
              user={recommendation}
              onConnect={handleConnect}
              onDismiss={handleDismiss}
              onViewProfile={handleViewProfile}
              compact={true}
            />
          ))}
        </Box>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserRecommendationsList;
