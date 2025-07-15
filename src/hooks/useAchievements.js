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

  // Award XP and check for achievements (simplified - no streak handling)
  const awardXP = useCallback(async (amount, reason, actionData = {}) => {
    console.log('🔍 [useAchievements] awardXP called with:', { amount, reason, actionData, userId: user?.id });

    if (!user?.id) {
      console.error('❌ [useAchievements] No user ID available for XP awarding');
      return;
    }

    try {
      console.log('🔍 [useAchievements] Calling achievementService.awardXP...');

      // Award XP (simplified - no streak handling)
      const updatedGamification = await achievementService.awardXP(
        user.id,
        amount,
        reason,
        true // broadcastUpdate
      );

      console.log('🔍 [useAchievements] XP awarded successfully:', updatedGamification);
      setGamificationData(updatedGamification);

      // Check for new achievements
      console.log('🔍 [useAchievements] Checking for achievements...');
      const unlockedAchievements = await achievementService.checkAchievements(
        user.id,
        actionData.actionType || 'general',
        actionData
      );

      if (unlockedAchievements.length > 0) {
        console.log('🎉 [useAchievements] New achievements unlocked:', unlockedAchievements);
        setNewAchievements(prev => [...prev, ...unlockedAchievements]);
        // Reload user achievements to get updated progress
        const updatedUserAchievements = await achievementService.getUserAchievements(user.id);
        setUserAchievements(updatedUserAchievements);
      } else {
        console.log('🔍 [useAchievements] No new achievements unlocked');
      }

      const result = {
        xpAwarded: amount,
        newLevel: updatedGamification.current_level,
        unlockedAchievements
      };

      console.log('✅ [useAchievements] awardXP completed successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ [useAchievements] Error awarding XP:', error);
      console.error('❌ [useAchievements] Error stack:', error.stack);
      console.error('❌ [useAchievements] Error details:', {
        userId: user?.id,
        amount,
        reason,
        actionData
      });
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
