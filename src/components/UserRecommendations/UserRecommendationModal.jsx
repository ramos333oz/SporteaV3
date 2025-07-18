import React, { useState, useEffect } from 'react';
import { X, Users, Heart, MessageCircle, UserPlus, UserCheck, MoreHorizontal, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getUserRecommendations, clearUserRecommendationCache } from '../../services/userRecommendationService';
import { clearKNNCache, clearAllKNNCaches } from '../../services/knnRecommendationService';
import { invalidateUserCache } from '../../services/simplifiedRecommendationService';
import UserRecommendationCard from './UserRecommendationCard';

/**
 * Instagram-style User Recommendation Modal
 * 
 * Following TEMPLATE.md specifications (lines 85-100):
 * - Modal/popup interface similar to Instagram's "Suggested for You"
 * - Card-based layout with user photos and key info
 * - Swipe or tap interactions for accepting/dismissing recommendations
 * - "See More" functionality and real-time updates
 */

const UserRecommendationModal = ({ isOpen, onClose, currentUserId }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedUsers, setDismissedUsers] = useState(new Set());
  const [connectedUsers, setConnectedUsers] = useState(new Set());

  // Load user recommendations when modal opens
  useEffect(() => {
    if (isOpen && currentUserId) {
      loadRecommendations();
    }
  }, [isOpen, currentUserId]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getUserRecommendations(currentUserId, {
        limit: 20,
        minSimilarity: 0.3
      });

      setRecommendations(response.recommendations || []);
      setCurrentIndex(0);

    } catch (err) {
      console.error('Error loading user recommendations:', err);
      setError('Failed to load user recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Comprehensive cache clearing and refresh function
  const handleRefreshRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clear all cache layers comprehensively
      console.log('[UserRecommendationModal] Clearing all recommendation caches...');
      invalidateUserCache(currentUserId); // Clear simplified recommendation cache
      await clearAllKNNCaches(currentUserId); // Clear BOTH in-memory AND database KNN caches
      clearUserRecommendationCache(); // Clear user recommendation cache for user discovery

      // Reset local state
      setDismissedUsers(new Set());
      setConnectedUsers(new Set());
      setCurrentIndex(0);

      // Force fresh data load
      const response = await getUserRecommendations(currentUserId, {
        limit: 20,
        minSimilarity: 0.3,
        forceRefresh: true // Add flag to bypass any remaining caches
      });

      setRecommendations(response.recommendations || []);
      console.log('[UserRecommendationModal] Recommendations refreshed successfully');

    } catch (err) {
      console.error('Error refreshing user recommendations:', err);
      setError('Failed to refresh user recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId) => {
    try {
      // TODO: Implement actual friend request/connection logic
      console.log('Connecting with user:', userId);
      setConnectedUsers(prev => new Set([...prev, userId]));
      
      // Move to next recommendation
      handleNext();
    } catch (err) {
      console.error('Error connecting with user:', err);
    }
  };

  const handleDismiss = (userId) => {
    setDismissedUsers(prev => new Set([...prev, userId]));
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const getVisibleRecommendations = () => {
    return recommendations.filter(rec => 
      !dismissedUsers.has(rec.id) && !connectedUsers.has(rec.id)
    );
  };

  const visibleRecommendations = getVisibleRecommendations();
  const currentRecommendation = visibleRecommendations[currentIndex];

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden"
        style={{
          position: 'relative',
          maxWidth: '400px',
          width: '100%',
          maxHeight: '90vh',
          margin: '0 16px'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Suggested for You</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefreshRecommendations}
              disabled={loading}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh recommendations and clear all caches"
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
              <p className="text-gray-600">Finding similar users...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-red-500 mb-4">
                <Users className="w-12 h-12" />
              </div>
              <p className="text-gray-600 text-center">{error}</p>
              <button
                onClick={loadRecommendations}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && visibleRecommendations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-gray-400 mb-4">
                <Users className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No More Suggestions</h3>
              <p className="text-gray-600 text-center mb-4">
                We've shown you all the users with similar interests. Check back later for new suggestions!
              </p>
              <button
                onClick={loadRecommendations}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          )}

          {!loading && !error && currentRecommendation && (
            <div className="space-y-6">
              {/* Progress indicator */}
              <div className="flex items-center justify-center space-x-1">
                {visibleRecommendations.slice(0, 5).map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 w-8 rounded-full transition-colors ${
                      index === currentIndex ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  />
                ))}
                {visibleRecommendations.length > 5 && (
                  <span className="text-xs text-gray-500 ml-2">
                    {currentIndex + 1} of {visibleRecommendations.length}
                  </span>
                )}
              </div>

              {/* User Recommendation Card */}
              <UserRecommendationCard
                user={currentRecommendation}
                onConnect={() => handleConnect(currentRecommendation.id)}
                onDismiss={() => handleDismiss(currentRecommendation.id)}
                onNext={handleNext}
                onPrevious={handlePrevious}
                canGoNext={currentIndex < visibleRecommendations.length - 1}
                canGoPrevious={currentIndex > 0}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && visibleRecommendations.length > 0 && (
          <div className="border-t border-gray-100 p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Based on your sports preferences and activity</span>
              <button
                onClick={loadRecommendations}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                See More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render modal at document root
  return createPortal(modalContent, document.body);
};

export default UserRecommendationModal;
