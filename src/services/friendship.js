import { supabase } from './supabase';
import { notificationService } from './notifications';

// Friendship service for managing friend relationships between users
export const friendshipService = {
  // Send a friend request to another user
  sendFriendRequest: async (friendId) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to send friend requests',
        };
      }
      
      const user = currentUser.user;
      
      // Prevent sending request to yourself
      if (user.id === friendId) {
        return {
          success: false,
          message: 'You cannot send a friend request to yourself',
        };
      }
      
      // Check if a request already exists
      const { data: existingFriendship, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingFriendship) {
        return {
          success: false,
          message: 'A friendship or request already exists between these users',
          data: existingFriendship
        };
      }

      // Create new friendship request record
      const { data, error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Get user details for notification
      const { data: userData } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', user.id)
        .single();
        
      const senderName = userData?.full_name || userData?.username || user.email;

      // Create notification for the recipient
      await notificationService.createNotification({
        user_id: friendId,
        title: 'New Friend Request',
        type: 'friend_request',
        content: JSON.stringify({
          message: `${senderName} has sent you a friend request.`,
          sender_id: user.id,
          sender_name: senderName
        })
      });

      return {
        success: true,
        message: 'Friend request sent successfully',
        data
      };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return {
        success: false,
        message: 'Failed to send friend request',
        error
      };
    }
  },

  // Accept a friend request
  acceptFriendRequest: async (friendshipId) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to accept friend requests',
        };
      }
      
      const user = currentUser.user;
      
      // Get the friendship details first to verify it's legitimate
      const { data: friendship, error: getError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .eq('status', 'pending')
        .maybeSingle();

      if (getError) throw getError;
      
      if (!friendship) {
        return {
          success: false,
          message: 'Friend request not found or already processed'
        };
      }

      // Make sure the current user is the recipient of the request
      if (friendship.friend_id !== user.id) {
        return {
          success: false,
          message: 'You can only accept friend requests sent to you'
        };
      }

      // Update the friendship status to accepted
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
        .select()
        .single();

      if (error) throw error;

      // Get user details for notification
      const { data: userData } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', user.id)
        .single();
        
      const accepterName = userData?.full_name || userData?.username || user.email;

      // Create notification for the sender that their request was accepted
      await notificationService.createNotification({
        user_id: friendship.user_id,
        title: 'Friend Request Accepted',
        type: 'friend_request_accepted',
        content: JSON.stringify({
          message: `${accepterName} has accepted your friend request.`,
          accepter_id: user.id,
          accepter_name: accepterName
        })
      });

      return {
        success: true,
        message: 'Friend request accepted',
        data
      };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return {
        success: false,
        message: 'Failed to accept friend request',
        error
      };
    }
  },

  // Decline a friend request
  declineFriendRequest: async (friendshipId) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to decline friend requests',
        };
      }
      
      const user = currentUser.user;
      
      // Get the friendship details first to verify it's legitimate
      const { data: friendship, error: getError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .eq('status', 'pending')
        .maybeSingle();

      if (getError) throw getError;
      
      if (!friendship) {
        return {
          success: false,
          message: 'Friend request not found or already processed'
        };
      }

      // Make sure the current user is the recipient of the request
      if (friendship.friend_id !== user.id) {
        return {
          success: false,
          message: 'You can only decline friend requests sent to you'
        };
      }

      // Update the friendship status to declined
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'declined' })
        .eq('id', friendshipId)
        .select()
        .single();

      if (error) throw error;

      // Get user details for notification
      const { data: userData } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', user.id)
        .single();
        
      const declinerName = userData?.full_name || userData?.username || user.email;

      // Create notification for the sender that their request was declined
      await notificationService.createNotification({
        user_id: friendship.user_id,
        title: 'Friend Request Declined',
        type: 'friend_request_declined',
        content: JSON.stringify({
          message: `${declinerName} has declined your friend request.`,
          decliner_id: user.id,
          decliner_name: declinerName
        })
      });

      return {
        success: true,
        message: 'Friend request declined',
        data
      };
    } catch (error) {
      console.error('Error declining friend request:', error);
      return {
        success: false,
        message: 'Failed to decline friend request',
        error
      };
    }
  },

  // Remove a friend
  removeFriend: async (friendshipId) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to remove a friend',
        };
      }
      
      const user = currentUser.user;
      
      // Get the friendship details first to identify the other user
      const { data: friendship, error: getError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .maybeSingle();

      if (getError) throw getError;
      
      if (!friendship) {
        return {
          success: false,
          message: 'Friendship not found'
        };
      }

      // Make sure the current user is part of this friendship
      if (friendship.user_id !== user.id && friendship.friend_id !== user.id) {
        return {
          success: false,
          message: 'You can only remove your own friendships'
        };
      }

      // Determine who the other user is in this friendship
      const otherUserId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id;

      // Handle notifications based on friendship status
      if (friendship.status === 'accepted') {
        // For accepted friendships, notify the other user about removal
        // Get user details for notification
        const { data: userData } = await supabase
          .from('users')
          .select('username, full_name')
          .eq('id', user.id)
          .single();

        const removerName = userData?.full_name || userData?.username || user.email;

        // Create notification for the other user
        await notificationService.createNotification({
          user_id: otherUserId,
          title: 'Friend Removed',
          type: 'friend_removed',
          content: JSON.stringify({
            message: `${removerName} has removed you from their friends.`,
            remover_id: user.id,
            remover_name: removerName
          })
        });
      } else if (friendship.status === 'pending') {
        // For pending requests being cancelled, clean up the friend request notification
        // Find and delete the friend request notification for the recipient
        // We need to find notifications where the content contains the sender_id
        const { error: notificationError } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', otherUserId)
          .eq('type', 'friend_request')
          .like('content', `%"sender_id":"${user.id}"%`);

        if (notificationError) {
          console.error('Error cleaning up friend request notification:', notificationError);
          // Don't throw here - we still want to delete the friendship record
        }
      }

      // Delete the friendship record
      const { data, error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'Friend removed successfully',
        data
      };
    } catch (error) {
      console.error('Error removing friend:', error);
      return {
        success: false,
        message: 'Failed to remove friend',
        error
      };
    }
  },

  // Get all friends for a user
  getFriends: async (userId = null) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to view friends',
          data: []
        };
      }
      
      const targetUserId = userId || currentUser.user.id;
      
      // Get all accepted friendships where the user is either sender or receiver
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          user_id,
          friend_id
        `)
        .eq('status', 'accepted')
        .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`);

      if (error) throw error;

      // Get user details for all friends
      const friendIds = friendships.map(friendship =>
        friendship.user_id === targetUserId ? friendship.friend_id : friendship.user_id
      );

      if (friendIds.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      const { data: friendUsers, error: userError } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url')
        .in('id', friendIds);

      if (userError) throw userError;

      // Process the results to always return the friend details (not the user)
      const processedFriends = friendships.map(friendship => {
        const friendId = friendship.user_id === targetUserId ? friendship.friend_id : friendship.user_id;
        const friendUser = friendUsers.find(user => user.id === friendId);

        return {
          id: friendship.id,
          friendId: friendId,
          username: friendUser?.username,
          fullName: friendUser?.full_name,
          avatarUrl: friendUser?.avatar_url,
          createdAt: friendship.created_at
        };
      });

      return {
        success: true,
        data: processedFriends
      };
    } catch (error) {
      console.error('Error getting friends:', error);
      return {
        success: false,
        message: 'Failed to get friends',
        data: [],
        error
      };
    }
  },

  // Get pending friend requests received by the user
  getPendingRequests: async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to view friend requests',
          data: []
        };
      }
      
      const user = currentUser.user;
      
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          user_id,
          friend_id
        `)
        .eq('status', 'pending')
        .eq('friend_id', user.id);

      if (error) throw error;

      if (friendships.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Get user details for all requesters
      const requesterIds = friendships.map(friendship => friendship.user_id);

      const { data: requesterUsers, error: userError } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url')
        .in('id', requesterIds);

      if (userError) throw userError;

      // Combine friendship data with user details
      const processedRequests = friendships.map(friendship => {
        const requesterUser = requesterUsers.find(user => user.id === friendship.user_id);

        return {
          id: friendship.id,
          status: friendship.status,
          created_at: friendship.created_at,
          user_id: friendship.user_id,
          friend_id: friendship.friend_id,
          username: requesterUser?.username,
          full_name: requesterUser?.full_name,
          avatar_url: requesterUser?.avatar_url
        };
      });

      return {
        success: true,
        data: processedRequests
      };
    } catch (error) {
      console.error('Error getting pending friend requests:', error);
      return {
        success: false,
        message: 'Failed to get friend requests',
        data: [],
        error
      };
    }
  },

  // Get friend requests sent by the user
  getSentRequests: async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to view sent friend requests',
          data: []
        };
      }
      
      const user = currentUser.user;
      
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          user_id,
          friend_id
        `)
        .eq('status', 'pending')
        .eq('user_id', user.id);

      if (error) throw error;

      if (friendships.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Get user details for all recipients
      const recipientIds = friendships.map(friendship => friendship.friend_id);

      const { data: recipientUsers, error: userError } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url')
        .in('id', recipientIds);

      if (userError) throw userError;

      // Combine friendship data with user details
      const processedRequests = friendships.map(friendship => {
        const recipientUser = recipientUsers.find(user => user.id === friendship.friend_id);

        return {
          id: friendship.id,
          status: friendship.status,
          created_at: friendship.created_at,
          user_id: friendship.user_id,
          friend_id: friendship.friend_id,
          username: recipientUser?.username,
          full_name: recipientUser?.full_name,
          avatar_url: recipientUser?.avatar_url
        };
      });

      return {
        success: true,
        data: processedRequests
      };
    } catch (error) {
      console.error('Error getting sent friend requests:', error);
      return {
        success: false,
        message: 'Failed to get sent friend requests',
        data: [],
        error
      };
    }
  },

  // Check friendship status between current user and another user
  getFriendshipStatus: async (userId) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to check friendship status',
          status: 'not-friends'
        };
      }
      
      const user = currentUser.user;
      
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          success: true,
          status: 'not-friends',
          data: null
        };
      }

      let status;
      if (data.status === 'accepted') {
        status = 'friends';
      } else if (data.status === 'pending') {
        // Check if current user is the sender or receiver
        status = data.user_id === user.id ? 'request-sent' : 'request-received';
      } else {
        status = 'not-friends';
      }

      return {
        success: true,
        status,
        data
      };
    } catch (error) {
      console.error('Error checking friendship status:', error);
      return {
        success: false,
        message: 'Failed to check friendship status',
        status: 'not-friends',
        error
      };
    }
  },

  // Get friendship by ID
  getFriendshipById: async (friendshipId) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to view friendship details',
          data: null
        };
      }
      
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          user_id,
          friend_id,
          users:user_id(id, username, full_name, avatar_url),
          friends:friend_id(id, username, full_name, avatar_url)
        `)
        .eq('id', friendshipId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          success: false,
          message: 'Friendship not found',
          data: null
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error getting friendship details:', error);
      return {
        success: false,
        message: 'Failed to get friendship details',
        data: null,
        error
      };
    }
  },

  // Get all friendships (both accepted and pending) for a user
  getAllFriendships: async (userId = null) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to view friendships',
          data: []
        };
      }
      
      const targetUserId = userId || currentUser.user.id;
      
      // Get all friendships where the user is either sender or receiver
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          user_id,
          friend_id,
          users:user_id(id, username, full_name, avatar_url),
          friends:friend_id(id, username, full_name, avatar_url)
        `)
        .or(`user_id.eq.${targetUserId},friend_id.eq.${targetUserId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the results to include relevant info based on who is viewing
      const processedFriendships = data.map(friendship => {
        const isSender = friendship.user_id === targetUserId;
        const otherUser = isSender ? friendship.friends : friendship.users;
        
        return {
          id: friendship.id,
          status: friendship.status,
          isSender,
          otherUserId: isSender ? friendship.friend_id : friendship.user_id,
          username: otherUser.username,
          fullName: otherUser.full_name,
          avatarUrl: otherUser.avatar_url,
          createdAt: friendship.created_at,
          updatedAt: friendship.updated_at
        };
      });

      return {
        success: true,
        data: processedFriendships
      };
    } catch (error) {
      console.error('Error getting all friendships:', error);
      return {
        success: false,
        message: 'Failed to get friendships',
        data: [],
        error
      };
    }
  },

  // Block a user (convert existing friendship to blocked or create new blocked status)
  blockUser: async (userId) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to block a user',
        };
      }
      
      const user = currentUser.user;
      
      // Prevent blocking yourself
      if (user.id === userId) {
        return {
          success: false,
          message: 'You cannot block yourself',
        };
      }

      // Check if a friendship already exists
      const { data: existingFriendship, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingFriendship) {
        // Update existing friendship to blocked
        const { data, error } = await supabase
          .from('friendships')
          .update({ 
            status: 'blocked',
            // Always set the blocker as the user_id 
            user_id: user.id,
            friend_id: userId
          })
          .eq('id', existingFriendship.id)
          .select()
          .single();

        if (error) throw error;

        return {
          success: true,
          message: 'User blocked successfully',
          data
        };
      } else {
        // Create new blocked relationship
        const { data, error } = await supabase
          .from('friendships')
          .insert({
            user_id: user.id,
            friend_id: userId,
            status: 'blocked'
          })
          .select()
          .single();

        if (error) throw error;

        return {
          success: true,
          message: 'User blocked successfully',
          data
        };
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      return {
        success: false,
        message: 'Failed to block user',
        error
      };
    }
  },

  // Unblock a user
  unblockUser: async (friendshipId) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to unblock a user',
        };
      }
      
      const user = currentUser.user;
      
      // Get the friendship details
      const { data: friendship, error: getError } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', friendshipId)
        .eq('status', 'blocked')
        .maybeSingle();

      if (getError) throw getError;
      
      if (!friendship) {
        return {
          success: false,
          message: 'Blocked relationship not found'
        };
      }

      // Make sure the current user is the blocker
      if (friendship.user_id !== user.id) {
        return {
          success: false,
          message: 'You can only unblock users you have blocked'
        };
      }

      // Delete the blocked relationship
      const { data, error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'User unblocked successfully',
        data
      };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return {
        success: false,
        message: 'Failed to unblock user',
        error
      };
    }
  },
  
  // Get blocked users
  getBlockedUsers: async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.user) {
        return {
          success: false,
          message: 'You must be logged in to view blocked users',
          data: []
        };
      }
      
      const user = currentUser.user;
      
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          user_id,
          friend_id
        `)
        .eq('status', 'blocked')
        .eq('user_id', user.id);

      if (error) throw error;

      if (friendships.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Get user details for all blocked users
      const blockedUserIds = friendships.map(friendship => friendship.friend_id);

      const { data: blockedUsers, error: userError } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url')
        .in('id', blockedUserIds);

      if (userError) throw userError;

      // Combine friendship data with user details
      const processedBlockedUsers = friendships.map(friendship => {
        const blockedUser = blockedUsers.find(user => user.id === friendship.friend_id);

        return {
          id: friendship.id,
          status: friendship.status,
          created_at: friendship.created_at,
          user_id: friendship.user_id,
          friend_id: friendship.friend_id,
          username: blockedUser?.username,
          full_name: blockedUser?.full_name,
          avatar_url: blockedUser?.avatar_url
        };
      });

      return {
        success: true,
        data: processedBlockedUsers
      };
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return {
        success: false,
        message: 'Failed to get blocked users',
        data: [],
        error
      };
    }
  }
}; 