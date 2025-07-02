import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAchievements } from '../hooks/useAchievements';
import { AchievementNotification } from '../components/achievements';

const AchievementContext = createContext();

export const useAchievementContext = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievementContext must be used within an AchievementProvider');
  }
  return context;
};

export const AchievementProvider = ({ children }) => {
  const { user } = useAuth();
  const achievements = useAchievements();
  const [currentNotification, setCurrentNotification] = useState(null);
  const [notificationQueue, setNotificationQueue] = useState([]);

  // Handle new achievement notifications
  useEffect(() => {
    if (achievements.newAchievements.length > 0) {
      // Add new achievements to notification queue
      setNotificationQueue(prev => [...prev, ...achievements.newAchievements]);
      achievements.clearNewAchievements();
    }
  }, [achievements.newAchievements, achievements.clearNewAchievements]);

  // Process notification queue
  useEffect(() => {
    if (notificationQueue.length > 0 && !currentNotification) {
      const nextNotification = notificationQueue[0];
      setCurrentNotification(nextNotification);
      setNotificationQueue(prev => prev.slice(1));
    }
  }, [notificationQueue, currentNotification]);

  const handleNotificationClose = () => {
    setCurrentNotification(null);
  };

  // Enhanced track action with automatic daily login detection
  const trackActionWithContext = async (actionType, actionData = {}) => {
    // Check if this is the first action of the day for daily login bonus
    if (user?.id && achievements.gamificationData) {
      const today = new Date().toISOString().split('T')[0];
      const lastActivity = achievements.gamificationData.last_activity_date;
      
      if (lastActivity !== today) {
        // Award daily login bonus first
        await achievements.trackAction('daily_login');
      }
    }

    // Then track the actual action
    return await achievements.trackAction(actionType, actionData);
  };

  const value = {
    ...achievements,
    trackAction: trackActionWithContext,
    
    // Enhanced getters with user context
    getUserLevel: () => achievements.gamificationData?.current_level || 1,
    getUserXP: () => achievements.gamificationData?.total_xp || 0,
    getUserStreak: () => achievements.gamificationData?.current_streak || 0,
    
    // Achievement completion percentage
    getCompletionPercentage: () => {
      const total = achievements.getTotalCount();
      const completed = achievements.getCompletedCount();
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    },

    // Check if user has specific achievement
    hasAchievement: (achievementName) => {
      return achievements.userAchievements.some(ua => 
        ua.achievement?.name === achievementName && ua.is_completed
      );
    },

    // Get achievements by tier
    getAchievementsByTier: (tier) => {
      return achievements.achievements.filter(achievement => achievement.tier === tier);
    }
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
      
      {/* Achievement Notification */}
      <AchievementNotification
        achievement={currentNotification}
        open={!!currentNotification}
        onClose={handleNotificationClose}
        autoHideDuration={6000}
      />
    </AchievementContext.Provider>
  );
};

export default AchievementProvider;
