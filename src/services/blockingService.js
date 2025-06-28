import { supabase } from './supabase';

/**
 * Service for handling user blocking functionality
 * Provides utilities to check blocking status and filter blocked users
 */
export const blockingService = {
  /**
   * Check if user A has blocked user B
   * @param {string} blockerUserId - The user who might have blocked
   * @param {string} blockedUserId - The user who might be blocked
   * @returns {Promise<boolean>} - True if blockerUserId has blocked blockedUserId
   */
  isUserBlocked: async (blockerUserId, blockedUserId) => {
    try {
      if (!blockerUserId || !blockedUserId) return false;
      if (blockerUserId === blockedUserId) return false;

      const { data, error } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'blocked')
        .eq('user_id', blockerUserId)
        .eq('friend_id', blockedUserId)
        .maybeSingle();

      if (error) {
        console.error('Error checking if user is blocked:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in isUserBlocked:', error);
      return false;
    }
  },

  /**
   * Check if there's any blocking relationship between two users (bidirectional)
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<{isBlocked: boolean, blockedBy: string|null}>} - Blocking status and who blocked whom
   */
  checkMutualBlockingStatus: async (userId1, userId2) => {
    try {
      if (!userId1 || !userId2) return { isBlocked: false, blockedBy: null };
      if (userId1 === userId2) return { isBlocked: false, blockedBy: null };

      const { data, error } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'blocked')
        .or(`and(user_id.eq.${userId1},friend_id.eq.${userId2}),and(user_id.eq.${userId2},friend_id.eq.${userId1})`);

      if (error) {
        console.error('Error checking mutual blocking status:', error);
        return { isBlocked: false, blockedBy: null };
      }

      if (data && data.length > 0) {
        const blockingRecord = data[0];
        return {
          isBlocked: true,
          blockedBy: blockingRecord.user_id
        };
      }

      return { isBlocked: false, blockedBy: null };
    } catch (error) {
      console.error('Error in checkMutualBlockingStatus:', error);
      return { isBlocked: false, blockedBy: null };
    }
  },

  /**
   * Get all users blocked by the current user
   * @param {string} currentUserId - Current user's ID
   * @returns {Promise<string[]>} - Array of blocked user IDs
   */
  getBlockedUserIds: async (currentUserId) => {
    try {
      if (!currentUserId) return [];

      const { data, error } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('status', 'blocked')
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error getting blocked user IDs:', error);
        return [];
      }

      return data ? data.map(record => record.friend_id) : [];
    } catch (error) {
      console.error('Error in getBlockedUserIds:', error);
      return [];
    }
  },

  /**
   * Get all users who have blocked the current user
   * @param {string} currentUserId - Current user's ID
   * @returns {Promise<string[]>} - Array of user IDs who blocked the current user
   */
  getUsersWhoBlockedMe: async (currentUserId) => {
    try {
      if (!currentUserId) return [];

      const { data, error } = await supabase
        .from('friendships')
        .select('user_id')
        .eq('status', 'blocked')
        .eq('friend_id', currentUserId);

      if (error) {
        console.error('Error getting users who blocked me:', error);
        return [];
      }

      return data ? data.map(record => record.user_id) : [];
    } catch (error) {
      console.error('Error in getUsersWhoBlockedMe:', error);
      return [];
    }
  },

  /**
   * Filter out blocked users from a list of users
   * This removes:
   * 1. Users that the current user has blocked
   * 2. Users who have blocked the current user
   * @param {Array} users - Array of user objects with 'id' property
   * @param {string} currentUserId - Current user's ID
   * @returns {Promise<Array>} - Filtered array without blocked users
   */
  filterBlockedUsers: async (users, currentUserId) => {
    try {
      if (!users || users.length === 0 || !currentUserId) return users || [];

      // Get users blocked by current user
      const blockedByMe = await blockingService.getBlockedUserIds(currentUserId);
      
      // Get users who blocked current user
      const whoBlockedMe = await blockingService.getUsersWhoBlockedMe(currentUserId);
      
      // Combine both lists
      const allBlockedUsers = [...new Set([...blockedByMe, ...whoBlockedMe])];

      // Filter out blocked users
      return users.filter(user => !allBlockedUsers.includes(user.id));
    } catch (error) {
      console.error('Error filtering blocked users:', error);
      return users || [];
    }
  },

  /**
   * Check if current user can view another user's profile
   * @param {string} currentUserId - Current user's ID
   * @param {string} targetUserId - Target user's ID to view
   * @returns {Promise<{canView: boolean, reason: string|null}>} - Whether user can view profile and reason if not
   */
  canViewProfile: async (currentUserId, targetUserId) => {
    try {
      if (!currentUserId || !targetUserId) {
        return { canView: false, reason: 'Invalid user IDs' };
      }

      if (currentUserId === targetUserId) {
        return { canView: true, reason: null }; // Can always view own profile
      }

      const blockingStatus = await blockingService.checkMutualBlockingStatus(currentUserId, targetUserId);
      
      if (blockingStatus.isBlocked) {
        if (blockingStatus.blockedBy === currentUserId) {
          return { canView: false, reason: 'You have blocked this user' };
        } else {
          return { canView: false, reason: 'You have been blocked by this user' };
        }
      }

      return { canView: true, reason: null };
    } catch (error) {
      console.error('Error checking profile view permission:', error);
      return { canView: false, reason: 'Error checking permissions' };
    }
  }
};

export default blockingService;
