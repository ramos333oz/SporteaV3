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
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { 
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Send as SendIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { matchInvitationService } from '../services/matchInvitationService';

const FriendInvitationModal = ({ open, onClose, match, onInvitationsSent }) => {
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && match) {
      loadAvailableFriends();
      setSelectedFriends([]);
      setMessage('');
      setError(null);
    }
  }, [open, match]);

  const loadAvailableFriends = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await matchInvitationService.getAvailableFriends(match.id);
      if (result.success) {
        setFriends(result.data);
      } else {
        if (result.error && result.error.includes('relationship between')) {
          setError('Database schema issue. Please contact support with error code: FRIEND-REL-001');
        } else {
          setError(result.error || 'Failed to load friends');
        }
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      setError(error.message || 'Failed to load friends');
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

  const handleSelectAll = () => {
    if (selectedFriends.length === friends.length) {
      setSelectedFriends([]);
    } else {
      setSelectedFriends(friends.map(f => f.friend_id));
    }
  };

  const handleSendInvitations = async () => {
    if (selectedFriends.length === 0) return;

    setSending(true);
    setError(null);
    try {
      const result = await matchInvitationService.sendInvitations(
        match.id,
        selectedFriends,
        message
      );

      if (result.success) {
        onInvitationsSent?.(selectedFriends.length);
        onClose();
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      setError('Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon color="primary" />
          <Typography variant="h6" component="span">
            Invite Friends to {match?.title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={loadAvailableFriends}
                disabled={loading}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Direct Join Information */}
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
            <Typography variant="body2" fontWeight="medium">Direct Join Invitations</Typography>
            <Typography variant="caption" color="text.secondary">
              Friends will join the match immediately when they accept your invitation.
            </Typography>
          </Alert>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Personal Message */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Add a personal message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            variant="outlined"
            size="small"
          />
        </Box>

        {/* Friends Selection */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon fontSize="small" />
              Select Friends ({selectedFriends.length} selected)
            </Typography>
            {friends.length > 0 && (
              <Button
                size="small"
                onClick={handleSelectAll}
                disabled={loading}
              >
                {selectedFriends.length === friends.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={40} />
            </Box>
          ) : friends.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                No friends available to invite. They may have already been invited or joined this match.
              </Typography>
            </Alert>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {friends.map((friendship) => {
                const friend = friendship.friend;
                const isSelected = selectedFriends.includes(friendship.friend_id);
                
                return (
                  <ListItem
                    key={friendship.friend_id}
                    button
                    onClick={() => handleFriendToggle(friendship.friend_id)}
                    sx={{ 
                      '&:hover': { bgcolor: 'action.hover' },
                      bgcolor: isSelected ? 'action.selected' : 'transparent'
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      tabIndex={-1}
                      disableRipple
                      size="small"
                    />
                    <ListItemAvatar>
                      <Avatar 
                        src={friend.avatar_url}
                        sx={{ width: 40, height: 40 }}
                      >
                        {friend.full_name?.[0]?.toUpperCase() || friend.username?.[0]?.toUpperCase() || 'F'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight="medium">
                          {friend.full_name || friend.username}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          @{friend.username}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>

        {/* Selected Friends Summary */}
        {selectedFriends.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Selected friends:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {selectedFriends.map(friendId => {
                const friendship = friends.find(f => f.friend_id === friendId);
                const friend = friendship?.friend;
                return (
                  <Chip
                    key={friendId}
                    label={friend?.full_name || friend?.username || 'Unknown'}
                    size="small"
                    onDelete={() => handleFriendToggle(friendId)}
                    avatar={<Avatar src={friend?.avatar_url} sx={{ width: 20, height: 20 }} />}
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={sending}
          startIcon={<CloseIcon />}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSendInvitations}
          disabled={selectedFriends.length === 0 || sending}
          variant="contained"
          startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
        >
          {sending ? 'Sending...' : `Invite ${selectedFriends.length} Friend${selectedFriends.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FriendInvitationModal;
