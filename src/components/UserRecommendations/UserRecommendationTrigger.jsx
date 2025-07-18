import React, { useState, useEffect } from 'react';
import { Users, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { canGenerateQualityRecommendations } from '../../services/userRecommendationService';
import UserRecommendationModal from './UserRecommendationModal';

/**
 * User Recommendation Trigger Component
 * 
 * Can be placed in Friends section, navigation, or as a floating action button
 * Follows TEMPLATE.md specifications for user discovery interface
 */

const UserRecommendationTrigger = ({ 
  variant = 'button', // 'button', 'card', 'fab' (floating action button)
  className = '',
  showBadge = true 
}) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);
  const [quality, setQuality] = useState('None');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      checkRecommendationCapability();
    }
  }, [user?.id]);

  const checkRecommendationCapability = async () => {
    try {
      setLoading(true);
      const capability = await canGenerateQualityRecommendations(user.id);
      setCanGenerate(capability.canGenerate);
      setQuality(capability.quality);
    } catch (error) {
      console.error('Error checking recommendation capability:', error);
      setCanGenerate(false);
      setQuality('None');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    if (canGenerate) {
      setIsModalOpen(true);
    }
  };

  // Button variant
  if (variant === 'button') {
    return (
      <>
        <button
          onClick={handleOpenModal}
          disabled={loading || !canGenerate}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
            ${canGenerate 
              ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
            ${className}
          `}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <Users className="w-4 h-4" />
          )}
          <span>Find Similar Users</span>
          {showBadge && canGenerate && quality === 'High' && (
            <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full">
              New
            </span>
          )}
        </button>

        <UserRecommendationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentUserId={user?.id}
        />
      </>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <>
        <div
          onClick={handleOpenModal}
          className={`
            bg-white rounded-xl shadow-md p-6 cursor-pointer transition-all hover:shadow-lg
            ${canGenerate ? 'hover:scale-105' : 'opacity-60 cursor-not-allowed'}
            ${className}
          `}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`
                p-3 rounded-full
                ${canGenerate ? 'bg-purple-100' : 'bg-gray-100'}
              `}>
                {loading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                ) : (
                  <Users className={`w-6 h-6 ${canGenerate ? 'text-purple-600' : 'text-gray-400'}`} />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Discover Similar Users</h3>
                <p className="text-sm text-gray-600">
                  {loading 
                    ? 'Checking your profile...'
                    : canGenerate 
                      ? 'Find users with similar sports interests'
                      : 'Complete your profile to get recommendations'
                  }
                </p>
              </div>
            </div>
            {showBadge && canGenerate && (
              <div className="flex items-center space-x-1">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-medium text-purple-600">{quality}</span>
              </div>
            )}
          </div>
          
          {canGenerate && (
            <div className="flex items-center text-sm text-purple-600 font-medium">
              <span>Tap to discover users</span>
              <UserPlus className="w-4 h-4 ml-2" />
            </div>
          )}
        </div>

        <UserRecommendationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentUserId={user?.id}
        />
      </>
    );
  }

  // Floating Action Button variant
  if (variant === 'fab') {
    return (
      <>
        <button
          onClick={handleOpenModal}
          disabled={loading || !canGenerate}
          className={`
            fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg transition-all
            ${canGenerate 
              ? 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-110' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
            ${className}
          `}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
          ) : (
            <Users className="w-6 h-6" />
          )}
          
          {showBadge && canGenerate && quality === 'High' && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              !
            </div>
          )}
        </button>

        <UserRecommendationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentUserId={user?.id}
        />
      </>
    );
  }

  return null;
};

export default UserRecommendationTrigger;
