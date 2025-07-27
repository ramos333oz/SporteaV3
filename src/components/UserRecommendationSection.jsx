import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  IconButton
} from '@mui/material';
import InstagramStyleUserCard from './InstagramStyleUserCard';
import { RefreshCw, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { getUserRecommendations, clearUserRecommendationCache } from '../services/userRecommendationService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';

/**
 * Horizontal scrolling user recommendation section
 * Displays Instagram-style user cards with maximum 10 recommendations
 */
const UserRecommendationSection = ({ 
  title = "People You May Know",
  showRefresh = true,
  className = "",
  maxUsers = 10
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectingUsers, setConnectingUsers] = useState(new Set());

  const loadRecommendations = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Clear cache to ensure fresh data with updated friendship filtering
      clearUserRecommendationCache();

      const response = await getUserRecommendations(user.id, {
        limit: maxUsers,
        minSimilarity: 0.1
      });
      
      if (response.recommendations) {
        setRecommendations(response.recommendations.slice(0, maxUsers));
      }
    } catch (error) {
      console.error('Error loading user recommendations:', error);
      showToast('Failed to load recommendations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId) => {
    setConnectingUsers(prev => new Set([...prev, userId]));

    try {
      // Import friendship service dynamically to avoid circular dependencies
      const { friendshipService } = await import('../services/supabase');

      const result = await friendshipService.sendFriendRequest(userId);

      if (result.success) {
        // Remove the user from recommendations after successful connection
        setRecommendations(prev => prev.filter(rec => rec.id !== userId));

        // Emit event to notify Friends page about the new friend request
        console.log('[UserRecommendationSection] Dispatching friend-request-sent event:', {
          userId,
          requestData: result.data
        });

        window.dispatchEvent(new CustomEvent('sportea:friend-request-sent', {
          detail: {
            userId,
            requestData: result.data
          }
        }));

        console.log('[UserRecommendationSection] Friend-request-sent event dispatched successfully');

        showToast('Friend request sent successfully!', 'success');
      } else {
        throw new Error(result.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      showToast('Failed to send friend request', 'error');
    } finally {
      setConnectingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleDismiss = (userId) => {
    setRecommendations(prev => prev.filter(rec => rec.id !== userId));
  };

  // Load recommendations on component mount
  useEffect(() => {
    if (user?.id) {
      loadRecommendations();
    }
  }, [user?.id]);

  // Listen for master refresh event from Home page
  useEffect(() => {
    const handleMasterRefresh = () => {
      console.log('[UserRecommendationSection] Master refresh triggered, reloading recommendations');
      loadRecommendations();
    };

    window.addEventListener('sportea:master-refresh', handleMasterRefresh);

    return () => {
      window.removeEventListener('sportea:master-refresh', handleMasterRefresh);
    };
  }, []);

  if (!user?.id) {
    return null;
  }

  return (
    <Box sx={{ width: '100%' }} className={className}>
      {/* Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Users size={24} style={{ color: '#dc2626' }} />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              color: '#111827'
            }}
          >
            {title}
          </Typography>
        </Box>

        {showRefresh && (
          <Button
            variant="outlined"
            size="small"
            onClick={loadRecommendations}
            disabled={loading}
            startIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            sx={{
              borderColor: '#fecaca',
              color: '#b91c1c',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#fef2f2',
                borderColor: '#fca5a5'
              }
            }}
          >
            Refresh
          </Button>
        )}
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#6b7280' }}>
            <CircularProgress size={20} sx={{ color: '#dc2626' }} />
            <Typography>
              Finding people you may know...
            </Typography>
          </Box>
        </Box>
      )}

      {/* Empty State */}
      {!loading && recommendations.length === 0 && (
        <Box sx={{
          textAlign: 'center',
          py: 6,
          background: 'linear-gradient(135deg, #fef2f2 0%, #fef3c7 100%)',
          borderRadius: 3,
          border: '1px solid #fecaca'
        }}>
          <Users size={48} style={{ color: '#fca5a5', margin: '0 auto 16px' }} />
          <Typography variant="h6" sx={{
            fontWeight: 600,
            color: '#374151',
            mb: 1
          }}>
            No recommendations available
          </Typography>
          <Typography sx={{
            color: '#6b7280',
            mb: 2
          }}>
            We'll find people you may know as more users join your sports communities.
          </Typography>
          <Button
            variant="outlined"
            onClick={loadRecommendations}
            startIcon={<RefreshCw size={16} />}
            sx={{
              borderColor: '#fecaca',
              color: '#b91c1c',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#fef2f2',
                borderColor: '#fca5a5'
              }
            }}
          >
            Try Again
          </Button>
        </Box>
      )}

      {/* Recommendations Horizontal Scroll */}
      {!loading && recommendations.length > 0 && (
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              px: 2, // Add horizontal padding to prevent border cutoff on sides
              py: 3, // Increase vertical padding to accommodate hover effects
              '&::-webkit-scrollbar': {
                height: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f3f4f6',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#d1d5db',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: '#9ca3af',
                },
              },
            }}
          >
            {recommendations.map((recommendation) => (
              <InstagramStyleUserCard
                key={recommendation.id}
                user={recommendation}
                onConnect={handleConnect}
                onDismiss={handleDismiss}
                isConnecting={connectingUsers.has(recommendation.id)}
              />
            ))}
          </Box>

          {/* Recommendation Count */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" sx={{
              color: '#6b7280'
            }}>
              Showing {recommendations.length} of {recommendations.length} recommendations
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default UserRecommendationSection;
