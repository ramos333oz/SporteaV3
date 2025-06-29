import { supabase } from './supabase';
import { notificationService } from './notifications';

export const matchInvitationService = {
  // Send invitations to multiple friends (always direct join)
  sendInvitations: async (matchId, friendIds, message = '') => {
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

      // Handle invitations (upsert for existing ones)
      const invitationResults = [];

      for (const friendId of friendIds) {
        // Check if invitation already exists
        const { data: existingInvitation, error: checkError } = await supabase
          .from('match_invitations')
          .select('id, status')
          .eq('match_id', matchId)
          .eq('invitee_id', friendId)
          .maybeSingle();

        if (checkError) throw checkError;

        let invitationData;

        if (existingInvitation) {
          // Update existing invitation
          const { data: updatedInvitation, error: updateError } = await supabase
            .from('match_invitations')
            .update({
              status: 'pending',
              invitation_type: 'direct',
              message: message,
              expires_at: new Date(match.start_time).toISOString(),
              responded_at: null
            })
            .eq('id', existingInvitation.id)
            .select();

          if (updateError) throw updateError;
          invitationData = updatedInvitation[0]; // Take the first (and should be only) result
        } else {
          // Create new invitation
          const { data: newInvitation, error: insertError } = await supabase
            .from('match_invitations')
            .insert({
              match_id: matchId,
              inviter_id: user.id,
              invitee_id: friendId,
              invitation_type: 'direct',
              message: message,
              expires_at: new Date(match.start_time).toISOString()
            })
            .select();

          if (insertError) throw insertError;
          invitationData = newInvitation[0]; // Take the first (and should be only) result
        }

        invitationResults.push(invitationData);
      }

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

      return { success: true, data: invitationResults };
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
        const joinResult = await matchInvitationService.handleAcceptedInvitation(invitation);
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
          responder_name: responderName,
          responder: responderName  // Added for backward compatibility
        })
      });

      return { success: true, data: invitation };
    } catch (error) {
      console.error('Error responding to invitation:', error);
      return { success: false, error: error.message };
    }
  },

  // Handle accepted invitation (direct join only)
  handleAcceptedInvitation: async (invitation) => {
    try {
      console.log('Processing accepted invitation:', invitation);

      // Ensure we have the required fields
      const matchId = invitation.match_id;
      const userId = invitation.invitee_id;

      if (!matchId || !userId) {
        console.error('Missing required fields in invitation:', { invitation });
        return { success: false, error: 'Invalid invitation data' };
      }

      // Check if participant record already exists
      const { data: existingParticipant, error: selectError } = await supabase
        .from('participants')
        .select('id, status')
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
        console.error('Error checking for existing participant:', selectError);
        throw selectError;
      }

      if (existingParticipant) {
        console.log('Existing participant found, updating status:', existingParticipant);
        // Update existing participant record
        const { error } = await supabase
          .from('participants')
          .update({
            status: 'confirmed',
            joined_at: new Date().toISOString()
          })
          .eq('id', existingParticipant.id);

        if (error) {
          console.error('Error updating participant:', error);
          throw error;
        }
      } else {
        console.log('No existing participant, creating new record');
        // Create new participant record
        const { error } = await supabase
          .from('participants')
          .insert({
            match_id: matchId,
            user_id: userId,
            status: 'confirmed',
            joined_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error creating participant:', error);
          throw error;
        }
      }

      // Always update the invitation to 'accepted' status
      if (invitation.id) {
        const { error: updateInvitationError } = await supabase
          .from('match_invitations')
          .update({ 
            status: 'accepted',
            responded_at: new Date().toISOString()
          })
          .eq('id', invitation.id);

        if (updateInvitationError) {
          console.warn('Error updating invitation status:', updateInvitationError);
          // Continue anyway - the participant record is more important
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error in handleAcceptedInvitation:', error);
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

  // Get all friends who can be invited to a match (not already invited or participants)
  getAvailableFriends: async (matchId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current active participants to exclude them (exclude those who left)
      const { data: participants, error: partError } = await supabase
        .from('participants')
        .select('user_id')
        .eq('match_id', matchId)
        .neq('status', 'left');

      if (partError) throw partError;

      // Get friends with pending invitations to exclude them (don't exclude those who accepted but left)
      const { data: invitations, error: invError } = await supabase
        .from('match_invitations')
        .select('invitee_id')
        .eq('match_id', matchId)
        .eq('status', 'pending');

      if (invError) throw invError;

      // Create sets for quick lookups
      const participantIds = new Set(participants.map(p => p.user_id));
      const invitedIds = new Set(invitations.map(i => i.invitee_id));

      // Get user's friends - using a two-step query approach to avoid foreign key issues
      const { data: friendships, error: friendError } = await supabase
        .from('friendships')
        .select('id, status, user_id, friend_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (friendError) throw friendError;

      if (!friendships || friendships.length === 0) {
        return { success: true, data: [] };
      }

      // Get friend details in a separate query
      const friendIds = friendships.map(f => f.friend_id);
      const { data: friendDetails, error: detailsError } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url')
        .in('id', friendIds);

      if (detailsError) throw detailsError;

      // Create a map of friend details for easy lookup
      const friendDetailsMap = {};
      friendDetails?.forEach(friend => {
        friendDetailsMap[friend.id] = friend;
      });

      // Filter out friends who are already participants or have been invited
      const availableFriends = friendships
        .filter(friendship => 
          !invitedIds.has(friendship.friend_id) &&
          !participantIds.has(friendship.friend_id)
        )
        .map(friendship => ({
          ...friendship,
          friend: friendDetailsMap[friendship.friend_id] || { id: friendship.friend_id }
        }));

      return { success: true, data: availableFriends || [] };
    } catch (error) {
      console.error('Error getting available friends:', error);
      return { success: false, error: error.message };
    }
  }
};
