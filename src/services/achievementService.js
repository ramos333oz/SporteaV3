import { supabase } from './supabase';
import { calculateLevel, GAMIFICATION_CONSTANTS } from '../utils/levelCalculation';

// XP Values for different actions (Updated per user requirements)
export const XP_VALUES = {
  // Match Actions (Updated values)
  MATCH_HOSTED: 600,           // User hosts a match: +600 XP (TEMPORARILY INCREASED FOR TESTING)
  MATCH_JOINED: 150,           // User joins a match: +150 XP (RESTORED TO NORMAL VALUE)
  MATCH_COMPLETED_JOIN: 300,   // User joins and completes: +300 XP
  MATCH_COMPLETED_HOST: 600,   // User hosts and completes: +600 XP

  // Daily Engagement
  DAILY_SIGNIN: 100,           // Daily sign-in: +100 XP

  // Achievement System
  ACHIEVEMENT_UNLOCKED: 'variable', // Based on achievement value

  // Legacy Values (maintain compatibility)
  MATCH_COMPLETED: 15,         // Deprecated - use specific completion values
  FRIEND_INVITED: 5,
  PROFILE_UPDATED: 5,
  FIRST_DAILY_LOGIN: 5,        // Deprecated - use DAILY_SIGNIN
  STREAK_BONUS: 2,             // per day in streak
  SKILL_IMPROVED: 20
};

// Level tier colors for UI
export const LEVEL_COLORS = {
  1: '#2196F3',   // Blue (Beginner: 1-10)
  11: '#4CAF50',  // Green (Intermediate: 11-25)
  26: '#FF9800',  // Orange (Advanced: 26-50)
  51: '#FF5722',  // Deep Orange (Expert: 51-75)
  76: '#9C27B0'   // Purple (Master: 76-100)
};

// Get level color based on level
export const getLevelColor = (level) => {
  if (level >= 76) return LEVEL_COLORS[76];
  if (level >= 51) return LEVEL_COLORS[51];
  if (level >= 26) return LEVEL_COLORS[26];
  if (level >= 11) return LEVEL_COLORS[11];
  return LEVEL_COLORS[1];
};

// Simplified XP calculation for next level (linear progression)
export const calculateNextLevelXP = (currentLevel) => {
  // In simplified system, each level requires 500 XP
  // So next level XP is simply currentLevel * 500
  return currentLevel * GAMIFICATION_CONSTANTS.XP_PER_LEVEL;
};

class AchievementService {
  // Get all available achievements
  async getAllAchievements() {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('tier', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
  }

  // Get user's achievement progress
  async getUserAchievements(userId) {
    try {
      const { data, error } = await supabase
        .from('user_achievement_progress')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      throw error;
    }
  }

  // Get user's gamification data
  async getUserGamification(userId) {
    try {
      const { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no record exists, create one
        if (error.code === 'PGRST116') {
          return await this.createUserGamification(userId);
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching user gamification:', error);
      throw error;
    }
  }

  // Create initial gamification record for user
  async createUserGamification(userId) {
    try {
      const { data, error } = await supabase
        .from('user_gamification')
        .insert({
          user_id: userId,
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          community_score: 0,
          weekly_xp: 0,
          monthly_xp: 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user gamification:', error);
      throw error;
    }
  }

  // Simplified XP awarding without streak functionality
  async awardXP(userId, xpAmount, reason = '', broadcastUpdate = true) {
    try {
      console.log(`🔍 [DEBUG] Starting awardXP for user ${userId}, amount: ${xpAmount}, reason: ${reason}`);

      // Get current gamification data
      const currentData = await this.getUserGamification(userId);
      console.log(`🔍 [DEBUG] Current data retrieved:`, currentData);

      // Calculate new XP values
      const newTotalXP = currentData.total_xp + xpAmount;
      const newWeeklyXP = currentData.weekly_xp + xpAmount;
      const newMonthlyXP = currentData.monthly_xp + xpAmount;
      const oldLevel = currentData.current_level;

      // Calculate new level
      const newLevel = this.calculateLevelFromXP(newTotalXP);

      console.log(`🔍 [DEBUG] Calculated values - Old XP: ${currentData.total_xp}, New XP: ${newTotalXP}, Old Level: ${oldLevel}, New Level: ${newLevel}`);

      // Update gamification data with separate update and fetch approach
      console.log(`🔍 [DEBUG] Attempting database update for user ${userId}`);

      // Check current authentication context
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log(`🔍 [DEBUG] Current authenticated user:`, currentUser?.id, currentUser?.email);
      console.log(`🔍 [DEBUG] Target user ID:`, userId);
      console.log(`🔍 [DEBUG] User IDs match:`, currentUser?.id === userId);

      // Perform UPDATE without .select() to avoid RLS issues
      const { error: updateError } = await supabase
        .from('user_gamification')
        .update({
          total_xp: newTotalXP,
          weekly_xp: newWeeklyXP,
          monthly_xp: newMonthlyXP,
          current_level: newLevel,
          last_activity_date: new Date().toISOString().split('T')[0]
        })
        .eq('user_id', userId);

      console.log(`🔍 [DEBUG] Database update error:`, updateError);
      if (updateError) throw updateError;

      // Fetch the updated record separately
      console.log(`🔍 [DEBUG] Fetching updated record after successful update`);
      const { data: updatedData, error: fetchError } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log(`🔍 [DEBUG] Fetch updated record result - Data:`, updatedData, `Error:`, fetchError);
      if (fetchError) throw fetchError;

      if (!updatedData) {
        throw new Error(`Failed to fetch updated record for user ${userId}`);
      }

      // Use the fetched updated record
      const updatedRecord = updatedData;

      // Broadcast real-time updates if enabled
      if (broadcastUpdate) {
        await this.broadcastXPUpdate(userId, {
          oldXP: currentData.total_xp,
          newXP: newTotalXP,
          xpGained: xpAmount,
          oldLevel,
          newLevel,
          reason,
          leveledUp: newLevel > oldLevel
        });
      }

      // Show level up notification if applicable
      if (newLevel > oldLevel) {
        await this.showLevelUpNotification(userId, newLevel, oldLevel);
      }

      console.log(`Awarded ${xpAmount} XP to user ${userId}. Reason: ${reason}${newLevel > oldLevel ? ` (Level up: ${oldLevel} → ${newLevel})` : ''}`);
      return updatedRecord;
    } catch (error) {
      console.error('Error awarding XP:', error);
      throw error;
    }
  }

  // Calculate level from total XP (simplified linear progression)
  calculateLevelFromXP(totalXP) {
    // Use the simplified linear calculation from utils
    return calculateLevel(totalXP);
  }

  // Real-time XP update broadcasting
  async broadcastXPUpdate(userId, updateData) {
    try {
      // Update React context/state management
      window.dispatchEvent(new CustomEvent('sportea:xp_update', {
        detail: { userId, ...updateData }
      }));

      console.log(`Broadcasting XP update for user ${userId}:`, updateData);
    } catch (error) {
      console.error('Error broadcasting XP update:', error);
    }
  }

  // Simplified leaderboard query for performance
  async getSimpleLeaderboard({ timeframe = 'all', groupType = 'global', limit = 50, userId = null }) {
    try {
      let query = supabase
        .from('simple_leaderboard')
        .select('*');

      // Apply timeframe filtering
      if (timeframe === 'weekly') {
        // For weekly, we'd need to filter by weekly_xp instead
        // For now, using total_xp as the view doesn't have date filtering
        query = query.order('weekly_xp', { ascending: false });
      } else if (timeframe === 'monthly') {
        query = query.order('monthly_xp', { ascending: false });
      } else {
        query = query.order('total_xp', { ascending: false });
      }

      // Apply group filtering
      if (groupType === 'friends' && userId) {
        // Get user's friends first
        const friends = await this.getUserFriends(userId);
        const friendIds = friends.map(f => f.id);
        if (friendIds.length > 0) {
          query = query.in('user_id', friendIds);
        } else {
          return []; // No friends, return empty array
        }
      } else if (groupType === 'faculty' && userId) {
        // Get user's faculty first
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('faculty')
          .eq('id', userId)
          .single();

        if (userProfile?.faculty) {
          query = query.eq('faculty', userProfile.faculty);
        }
      }

      // Apply limit
      query = query.limit(limit);

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching simple leaderboard:', error);
      throw error;
    }
  }

  // Level up notification system
  async showLevelUpNotification(userId, newLevel, oldLevel) {
    try {
      // Create notification in database
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'level_up',
          title: 'Level Up!',
          content: `Congratulations! You've reached Level ${newLevel}!`,
          data: { newLevel, oldLevel },
          is_read: false
        });

      // Broadcast level up event
      window.dispatchEvent(new CustomEvent('sportea:level_up', {
        detail: { userId, newLevel, oldLevel }
      }));

      console.log(`Level up notification sent for user ${userId}: ${oldLevel} → ${newLevel}`);
    } catch (error) {
      console.error('Error showing level up notification:', error);
    }
  }

  // Achievement unlock notification system
  async showAchievementNotification(userId, achievement) {
    try {
      // Create notification in database
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'achievement_unlock',
          title: 'Achievement Unlocked!',
          content: `🎉 ${achievement.name}: ${achievement.description}`,
          is_read: false
        });

      // Mark achievement as notified
      await supabase
        .from('user_achievement_progress')
        .update({ notified: true })
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id);

      // Broadcast achievement unlock event
      window.dispatchEvent(new CustomEvent('sportea:achievement_unlock', {
        detail: { userId, achievement }
      }));

      console.log(`Achievement notification sent for user ${userId}: ${achievement.name}`);
    } catch (error) {
      console.error('Error showing achievement notification:', error);
    }
  }

  // Check and send notifications for unnotified achievements
  async checkAndNotifyAchievements(userId) {
    try {
      // Get all unlocked but unnotified achievements
      const { data: unnotifiedAchievements, error } = await supabase
        .from('user_achievement_progress')
        .select(`
          *,
          achievements (
            id,
            name,
            description,
            xp_reward,
            icon
          )
        `)
        .eq('user_id', userId)
        .eq('unlocked', true)
        .eq('notified', false);

      if (error) throw error;

      // Send notifications for each unnotified achievement
      for (const progress of unnotifiedAchievements || []) {
        if (progress.achievements) {
          await this.showAchievementNotification(userId, progress.achievements);
        }
      }

      return unnotifiedAchievements?.length || 0;
    } catch (error) {
      console.error('Error checking and notifying achievements:', error);
      return 0;
    }
  }

  // Enhanced match XP calculation
  calculateMatchXP(action, matchData = {}) {
    switch (action) {
      case 'HOST_MATCH':
        return XP_VALUES.MATCH_HOSTED;

      case 'JOIN_MATCH':
        return XP_VALUES.MATCH_JOINED;

      case 'COMPLETE_MATCH':
        // Check if user was host or participant
        if (matchData.isHost) {
          return XP_VALUES.MATCH_COMPLETED_HOST;
        } else {
          return XP_VALUES.MATCH_COMPLETED_JOIN;
        }

      default:
        return 0;
    }
  }

  // Daily sign-in XP system
  async handleDailySignIn(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const gamificationData = await this.getUserGamification(userId);

      // Check if user already signed in today
      if (gamificationData.last_activity_date !== today) {
        // Award daily sign-in XP
        await this.awardXP(userId, XP_VALUES.DAILY_SIGNIN, 'Daily sign-in');

        // Update streak
        await this.updateStreak(userId);

        return { success: true, xpAwarded: XP_VALUES.DAILY_SIGNIN };
      }

      return { success: false, message: 'Already signed in today' };
    } catch (error) {
      console.error('Error handling daily sign-in:', error);
      throw error;
    }
  }

  // Check and update achievement progress
  async checkAchievements(userId, actionType, actionData = {}) {
    try {
      const userAchievements = await this.getUserAchievements(userId);
      const allAchievements = await this.getAllAchievements();
      const unlockedAchievements = [];

      for (const achievement of allAchievements) {
        const userProgress = userAchievements.find(ua => ua.achievement_id === achievement.id);

        // Skip if already completed
        if (userProgress?.is_completed) continue;

        const rawProgress = await this.calculateProgress(achievement, actionData, userId);
        // Cap progress at requirement value to prevent display issues like "4/1"
        const newProgress = Math.min(rawProgress, achievement.requirement_value);

        if (newProgress >= achievement.requirement_value) {
          // Achievement unlocked!
          await this.unlockAchievement(userId, achievement.id);
          // TODO: Temporarily disable achievement XP to debug main XP awarding
          // await this.awardXP(userId, achievement.xp_reward, `Achievement: ${achievement.name}`);
          console.log(`🎉 Achievement unlocked: ${achievement.name} (${achievement.xp_reward} XP - not awarded yet)`);
          unlockedAchievements.push(achievement);
        } else if (newProgress > (userProgress?.current_progress || 0)) {
          // Update progress (capped at requirement value)
          await this.updateProgress(userId, achievement.id, newProgress);
        }
      }

      return unlockedAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      throw error;
    }
  }

  // Calculate progress for specific achievement
  async calculateProgress(achievement, actionData, userId) {
    try {
      switch (achievement.category) {
        case 'participation':
          return await this.calculateParticipationProgress(achievement, userId);
        case 'social':
          return await this.calculateSocialProgress(achievement, userId);
        case 'streak':
          return await this.calculateStreakProgress(achievement, userId);
        case 'skill':
          return await this.calculateSkillProgress(achievement, userId);
        default:
          return 0;
      }
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  }

  // Calculate participation-based progress
  async calculateParticipationProgress(achievement, userId) {
    try {
      // Handle specific achievements by name for accuracy
      if (achievement.name === 'First Steps') {
        // Count matches joined (for "Join your first match")
        const { count } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        return count || 0;
      }

      if (achievement.name === 'Getting Started') {
        // Count completed matches (for "Complete 5 matches")
        const { count } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'confirmed'); // Only count confirmed participations
        return count || 0;
      }

      // Legacy logic for other achievements (if any are re-enabled later)
      if (achievement.name.includes('Join') || achievement.name.includes('Player')) {
        // Count matches joined
        const { count } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        return count || 0;
      }

      if (achievement.name.includes('Host') || achievement.name.includes('Organizer') || achievement.name.includes('Master')) {
        // Count matches hosted
        const { count } = await supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .eq('host_id', userId);
        return count || 0;
      }

      if (achievement.name.includes('Sport') || achievement.name.includes('Multi')) {
        // Count unique sports tried
        const { data } = await supabase
          .from('participants')
          .select('match:matches(sport_id)')
          .eq('user_id', userId);

        const uniqueSports = new Set();
        data?.forEach(p => {
          if (p.match?.sport_id) uniqueSports.add(p.match.sport_id);
        });
        return uniqueSports.size;
      }

      return 0;
    } catch (error) {
      console.error('Error calculating participation progress:', error);
      return 0;
    }
  }

  // Calculate social-based progress
  async calculateSocialProgress(achievement, userId) {
    try {
      if (achievement.name.includes('Friend') || achievement.name.includes('Social') || achievement.name.includes('Community')) {
        // Count friends
        const { count } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
          .eq('status', 'accepted');
        return count || 0;
      }
      
      if (achievement.name.includes('Group') || achievement.name.includes('Team')) {
        // Count group matches (matches with multiple participants)
        const { data } = await supabase
          .from('participants')
          .select('match_id')
          .eq('user_id', userId);
        
        let groupMatches = 0;
        for (const participant of data || []) {
          const { count } = await supabase
            .from('participants')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', participant.match_id);
          if (count > 1) groupMatches++;
        }
        return groupMatches;
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating social progress:', error);
      return 0;
    }
  }

  // Calculate streak-based progress
  async calculateStreakProgress(achievement, userId) {
    try {
      const gamificationData = await this.getUserGamification(userId);
      return gamificationData.current_streak || 0;
    } catch (error) {
      console.error('Error calculating streak progress:', error);
      return 0;
    }
  }

  // Calculate skill-based progress
  async calculateSkillProgress(achievement, userId) {
    try {
      // This would require tracking skill improvements
      // For now, return 0 as skill tracking needs to be implemented
      return 0;
    } catch (error) {
      console.error('Error calculating skill progress:', error);
      return 0;
    }
  }

  // Unlock achievement for user
  async unlockAchievement(userId, achievementId) {
    try {
      console.log(`🔍 [DEBUG] Attempting to unlock achievement ${achievementId} for user ${userId}`);

      // First check if achievement is already unlocked to prevent duplicate key errors
      const { data: existingProgress, error: checkError } = await supabase
        .from('user_achievement_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_id', achievementId)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no record exists

      if (checkError) {
        console.log(`🔍 [DEBUG] Error checking existing progress:`, checkError);
        throw checkError;
      }

      // If achievement is already unlocked, return the existing record
      if (existingProgress && existingProgress.is_completed) {
        console.log(`🔍 [DEBUG] Achievement already unlocked:`, existingProgress);
        return existingProgress;
      }

      if (existingProgress && existingProgress.is_completed) {
        console.log(`🔍 [DEBUG] Achievement ${achievementId} already unlocked for user ${userId}`);
        return existingProgress;
      }

      // Get the achievement details to set correct progress
      const { data: achievement, error: achievementError } = await supabase
        .from('achievements')
        .select('requirement_value')
        .eq('id', achievementId)
        .single();

      if (achievementError) throw achievementError;

      // Use upsert with proper conflict resolution to prevent duplicate key errors
      const { data: upsertData, error: upsertError } = await supabase
        .from('user_achievement_progress')
        .upsert({
          user_id: userId,
          achievement_id: achievementId,
          current_progress: achievement.requirement_value, // Set to requirement value when unlocked
          is_completed: true,
          completed_at: new Date().toISOString(),
          notified: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,achievement_id', // Specify the conflict columns
          ignoreDuplicates: false // Update existing records instead of ignoring
        })
        .select()
        .single();

      console.log(`🔍 [DEBUG] Achievement upsert result:`, { data: upsertData, error: upsertError });

      if (upsertError) {
        console.log(`🔍 [DEBUG] Upsert failed, attempting to fetch existing record`);
        // If upsert fails, try to fetch the existing record
        const { data: existingRecord, error: fetchError } = await supabase
          .from('user_achievement_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('achievement_id', achievementId)
          .single();

        if (!fetchError && existingRecord) {
          console.log(`🔍 [DEBUG] Found existing achievement record:`, existingRecord);
          return existingRecord;
        } else {
          throw upsertError;
        }
      }

      if (upsertData) {
        console.log(`🎉 Achievement unlocked for user ${userId}: ${achievementId}`);
        return upsertData;
      }

      // This should not happen if upsert was successful
      throw new Error(`Failed to unlock achievement for user ${userId}, achievement ${achievementId}`);
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      throw error;
    }
  }

  // Update achievement progress
  async updateProgress(userId, achievementId, progress) {
    try {
      console.log(`🔍 [DEBUG] Updating progress for achievement ${achievementId}, user ${userId}, progress: ${progress}`);

      // Use upsert with proper conflict resolution to prevent duplicate key errors
      const { data: upsertData, error: upsertError } = await supabase
        .from('user_achievement_progress')
        .upsert({
          user_id: userId,
          achievement_id: achievementId,
          current_progress: progress,
          is_completed: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,achievement_id', // Specify the conflict columns
          ignoreDuplicates: false // Update existing records instead of ignoring
        })
        .select()
        .single();

      console.log(`🔍 [DEBUG] Progress upsert result:`, { data: upsertData, error: upsertError });

      if (upsertError) {
        console.log(`🔍 [DEBUG] Progress upsert failed, attempting to fetch existing record`);
        // If upsert fails, try to fetch the existing record
        const { data: existingRecord, error: fetchError } = await supabase
          .from('user_achievement_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('achievement_id', achievementId)
          .single();

        if (!fetchError && existingRecord) {
          console.log(`🔍 [DEBUG] Found existing progress record:`, existingRecord);
          return existingRecord;
        } else {
          throw upsertError;
        }
      }

      if (upsertData) {
        console.log(`📊 Progress updated for user ${userId}, achievement ${achievementId}: ${progress}`);
        return upsertData;
      }

      // This should not happen if upsert was successful
      throw new Error(`Failed to update progress for user ${userId}, achievement ${achievementId}`);
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  }

  // Enhanced leaderboard data retrieval with comprehensive features
  async getLeaderboard(type = 'xp', timeframe = 'all', limit = 10, groupType = 'global', userId = null) {
    try {
      let query = supabase
        .from('user_gamification')
        .select(`
          *,
          user:users(full_name, avatar_url, username, faculty, campus)
        `);

      // Apply ordering based on type and timeframe
      switch (type) {
        case 'xp':
          if (timeframe === 'weekly') {
            query = query.order('weekly_xp', { ascending: false });
          } else if (timeframe === 'monthly') {
            query = query.order('monthly_xp', { ascending: false });
          } else {
            query = query.order('total_xp', { ascending: false });
          }
          break;
        case 'level':
          // Level leaderboards always order by current_level regardless of timeframe
          query = query.order('current_level', { ascending: false }).order('total_xp', { ascending: false });
          break;
        case 'community':
          if (timeframe === 'weekly') {
            // Use weekly community score if available, fallback to regular community score
            query = query.order('weekly_community_score', { ascending: false, nullsLast: true })
                         .order('community_score', { ascending: false });
          } else if (timeframe === 'monthly') {
            // Use monthly community score if available, fallback to regular community score
            query = query.order('monthly_community_score', { ascending: false, nullsLast: true })
                         .order('community_score', { ascending: false });
          } else {
            query = query.order('community_score', { ascending: false });
          }
          break;
        case 'streak':
          // Streak leaderboards always order by current_streak regardless of timeframe
          query = query.order('current_streak', { ascending: false });
          break;
        default:
          if (timeframe === 'weekly') {
            query = query.order('weekly_xp', { ascending: false });
          } else if (timeframe === 'monthly') {
            query = query.order('monthly_xp', { ascending: false });
          } else {
            query = query.order('total_xp', { ascending: false });
          }
      }

      // Apply group-based filtering
      if (groupType === 'friends' && userId) {
        // Get user's friends first
        const friends = await this.getUserFriends(userId);
        const friendIds = friends.map(friend => friend.userId);
        friendIds.push(userId); // Include the user themselves

        if (friendIds.length > 0) {
          query = query.in('user_id', friendIds);
        }
      } else if (groupType === 'level_tier' && userId) {
        // Get user's level and create tier-based grouping
        const userGamification = await this.getUserGamification(userId);
        const userLevel = userGamification.current_level;
        const { minLevel, maxLevel } = this.getLevelTierRange(userLevel);

        query = query.gte('current_level', minLevel).lte('current_level', maxLevel);
      }

      query = query.limit(limit);
      const { data, error } = await query;

      if (error) throw error;

      return data.map((entry, index) => ({
        rank: index + 1,
        userId: entry.user_id,
        user: entry.user,
        score: this.getScoreByType(entry, type, timeframe),
        level: entry.current_level,
        totalXP: entry.total_xp,
        weeklyXP: entry.weekly_xp,
        monthlyXP: entry.monthly_xp,
        communityScore: entry.community_score,
        currentStreak: entry.current_streak,
        faculty: entry.user?.faculty,
        campus: entry.user?.campus
      }));

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  // Get user's friends for friend-based leaderboards
  async getUserFriends(userId) {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user_id,
          friend_id,
          user:user_id(id, full_name, username, avatar_url),
          friend:friend_id(id, full_name, username, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (error) throw error;

      return data.map(friendship => {
        const friend = friendship.user_id === userId ? friendship.friend : friendship.user;
        return {
          userId: friend.id,
          fullName: friend.full_name,
          username: friend.username,
          avatarUrl: friend.avatar_url
        };
      });
    } catch (error) {
      console.error('Error fetching user friends:', error);
      return [];
    }
  }

  // Get level tier range for level-based grouping
  getLevelTierRange(userLevel) {
    if (userLevel <= 10) return { minLevel: 1, maxLevel: 10 };
    if (userLevel <= 25) return { minLevel: 11, maxLevel: 25 };
    if (userLevel <= 50) return { minLevel: 26, maxLevel: 50 };
    if (userLevel <= 75) return { minLevel: 51, maxLevel: 75 };
    return { minLevel: 76, maxLevel: 100 };
  }

  // Get user's current ranking in a specific leaderboard
  async getUserRanking(userId, type = 'xp', timeframe = 'all', groupType = 'global') {
    try {
      const fullLeaderboard = await this.getLeaderboard(type, timeframe, 1000, groupType, userId);
      const userRank = fullLeaderboard.findIndex(entry => entry.userId === userId);

      if (userRank === -1) {
        return null;
      }

      return {
        rank: userRank + 1,
        totalParticipants: fullLeaderboard.length,
        ...fullLeaderboard[userRank]
      };
    } catch (error) {
      console.error('Error fetching user ranking:', error);
      return null;
    }
  }

  // Get score by type and timeframe
  getScoreByType(entry, type, timeframe = 'all') {
    // For XP leaderboards, timeframe affects which XP value to use
    if (type === 'xp') {
      if (timeframe === 'weekly') {
        return entry.weekly_xp;
      } else if (timeframe === 'monthly') {
        return entry.monthly_xp;
      } else {
        return entry.total_xp;
      }
    }

    // For Community leaderboards, timeframe affects which community score to use
    if (type === 'community') {
      if (timeframe === 'weekly') {
        return entry.weekly_community_score || entry.community_score;
      } else if (timeframe === 'monthly') {
        return entry.monthly_community_score || entry.community_score;
      } else {
        return entry.community_score;
      }
    }

    // For Level and Streak leaderboards, timeframe doesn't affect the value
    // These are always current values regardless of timeframe
    switch (type) {
      case 'level':
        return entry.current_level;
      case 'streak':
        return entry.current_streak;
      default:
        return entry.total_xp;
    }
  }

  // Update user streak (without recursive XP awarding)
  async updateStreak(userId) {
    try {
      const gamificationData = await this.getUserGamification(userId);
      const today = new Date().toISOString().split('T')[0];
      const lastActivity = gamificationData.last_activity_date;

      let newStreak = gamificationData.current_streak;
      let streakBonusXP = 0;

      if (lastActivity) {
        const lastDate = new Date(lastActivity);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          newStreak += 1;
          // Calculate streak bonus XP (but don't award it recursively)
          if (newStreak > 1) {
            streakBonusXP = XP_VALUES.STREAK_BONUS;
          }
        } else if (diffDays > 1) {
          // Streak broken
          newStreak = 1;
        }
        // If diffDays === 0, same day, no change
      } else {
        // First activity
        newStreak = 1;
      }

      const longestStreak = Math.max(gamificationData.longest_streak, newStreak);

      const { data, error } = await supabase
        .from('user_gamification')
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: today
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        streakBonusXP,
        streakMessage: streakBonusXP > 0 ? `Streak bonus (${newStreak} days)` : null
      };
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }

  // Manual achievement check for all users (admin function)
  async checkAllUserAchievements() {
    try {
      console.log('Starting manual achievement check for all users...');

      // Get all users with gamification data
      const { data: users, error } = await supabase
        .from('user_gamification')
        .select(`
          user_id,
          user:users(full_name, email)
        `);

      if (error) throw error;

      let totalUnlocked = 0;

      for (const userRecord of users) {
        const userId = userRecord.user_id;
        console.log(`Checking achievements for user: ${userRecord.user?.full_name || userId}`);

        try {
          const unlockedAchievements = await this.checkAchievements(userId, 'manual_check');
          totalUnlocked += unlockedAchievements.length;

          if (unlockedAchievements.length > 0) {
            console.log(`✅ Unlocked ${unlockedAchievements.length} achievements for ${userRecord.user?.full_name}`);
            unlockedAchievements.forEach(achievement => {
              console.log(`  - ${achievement.name}: ${achievement.description}`);
            });
          }
        } catch (userError) {
          console.error(`Error checking achievements for user ${userId}:`, userError);
        }
      }

      console.log(`✅ Manual achievement check completed. Total achievements unlocked: ${totalUnlocked}`);
      return { success: true, totalUnlocked, usersChecked: users.length };
    } catch (error) {
      console.error('Error in manual achievement check:', error);
      throw error;
    }
  }

  // Initialize achievement progress for a user (creates initial progress records)
  async initializeUserAchievements(userId) {
    try {
      console.log(`Initializing achievements for user: ${userId}`);

      const allAchievements = await this.getAllAchievements();
      const userProgress = await this.getUserAchievements(userId);

      // Check which achievements don't have progress records yet
      const missingAchievements = allAchievements.filter(achievement =>
        !userProgress.find(up => up.achievement_id === achievement.id)
      );

      console.log(`Found ${missingAchievements.length} achievements without progress records`);

      // Create initial progress records and check for immediate unlocks
      for (const achievement of missingAchievements) {
        const rawProgress = await this.calculateProgress(achievement, {}, userId);
        // Cap progress at requirement value to prevent display issues
        const currentProgress = Math.min(rawProgress, achievement.requirement_value);

        if (currentProgress >= achievement.requirement_value) {
          // Achievement should be unlocked immediately
          await this.unlockAchievement(userId, achievement.id);
          await this.awardXP(userId, achievement.xp_reward, `Achievement: ${achievement.name}`);
          console.log(`🎉 Immediately unlocked: ${achievement.name}`);
        } else if (currentProgress > 0) {
          // Create progress record (capped at requirement value)
          await this.updateProgress(userId, achievement.id, currentProgress);
          console.log(`📊 Progress created: ${achievement.name} (${currentProgress}/${achievement.requirement_value})`);
        }
      }

      return { success: true, processed: missingAchievements.length };
    } catch (error) {
      console.error('Error initializing user achievements:', error);
      throw error;
    }
  }
}

export const achievementService = new AchievementService();

// Global function for manual testing
window.runManualAchievementCheck = async () => {
  try {
    console.log('🚀 Starting manual achievement check...');
    const result = await achievementService.checkAllUserAchievements();
    console.log('✅ Manual achievement check completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Error running manual achievement check:', error);
    throw error;
  }
};

// Global function for single user testing
window.checkUserAchievements = async (userId) => {
  try {
    console.log(`🚀 Checking achievements for user: ${userId}`);
    const result = await achievementService.checkAchievements(userId, 'manual_check');
    console.log('✅ User achievement check completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Error checking user achievements:', error);
    throw error;
  }
};

export default achievementService;
