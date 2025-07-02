import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import achievementService, { XP_VALUES } from '../services/achievementService';

/**
 * useAchievements Hook
 * Manages achievement tracking, XP awarding, and real-time progress updates
 */
export const useAchievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [gamificationData, setGamificationData] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load initial achievement data
  useEffect(() => {
    if (user?.id) {
      loadAchievementData();
    }
  }, [user?.id]);

  const loadAchievementData = async () => {
    try {
      setLoading(true);
      
      const [allAchievements, userProgress, gamification] = await Promise.all([
        achievementService.getAllAchievements(),
        achievementService.getUserAchievements(user.id),
        achievementService.getUserGamification(user.id)
      ]);

      setAchievements(allAchievements);
      setUserAchievements(userProgress);
      setGamificationData(gamification);
    } catch (error) {
      console.error('Error loading achievement data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Award XP and check for achievements
  const awardXP = useCallback(async (amount, reason, actionData = {}) => {
    if (!user?.id) return;

    try {
      // Award XP
      const updatedGamification = await achievementService.awardXP(user.id, amount, reason);
      setGamificationData(updatedGamification);

      // Update streak if it's a daily activity
      if (actionData.updateStreak) {
        await achievementService.updateStreak(user.id);
      }

      // Check for new achievements
      const unlockedAchievements = await achievementService.checkAchievements(
        user.id, 
        actionData.actionType || 'general',
        actionData
      );

      if (unlockedAchievements.length > 0) {
        setNewAchievements(prev => [...prev, ...unlockedAchievements]);
        // Reload user achievements to get updated progress
        const updatedUserAchievements = await achievementService.getUserAchievements(user.id);
        setUserAchievements(updatedUserAchievements);
      }

      return {
        xpAwarded: amount,
        newLevel: updatedGamification.current_level,
        unlockedAchievements
      };
    } catch (error) {
      console.error('Error awarding XP:', error);
      return null;
    }
  }, [user?.id]);

  // Track specific actions
  const trackAction = useCallback(async (actionType, actionData = {}) => {
    if (!user?.id) return;

    let xpAmount = 0;
    let reason = '';

    switch (actionType) {
      case 'match_joined':
        xpAmount = XP_VALUES.MATCH_JOINED;
        reason = 'Joined a match';
        break;
      case 'match_hosted':
        xpAmount = XP_VALUES.MATCH_HOSTED;
        reason = 'Hosted a match';
        break;
      case 'match_completed':
        xpAmount = XP_VALUES.MATCH_COMPLETED;
        reason = 'Completed a match';
        break;
      case 'friend_invited':
        xpAmount = XP_VALUES.FRIEND_INVITED;
        reason = 'Invited a friend';
        break;
      case 'profile_updated':
        xpAmount = XP_VALUES.PROFILE_UPDATED;
        reason = 'Updated profile';
        break;
      case 'daily_login':
        xpAmount = XP_VALUES.FIRST_DAILY_LOGIN;
        reason = 'Daily login bonus';
        actionData.updateStreak = true;
        break;
      case 'skill_improved':
        xpAmount = XP_VALUES.SKILL_IMPROVED;
        reason = 'Improved skill level';
        break;
      default:
        return;
    }

    return await awardXP(xpAmount, reason, { ...actionData, actionType });
  }, [awardXP]);

  // Clear new achievement notifications
  const clearNewAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  // Get achievement progress for a specific achievement
  const getAchievementProgress = useCallback((achievementId) => {
    const userProgress = userAchievements.find(ua => ua.achievement_id === achievementId);
    return {
      progress: userProgress?.current_progress || 0,
      isCompleted: userProgress?.is_completed || false,
      completedAt: userProgress?.completed_at
    };
  }, [userAchievements]);

  // Get achievements by category
  const getAchievementsByCategory = useCallback((category) => {
    return achievements.filter(achievement => achievement.category === category);
  }, [achievements]);

  // Get completed achievements count
  const getCompletedCount = useCallback(() => {
    return userAchievements.filter(ua => ua.is_completed).length;
  }, [userAchievements]);

  // Get total possible achievements count
  const getTotalCount = useCallback(() => {
    return achievements.length;
  }, [achievements]);

  // Get user's current level info
  const getLevelInfo = useCallback(() => {
    if (!gamificationData) return null;

    const currentLevel = gamificationData.current_level;
    const currentXP = gamificationData.total_xp;
    
    return {
      level: currentLevel,
      xp: currentXP,
      streak: gamificationData.current_streak,
      longestStreak: gamificationData.longest_streak,
      communityScore: gamificationData.community_score,
      weeklyXP: gamificationData.weekly_xp,
      monthlyXP: gamificationData.monthly_xp
    };
  }, [gamificationData]);

  return {
    // Data
    achievements,
    userAchievements,
    gamificationData,
    newAchievements,
    loading,

    // Actions
    trackAction,
    awardXP,
    clearNewAchievements,
    loadAchievementData,

    // Getters
    getAchievementProgress,
    getAchievementsByCategory,
    getCompletedCount,
    getTotalCount,
    getLevelInfo
  };
};

export default useAchievements;
