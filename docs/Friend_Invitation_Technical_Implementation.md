# Friend Invitation to Matches - Technical Implementation Guide

## Overview

This document provides detailed technical specifications for implementing the friend invitation feature in Sportea, allowing match hosts to directly invite friends to their matches.

## Database Schema Changes

### 1. New Table: match_invitations

```sql
-- Create match_invitations table
CREATE TABLE IF NOT EXISTS match_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invitation_type TEXT NOT NULL DEFAULT 'direct' CHECK (invitation_type IN ('direct', 'request')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(match_id, invitee_id),
  
  -- Indexes
  INDEX idx_match_invitations_match_id ON match_invitations(match_id),
  INDEX idx_match_invitations_invitee_id ON match_invitations(invitee_id),
  INDEX idx_match_invitations_status ON match_invitations(status)
);

-- Enable RLS
ALTER TABLE match_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own invitations" ON match_invitations
  FOR SELECT USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

CREATE POLICY "Users can create invitations for their matches" ON match_invitations
  FOR INSERT WITH CHECK (
    inviter_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM matches WHERE id = match_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can update their received invitations" ON match_invitations
  FOR UPDATE USING (invitee_id = auth.uid());
```

### 2. Notification Types Extension

```sql
-- Add new notification types for invitations
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'match_invitation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invitation_accepted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invitation_declined';
```

## Backend Services

### 1. Match Invitation Service

```javascript
// src/services/matchInvitationService.js
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

      // Send notifications
      await Promise.all(friendIds.map(friendId => 
        notificationService.createNotification({
          user_id: friendId,
          type: 'match_invitation',
          title: 'Match Invitation',
          content: JSON.stringify({
            match_id: matchId,
            match_title: match.title,
            inviter_name: user.user_metadata?.full_name || user.email,
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

      // Notify inviter of response
      await notificationService.createNotification({
        user_id: invitation.inviter_id,
        type: `invitation_${response}`,
        title: `Invitation ${response}`,
        content: JSON.stringify({
          match_id: invitation.match_id,
          match_title: invitation.match.title,
          responder_name: user.user_metadata?.full_name || user.email
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
            status: 'confirmed',
            joined_via: 'invitation'
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
            status: 'pending',
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
  }
};
```

## Frontend Components

### 1. Friend Invitation Modal

```jsx
// src/components/FriendInvitationModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
  TextField,
  Avatar,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { friendshipService } from '../services/friendship';
import { matchInvitationService } from '../services/matchInvitationService';

const FriendInvitationModal = ({ open, onClose, match }) => {
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const result = await friendshipService.getFriends();
      if (result.success) {
        setFriends(result.data);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendToggle = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSendInvitations = async () => {
    if (selectedFriends.length === 0) return;

    setSending(true);
    try {
      const result = await matchInvitationService.sendInvitations(
        match.id,
        selectedFriends,
        message,
        'direct' // or 'request' based on match settings
      );

      if (result.success) {
        onClose();
        // Show success notification
      } else {
        // Show error notification
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Invite Friends to {match?.title}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Add a personal message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Box>
        
        <Typography variant="subtitle2" gutterBottom>
          Select Friends ({selectedFriends.length} selected)
        </Typography>
        
        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
          {friends.map((friend) => (
            <ListItem
              key={friend.friendId}
              button
              onClick={() => handleFriendToggle(friend.friendId)}
            >
              <Checkbox
                checked={selectedFriends.includes(friend.friendId)}
                tabIndex={-1}
                disableRipple
              />
              <ListItemAvatar>
                <Avatar src={friend.avatar_url}>
                  {friend.friendName?.[0]?.toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={friend.friendName}
                secondary={friend.username}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSendInvitations}
          disabled={selectedFriends.length === 0 || sending}
          variant="contained"
        >
          {sending ? 'Sending...' : `Invite ${selectedFriends.length} Friends`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FriendInvitationModal;
```

## Integration Points

### 1. Match Creation/Editing Pages
- Add "Invite Friends" button
- Show invitation status for existing matches

### 2. Notifications System
- Handle invitation notifications
- Show invitation responses

### 3. Match Details Page
- Show invited friends status
- Allow re-inviting or canceling invitations

## Testing Strategy

### 1. Unit Tests
- Service functions
- Component rendering
- State management

### 2. Integration Tests
- Database operations
- Notification delivery
- Real-time updates

### 3. User Acceptance Tests
- Complete invitation flow
- Edge cases (expired invitations, full matches)
- Performance with large friend lists

## Performance Considerations

### 1. Database Optimization
- Proper indexing on match_invitations
- Efficient queries with joins
- Pagination for large friend lists

### 2. Real-time Updates
- Use Supabase Realtime for invitation status
- Optimize subscription management

### 3. Notification Batching
- Group multiple invitations
- Rate limiting for spam prevention

## Security Considerations

### 1. Authorization
- Verify match ownership for invitations
- Validate friend relationships
- Prevent invitation spam

### 2. Data Validation
- Sanitize invitation messages
- Validate invitation expiry
- Check match capacity

This implementation provides a robust foundation for friend invitations while maintaining security, performance, and user experience standards.
