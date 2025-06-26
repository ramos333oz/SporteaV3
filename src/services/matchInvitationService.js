import { supabase } from './supabase';
import { notificationService } from './notifications';

export const matchInvitationService = {
  // Send invitations to multiple friends
  sendInvitations: async (matchId, friendIds, message = '', invitationType = 'direct') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify user owns the match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('id, title, host_id, start_time')
        .eq('id', matchId)
        .eq('host_id', user.id)
        .single();

      if (matchError || !match) {
        throw new Error('Match not found or unauthorized');
      }

      // Check if match is in the future
      if (new Date(match.start_time) <= new Date()) {
        throw new Error('Cannot invite to past matches');
      }

      // Prepare invitations
      const invitations = friendIds.map(friendId => ({
        match_id: matchId,
        inviter_id: user.id,
        invitee_id: friendId,
        invitation_type: invitationType,
        message: message,
        expires_at: new Date(match.start_time).toISOString()
      }));

      // Insert invitations
      const { data, error } = await supabase
        .from('match_invitations')
        .insert(invitations)
        .select();

      if (error) throw error;

      // Get user details for notifications
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('id', user.id)
        .single();

      const inviterName = userData?.full_name || userData?.username || user.email;

      // Send notifications
      await Promise.all(friendIds.map(friendId => 
        notificationService.createNotification({
          user_id: friendId,
          type: 'match_invitation',
          title: 'Match Invitation',
          content: JSON.stringify({
            match_id: matchId,
            match_title: match.title,
            inviter_name: inviterName,
            message: message
          })
        })
      ));

      return { success: true, data };
    } catch (error) {
      console.error('Error sending invitations:', error);
      return { success: false, error: error.message };
    }
  },

  // Respond to invitation
  respondToInvitation: async (invitationId, response) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update invitation status
      const { data: invitation, error } = await supabase
        .from('match_invitations')
        .update({ 
          status: response, 
          responded_at: new Date().toISOString() 
        })
        .eq('id', invitationId)
        .eq('invitee_id', user.id)
        .select(`
          *,
          match:matches(id, title, host_id),
          inviter:users!inviter_id(id, full_name, email)
        `)
        .single();

      if (error) throw error;

      // If accepted, handle joining the match
      if (response === 'accepted') {
        const joinResult = await this.handleAcceptedInvitation(invitation);
        if (!joinResult.success) {
          throw new Error(joinResult.error);
        }
      }

      // Get user details for notification
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('id', user.id)
        .single();

      const responderName = userData?.full_name || userData?.username || user.email;

      // Notify inviter of response
      await notificationService.createNotification({
        user_id: invitation.inviter_id,
        type: `invitation_${response}`,
        title: `Invitation ${response}`,
        content: JSON.stringify({
          match_id: invitation.match_id,
          match_title: invitation.match.title,
          responder_name: responderName
        })
      });

      return { success: true, data: invitation };
    } catch (error) {
      console.error('Error responding to invitation:', error);
      return { success: false, error: error.message };
    }
  },

  // Handle accepted invitation
  handleAcceptedInvitation: async (invitation) => {
    try {
      if (invitation.invitation_type === 'direct') {
        // Direct join - add to participants immediately
        const { error } = await supabase
          .from('participants')
          .insert({
            match_id: invitation.match_id,
            user_id: invitation.invitee_id,
            status: 'confirmed'
          });

        if (error && error.code !== '23505') { // Ignore duplicate key error
          throw error;
        }
      } else {
        // Request type - create join request
        const { error } = await supabase
          .from('match_join_requests')
          .insert({
            match_id: invitation.match_id,
            user_id: invitation.invitee_id,
            message: 'Accepted invitation'
          });

        if (error && error.code !== '23505') {
          throw error;
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get invitations for a user
  getUserInvitations: async (status = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('match_invitations')
        .select(`
          *,
          match:matches(
            id, title, sport_id, start_time, end_time, location_id,
            sport:sports(name, icon_url),
            location:locations(name, address)
          ),
          inviter:users!inviter_id(id, full_name, username, avatar_url)
        `)
        .eq('invitee_id', user.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error getting user invitations:', error);
      return { success: false, error: error.message };
    }
  },

  // Get invitations sent by user
  getSentInvitations: async (matchId = null) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('match_invitations')
        .select(`
          *,
          invitee:users!invitee_id(id, full_name, username, avatar_url),
          match:matches(id, title)
        `)
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false });

      if (matchId) {
        query = query.eq('match_id', matchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error getting sent invitations:', error);
      return { success: false, error: error.message };
    }
  },

  // Get friends available for invitation (not already invited or joined)
  getAvailableFriends: async (matchId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all friends
      const { data: friendships, error: friendError } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:users!friend_id(id, full_name, username, avatar_url)
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (friendError) throw friendError;

      // Get already invited friends
      const { data: invitations } = await supabase
        .from('match_invitations')
        .select('invitee_id')
        .eq('match_id', matchId)
        .eq('inviter_id', user.id);

      // Get already joined participants
      const { data: participants } = await supabase
        .from('participants')
        .select('user_id')
        .eq('match_id', matchId);

      const invitedIds = new Set(invitations?.map(inv => inv.invitee_id) || []);
      const participantIds = new Set(participants?.map(p => p.user_id) || []);

      // Filter out already invited or joined friends
      const availableFriends = friendships?.filter(friendship => 
        !invitedIds.has(friendship.friend_id) && 
        !participantIds.has(friendship.friend_id)
      ) || [];

      return { success: true, data: availableFriends };
    } catch (error) {
      console.error('Error getting available friends:', error);
      return { success: false, error: error.message };
    }
  }
};
