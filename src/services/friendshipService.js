import { supabase } from './supabase';

/**
 * Service for managing user friendships
 */
const friendshipService = {
  /**
   * Get all friendships for the current user
   * @returns {Promise<Object>} - All friendship data categorized
   */
  getAllFriendships: async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      
      // Fetch accepted friendships where user is either the requester or addressee
      const { data: acceptedFriendships, error: acceptedError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          requester_id,
          addressee_id,
          requester:requester_id(id, username, full_name, email, avatar_url),
          addressee:addressee_id(id, username, full_name, email, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);

      if (acceptedError) throw acceptedError;

      // Fetch pending friend requests received by the user
      const { data: receivedRequests, error: receivedError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          requester_id,
          addressee_id,
          requester:requester_id(id, username, full_name, email, avatar_url)
        `)
        .eq('status', 'pending')
        .eq('addressee_id', currentUser.id);

      if (receivedError) throw receivedError;

      // Fetch pending friend requests sent by the user
      const { data: sentRequests, error: sentError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          requester_id,
          addressee_id,
          addressee:addressee_id(id, username, full_name, email, avatar_url)
        `)
        .eq('status', 'pending')
        .eq('requester_id', currentUser.id);

      if (sentError) throw sentError;

      // Process accepted friendships to get friend details regardless of who sent the request
      const friends = acceptedFriendships.map(friendship => {
        // If requester_id is the current user, then the friend is addressee_id
        if (friendship.requester_id === currentUser.id) {
          return {
            id: friendship.id,
            friendId: friendship.addressee_id,
            username: friendship.addressee.username,
            fullName: friendship.addressee.full_name,
            email: friendship.addressee.email,
            avatarUrl: friendship.addressee.avatar_url,
            createdAt: friendship.created_at
          };
        } else {
          // Otherwise, the friend is requester_id
          return {
            id: friendship.id,
            friendId: friendship.requester_id,
            username: friendship.requester.username,
            fullName: friendship.requester.full_name,
            email: friendship.requester.email,
            avatarUrl: friendship.requester.avatar_url,
            createdAt: friendship.created_at
          };
        }
      });

      // Format pending requests
      const pendingRequests = receivedRequests.map(request => ({
        id: request.id,
        userId: request.requester_id,
        username: request.requester.username,
        fullName: request.requester.full_name,
        email: request.requester.email,
        avatarUrl: request.requester.avatar_url,
        createdAt: request.created_at
      }));

      // Format sent requests
      const sentRequestsFormatted = sentRequests.map(request => ({
        id: request.id,
        userId: request.addressee_id,
        username: request.addressee.username,
        fullName: request.addressee.full_name,
        email: request.addressee.email,
        avatarUrl: request.addressee.avatar_url,
        createdAt: request.created_at
      }));

      return { 
        success: true, 
        data: {
          friends,
          pendingRequests,
          sentRequests: sentRequestsFormatted
        }
      };
    } catch (error) {
      console.error('Error getting all friendships:', error);
      return { success: false, error: error.message };
    }
  },
  /**
   * Get friendship status between current user and another user
   * @param {string} userId - The ID of the user to check friendship status with
   * @returns {Promise<Object>} - Friendship status info
   */
  getFriendshipStatus: async (userId) => {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Check both directions of friendship
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is the error code for "no rows returned"
        throw error;
      }

      // No friendship record found
      if (!data) {
        return { success: true, status: 'not-friends' };
      }

      // Determine status based on record
      if (data.status === 'accepted') {
        return { success: true, status: 'friends', data };
      } else if (data.status === 'pending') {
        // Check if current user is the requester or the addressee
        if (data.requester_id === currentUser.id) {
          return { success: true, status: 'request-sent', data };
        } else {
          return { success: true, status: 'request-received', data };
        }
      } else if (data.status === 'blocked') {
        // Check who blocked whom
        if (data.requester_id === currentUser.id) {
          return { success: true, status: 'blocked-by-me', data };
        } else {
          return { success: true, status: 'blocked-by-them', data };
        }
      }

      return { success: true, status: 'unknown', data };
    } catch (error) {
      console.error('Error getting friendship status:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send a friend request to another user
   * @param {string} userId - The ID of the user to send a request to
   * @returns {Promise<Object>} - Result of the operation
   */
  sendFriendRequest: async (userId) => {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Check if a friendship already exists
      const { data: existingFriendship, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .or(`(requester_id.eq.${currentUser.id}.and.addressee_id.eq.${userId}),(requester_id.eq.${userId}.and.addressee_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      // If friendship exists, return appropriate message
      if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
          return { success: false, message: 'You are already friends with this user' };
        } else if (existingFriendship.status === 'pending') {
          if (existingFriendship.requester_id === currentUser.id) {
            return { success: false, message: 'Friend request already sent' };
          } else {
            return { success: false, message: 'This user has already sent you a friend request' };
          }
        } else if (existingFriendship.status === 'blocked') {
          return { success: false, message: 'Unable to send friend request' };
        }
      }

      // Create friend request
      const { data, error } = await supabase
        .from('friendships')
        .insert({
          requester_id: currentUser.id,
          addressee_id: userId,
          status: 'pending'
        })
        .select('*')
        .single();

      if (error) throw error;

      // Create notification for the recipient
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'friend_request',
          data: {
            friendship_id: data.id,
            requester_id: currentUser.id,
            requester_name: currentUser.user_metadata?.full_name || currentUser.email
          },
          read: false
        });

      return { success: true, data };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Accept a friend request
   * @param {string} friendshipId - The ID of the friendship to accept
   * @returns {Promise<Object>} - Result of the operation
   */
  acceptFriendRequest: async (friendshipId) => {
    try {
      if (!friendshipId) {
        throw new Error('Friendship ID is required');
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get the friendship record
      const { data: friendship, error: fetchError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .single();

      if (fetchError) throw fetchError;

      // Check if current user is the addressee
      if (friendship.addressee_id !== currentUser.id) {
        throw new Error('You can only accept requests sent to you');
      }

      // Update friendship status
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
        .select('*')
        .single();

      if (error) throw error;

      // Mark the original friend request notification as read and processed
      await supabase
        .from('notifications')
        .update({
          is_read: true,
          processed: true
        })
        .eq('user_id', currentUser.id)
        .eq('type', 'friend_request')
        .contains('content', JSON.stringify({ sender_id: friendship.user_id }));

      // Create notification for the requester
      await supabase
        .from('notifications')
        .insert({
          user_id: friendship.requester_id,
          type: 'friend_request_accepted',
          title: 'Friend Request Accepted',
          content: JSON.stringify({
            message: `${currentUser.user_metadata?.full_name || currentUser.email} accepted your friend request.`,
            accepter_id: currentUser.id,
            accepter_name: currentUser.user_metadata?.full_name || currentUser.email
          }),
          is_read: false
        });

      // Broadcast friendship status change event for real-time updates
      window.dispatchEvent(new CustomEvent('sportea:friendship_status_changed', {
        detail: {
          friendshipId: data.id,
          requester_id: friendship.user_id,
          addressee_id: friendship.friend_id,
          status: 'accepted',
          action: 'accepted'
        }
      }));

      console.log(`[FriendshipService] Friend request accepted: ${friendshipId}`);

      return { success: true, data };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Decline a friend request
   * @param {string} friendshipId - The ID of the friendship to decline
   * @returns {Promise<Object>} - Result of the operation
   */
  declineFriendRequest: async (friendshipId) => {
    try {
      if (!friendshipId) {
        throw new Error('Friendship ID is required');
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get the friendship record
      const { data: friendship, error: fetchError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .single();

      if (fetchError) throw fetchError;

      // Check if current user is the addressee
      if (friendship.addressee_id !== currentUser.id) {
        throw new Error('You can only decline requests sent to you');
      }

      // Update friendship status
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', friendshipId)
        .select('*')
        .single();

      if (error) throw error;

      // Mark the original friend request notification as read and processed
      await supabase
        .from('notifications')
        .update({
          is_read: true,
          processed: true
        })
        .eq('user_id', currentUser.id)
        .eq('type', 'friend_request')
        .contains('content', JSON.stringify({ sender_id: friendship.user_id }));

      // Broadcast friendship status change event for real-time updates
      window.dispatchEvent(new CustomEvent('sportea:friendship_status_changed', {
        detail: {
          friendshipId: data.id,
          requester_id: friendship.user_id,
          addressee_id: friendship.friend_id,
          status: 'declined',
          action: 'declined'
        }
      }));

      console.log(`[FriendshipService] Friend request declined: ${friendshipId}`);

      return { success: true, data };
    } catch (error) {
      console.error('Error declining friend request:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Remove a friend or cancel a sent request
   * @param {string} friendshipId - The ID of the friendship to remove
   * @returns {Promise<Object>} - Result of the operation
   */
  removeFriend: async (friendshipId) => {
    try {
      if (!friendshipId) {
        throw new Error('Friendship ID is required');
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get the friendship record
      const { data: friendship, error: fetchError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .single();

      if (fetchError) throw fetchError;

      // Check if current user is part of the friendship
      if (friendship.requester_id !== currentUser.id && friendship.addressee_id !== currentUser.id) {
        throw new Error('You are not part of this friendship');
      }

      // Delete the friendship
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error removing friend:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Block a user
   * @param {string} userId - The ID of the user to block
   * @returns {Promise<Object>} - Result of the operation
   */
  blockUser: async (userId) => {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Check if a friendship already exists
      const { data: existingFriendship, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .or(`(requester_id.eq.${currentUser.id}.and.addressee_id.eq.${userId}),(requester_id.eq.${userId}.and.addressee_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      // If friendship exists, update it to blocked
      if (existingFriendship) {
        const { data, error } = await supabase
          .from('friendships')
          .update({ 
            status: 'blocked',
            requester_id: currentUser.id, // Make current user the blocker (requester)
            addressee_id: userId // Make target user the blocked (addressee)
          })
          .eq('id', existingFriendship.id)
          .select('*')
          .single();

        if (error) throw error;
        return { success: true, data };
      }

      // Otherwise create a new blocked relationship
      const { data, error } = await supabase
        .from('friendships')
        .insert({
          requester_id: currentUser.id,
          addressee_id: userId,
          status: 'blocked'
        })
        .select('*')
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Unblock a user
   * @param {string} friendshipId - The ID of the blocked relationship
   * @returns {Promise<Object>} - Result of the operation
   */
  unblockUser: async (friendshipId) => {
    try {
      if (!friendshipId) {
        throw new Error('Friendship ID is required');
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get the friendship record
      const { data: friendship, error: fetchError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .single();

      if (fetchError) throw fetchError;

      // Check if current user is the requester (blocker)
      if (friendship.requester_id !== currentUser.id || friendship.status !== 'blocked') {
        throw new Error('You can only unblock users that you have blocked');
      }

      // Delete the blocked relationship
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all friends of the current user
   * @returns {Promise<Object>} - List of friends
   */
  getFriends: async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get accepted friendships where user is either the requester or addressee
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          requester_id,
          addressee_id,
          requester:requester_id(id, username, full_name, avatar_url, email),
          addressee:addressee_id(id, username, full_name, avatar_url, email)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);

      if (error) throw error;

      // Transform data to get friend details
      const friends = data.map(friendship => {
        // If current user is the requester, return addressee as friend
        if (friendship.requester_id === currentUser.id) {
          return {
            id: friendship.id,
            user_id: friendship.addressee_id,
            username: friendship.addressee.username,
            full_name: friendship.addressee.full_name,
            email: friendship.addressee.email,
            avatar_url: friendship.addressee.avatar_url,
            created_at: friendship.created_at
          };
        } else {
          // Otherwise return requester as friend
          return {
            id: friendship.id,
            user_id: friendship.requester_id,
            username: friendship.requester.username,
            full_name: friendship.requester.full_name,
            email: friendship.requester.email,
            avatar_url: friendship.requester.avatar_url,
            created_at: friendship.created_at
          };
        }
      });

      return { success: true, data: friends };
    } catch (error) {
      console.error('Error getting friends:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get pending friend requests for the current user
   * @returns {Promise<Object>} - List of pending requests
   */
  getPendingRequests: async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get pending requests where user is the addressee
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          requester_id,
          addressee_id,
          requester:requester_id(id, username, full_name, avatar_url, email)
        `)
        .eq('status', 'pending')
        .eq('addressee_id', currentUser.id);

      if (error) throw error;

      // Transform data to be more user-friendly
      const requests = data.map(friendship => ({
        id: friendship.id,
        user_id: friendship.requester_id,
        username: friendship.requester.username,
        full_name: friendship.requester.full_name,
        email: friendship.requester.email,
        avatar_url: friendship.requester.avatar_url,
        created_at: friendship.created_at
      }));

      return { success: true, data: requests };
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get sent friend requests from the current user
   * @returns {Promise<Object>} - List of sent requests
   */
  getSentRequests: async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get pending requests where user is the requester
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          requester_id,
          addressee_id,
          addressee:addressee_id(id, username, full_name, avatar_url, email)
        `)
        .eq('status', 'pending')
        .eq('requester_id', currentUser.id);

      if (error) throw error;

      // Transform data to be more user-friendly
      const requests = data.map(friendship => ({
        id: friendship.id,
        user_id: friendship.addressee_id,
        username: friendship.addressee.username,
        full_name: friendship.addressee.full_name,
        email: friendship.addressee.email,
        avatar_url: friendship.addressee.avatar_url,
        created_at: friendship.created_at
      }));

      return { success: true, data: requests };
    } catch (error) {
      console.error('Error getting sent requests:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get blocked users by the current user
   * @returns {Promise<Object>} - List of blocked users
   */
  getBlockedUsers: async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get blocked relationships where user is the requester
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          requester_id,
          addressee_id,
          addressee:addressee_id(id, username, full_name, avatar_url, email)
        `)
        .eq('status', 'blocked')
        .eq('requester_id', currentUser.id);

      if (error) throw error;

      // Transform data to be more user-friendly
      const blockedUsers = data.map(friendship => ({
        id: friendship.id,
        user_id: friendship.addressee_id,
        username: friendship.addressee.username,
        full_name: friendship.addressee.full_name,
        email: friendship.addressee.email,
        avatar_url: friendship.addressee.avatar_url,
        created_at: friendship.created_at
      }));

      return { success: true, data: blockedUsers };
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Block a user
   * @param {string} userId - The ID of the user to block
   * @returns {Promise<Object>} - Result of the operation
   */
  blockUser: async (userId) => {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Check if a friendship already exists
      const { data: existingFriendship, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .or(`(requester_id.eq.${currentUser.id}.and.addressee_id.eq.${userId}),(requester_id.eq.${userId}.and.addressee_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      let result;

      if (existingFriendship) {
        // Update existing friendship to blocked status
        const { data, error } = await supabase
          .from('friendships')
          .update({ 
            status: 'blocked',
            requester_id: currentUser.id, // Ensure current user is the blocker
            addressee_id: userId
          })
          .eq('id', existingFriendship.id)
          .select('*')
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new blocked relationship
        const { data, error } = await supabase
          .from('friendships')
          .insert({
            requester_id: currentUser.id,
            addressee_id: userId,
            status: 'blocked'
          })
          .select('*')
          .single();

        if (error) throw error;
        result = data;
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Unblock a user
   * @param {string} friendshipId - The ID of the friendship to unblock
   * @returns {Promise<Object>} - Result of the operation
   */
  unblockUser: async (friendshipId) => {
    try {
      if (!friendshipId) {
        throw new Error('Friendship ID is required');
      }

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Get the friendship record
      const { data: friendship, error: fetchError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .single();

      if (fetchError) throw fetchError;

      // Check if current user is the requester (blocker)
      if (friendship.requester_id !== currentUser.id || friendship.status !== 'blocked') {
        throw new Error('You can only unblock users that you have blocked');
      }

      // Delete the blocked relationship
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: error.message };
    }
  }
};

export { friendshipService }; 