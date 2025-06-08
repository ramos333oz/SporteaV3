import { supabase } from './supabase';

/**
 * Service for handling notifications
 */
export const notificationService = {
  /**
   * Get all notifications for a user
   * @param {string} userId - User ID
   * @param {boolean} unreadOnly - Whether to get only unread notifications
   * @returns {Promise<Array>} Array of notifications
   */
  getNotifications: async (userId, unreadOnly = false) => {
    try {
      // Validate input
      if (!userId) {
        console.warn('getNotifications called without userId');
        return [];
      }

      // Use a simpler query that doesn't try to join with matches table
      // since the relationship isn't properly defined in the database yet
      let query = supabase
        .from('notifications')
        .select(`
          *,
          sender:users(id, full_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (unreadOnly) {
        query = query.eq('read', false);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching notifications:', error);
        // Return empty array instead of throwing to prevent UI breakage
        return [];
      }
      
      // Add empty match property to maintain expected data structure
      const processedData = (data || []).map(notification => ({
        ...notification,
        match: null
      }));
      
      return processedData;  
    } catch (error) {
      console.error('Unexpected error in getNotifications:', error);
      return [];
    }
  },
  
  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  markAsRead: async (notificationId) => {
    try {
      // Validate input
      if (!notificationId) {
        console.warn('markAsRead called without notificationId');
        return null;
      }
      
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .select();
        
      if (error) {
        console.error('Error marking notification as read:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Unexpected error in markAsRead:', error);
      return null;
    }
  },
  
  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result
   */
  markAllAsRead: async (userId) => {
    try {
      // Validate input
      if (!userId) {
        console.warn('markAllAsRead called without userId');
        return null;
      }
      
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
        
      if (error) {
        console.error('Error marking all notifications as read:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Unexpected error in markAllAsRead:', error);
      return null;
    }
  },
  
  /**
   * Create a notification
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Created notification
   */
  createNotification: async ({ user_id, title, type, content, match_id = null }) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id,
          title,
          type,
          content,
          match_id,
          is_read: false
        })
        .select();

      if (error) throw error;

      return {
        success: true,
        message: 'Notification created successfully',
        data: data[0]
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        message: 'Failed to create notification',
        error
      };
    }
  },
  
  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of unread notifications
   */
  getUnreadCount: async () => {
    try {
      const currentUser = supabase.auth.getUser();
      
      if (!currentUser || !currentUser.data || !currentUser.data.user) {
        return {
          success: false,
          message: 'You must be logged in to get unread count',
          count: 0
        };
      }
      
      const user = currentUser.data.user;
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      return {
        success: true,
        count: count || 0
      };
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return {
        success: false,
        message: 'Failed to get unread count',
        count: 0,
        error
      };
    }
  },
  
  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<void>}
   */
  deleteNotification: async (notificationId) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .select();

      if (error) throw error;

      return {
        success: true,
        message: 'Notification deleted successfully',
        data: data[0]
      };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return {
        success: false,
        message: 'Failed to delete notification',
        error
      };
    }
  }
};

// Helper function to create notification content based on type
export const createNotificationContent = (type, data) => {
  switch (type) {
    case 'match_invite':
      return `You've been invited to join "${data.match_title}"`;
    case 'match_join_request':
      return `${data.sender_name} wants to join your match "${data.match_title}"`;
    case 'join_request_accepted':
      return `Your request to join "${data.match_title}" has been accepted`;
    case 'join_request_rejected':
      return `Your request to join "${data.match_title}" has been rejected`;
    case 'match_cancelled':
      return `Match "${data.match_title}" has been cancelled`;
    case 'match_updated':
      return `Match "${data.match_title}" details have been updated`;
    case 'match_starting_soon':
      return `Your match "${data.match_title}" is starting soon`;
    case 'new_message':
      return `New message from ${data.sender_name}`;
    case 'friend_request':
      return `${data.sender_name} sent you a friend request`;
    case 'friend_request_accepted':
      return `${data.sender_name} accepted your friend request`;
    case 'friend_request_declined':
      return `${data.sender_name} declined your friend request`;
    case 'friend_removed':
      return `${data.sender_name} is no longer your friend`;
    case 'friend_blocked':
      return `You have blocked ${data.sender_name}`;
    default:
      return `New notification`;
  }
};
