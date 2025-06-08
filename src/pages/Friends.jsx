import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Divider,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Badge
} from '@mui/material';
import { 
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Block as BlockIcon,
  PersonRemove as PersonRemoveIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { friendshipService } from '../services/supabase';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const FriendsList = ({ friends, onRemoveFriend, onBlockUser }) => {
  if (friends.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          You don't have any friends yet. Send some friend requests!
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {friends.map((friend) => (
        <Paper key={friend.id} elevation={1} sx={{ mb: 2, borderRadius: 2 }}>
          <ListItem
            secondaryAction={
              <Box>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<PersonRemoveIcon />}
                  onClick={() => onRemoveFriend(friend)}
                  sx={{ mr: 1 }}
                >
                  Remove
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<BlockIcon />}
                  onClick={() => onBlockUser(friend)}
                >
                  Block
                </Button>
              </Box>
            }
          >
            <ListItemAvatar>
              <Avatar src={friend.avatar_url} alt={friend.full_name || friend.username}>
                {(friend.full_name || friend.username || 'U').charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={friend.full_name || friend.username || friend.email}
              secondary={`Friends since ${format(new Date(friend.created_at), 'MMM d, yyyy')}`}
            />
          </ListItem>
        </Paper>
      ))}
    </List>
  );
};

const FriendRequests = ({ requests, onAccept, onDecline }) => {
  if (requests.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          You don't have any pending friend requests
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {requests.map((request) => (
        <Paper key={request.id} elevation={1} sx={{ mb: 2, borderRadius: 2 }}>
          <ListItem
            secondaryAction={
              <Box>
                <IconButton
                  color="success"
                  onClick={() => onAccept(request)}
                  aria-label="accept"
                >
                  <CheckIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => onDecline(request)}
                  aria-label="decline"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            }
          >
            <ListItemAvatar>
              <Avatar src={request.avatar_url} alt={request.full_name || request.username}>
                {(request.full_name || request.username || 'U').charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={request.full_name || request.username || request.email}
              secondary={`Requested ${format(new Date(request.created_at), 'MMM d, yyyy')}`}
            />
          </ListItem>
        </Paper>
      ))}
    </List>
  );
};

const SentRequests = ({ requests }) => {
  if (requests.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          You haven't sent any friend requests
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {requests.map((request) => (
        <Paper key={request.id} elevation={1} sx={{ mb: 2, borderRadius: 2 }}>
          <ListItem>
            <ListItemAvatar>
              <Avatar src={request.avatar_url} alt={request.full_name || request.username}>
                {(request.full_name || request.username || 'U').charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={request.full_name || request.username || request.email}
              secondary={`Sent ${format(new Date(request.created_at), 'MMM d, yyyy')} - Waiting for response`}
            />
          </ListItem>
        </Paper>
      ))}
    </List>
  );
};

const BlockedUsers = ({ blockedUsers, onUnblock }) => {
  if (blockedUsers.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          You haven't blocked any users
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {blockedUsers.map((blocked) => (
        <Paper key={blocked.id} elevation={1} sx={{ mb: 2, borderRadius: 2 }}>
          <ListItem
            secondaryAction={
              <Button
                variant="outlined"
                size="small"
                onClick={() => onUnblock(blocked)}
              >
                Unblock
              </Button>
            }
          >
            <ListItemAvatar>
              <Avatar src={blocked.avatar_url} alt={blocked.full_name || blocked.username}>
                {(blocked.full_name || blocked.username || 'U').charAt(0)}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={blocked.full_name || blocked.username || blocked.email}
              secondary={`Blocked on ${format(new Date(blocked.created_at), 'MMM d, yyyy')}`}
            />
          </ListItem>
        </Paper>
      ))}
    </List>
  );
};

const Friends = () => {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [actionLoading, setActionLoading] = useState(null); // Track which friendship is being processed
  const navigate = useNavigate();

  // Add friend dialog
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      // Use friendshipService to get all relevant friendship data
      const { success, data, error } = await friendshipService.getAllFriendships();
      
      if (!success) {
        throw new Error(error || 'Failed to fetch friendship data');
      }
      
      // Process friendship data
      setFriends(data.friends || []);
      setPendingRequests(data.pendingRequests || []);
      setSentRequests(data.sentRequests || []);
      
      // Get blocked users
      const blockedData = await friendshipService.getBlockedUsers();
      if (blockedData.success) {
        setBlockedUsers(blockedData.data || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      showErrorToast('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAcceptFriendRequest = async (friendshipId) => {
    setActionLoading(friendshipId);
    try {
      const { success } = await friendshipService.acceptFriendRequest(friendshipId);
      
      if (success) {
        showSuccessToast('Friend request accepted');
        fetchFriends(); // Refresh the lists
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showErrorToast('Failed to accept friend request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineFriendRequest = async (friendshipId) => {
    setActionLoading(friendshipId);
    try {
      const { success } = await friendshipService.declineFriendRequest(friendshipId);
      
      if (success) {
        showSuccessToast('Friend request declined');
        fetchFriends(); // Refresh the lists
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      showErrorToast('Failed to decline friend request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelFriendRequest = async (friendshipId) => {
    setActionLoading(friendshipId);
    try {
      const { success } = await friendshipService.removeFriend(friendshipId);
      
      if (success) {
        showSuccessToast('Friend request canceled');
        fetchFriends(); // Refresh the lists
      }
    } catch (error) {
      console.error('Error canceling friend request:', error);
      showErrorToast('Failed to cancel friend request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendshipId) => {
    setActionLoading(friendshipId);
    try {
      const { success } = await friendshipService.removeFriend(friendshipId);
      
      if (success) {
        showSuccessToast('Friend removed');
        fetchFriends(); // Refresh the lists
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      showErrorToast('Failed to remove friend');
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleBlockUser = async (friend) => {
    setActionLoading(friend.id);
    try {
      const { success } = await friendshipService.blockUser(friend.friendId);
      
      if (success) {
        showSuccessToast('User blocked');
        fetchFriends(); // Refresh the lists
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      showErrorToast('Failed to block user');
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleUnblockUser = async (friendshipId) => {
    setActionLoading(friendshipId);
    try {
      const { success } = await friendshipService.unblockUser(friendshipId);
      
      if (success) {
        showSuccessToast('User unblocked');
        fetchFriends(); // Refresh the lists
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      showErrorToast('Failed to unblock user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const renderFriendsList = () => {
    if (friends.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          You don't have any friends yet. Find players and send friend requests to connect.
        </Alert>
      );
    }

    return (
      <List>
        {friends.map((friend) => (
          <React.Fragment key={friend.id}>
            <ListItem
              secondaryAction={
                <Box>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => handleViewProfile(friend.friendId)}
                    sx={{ mr: 1 }}
                  >
                    View Profile
                  </Button>
                  <IconButton
                    edge="end"
                    aria-label="remove"
                    color="error"
                    onClick={() => handleRemoveFriend(friend.id)}
                    disabled={actionLoading === friend.id}
                  >
                    {actionLoading === friend.id ? (
                      <CircularProgress size={24} color="error" />
                    ) : (
                      <PersonRemoveIcon />
                    )}
                  </IconButton>
                </Box>
              }
            >
              <ListItemAvatar>
                <Avatar src={friend.avatarUrl} alt={friend.fullName || friend.username}>
                  {(friend.fullName || friend.username || '?')[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={friend.fullName || friend.username}
                secondary={`@${friend.username || 'unknown'} · Friends since ${new Date(friend.createdAt).toLocaleDateString()}`}
              />
            </ListItem>
            <Divider variant="inset" component="li" />
          </React.Fragment>
        ))}
      </List>
    );
  };

  const renderPendingRequests = () => {
    if (pendingRequests.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          You don't have any pending friend requests.
        </Alert>
      );
    }

    return (
      <List>
        {pendingRequests.map((request) => (
          <React.Fragment key={request.id}>
            <ListItem
              secondaryAction={
                <Box>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => handleAcceptFriendRequest(request.id)}
                    disabled={actionLoading === request.id}
                    sx={{ mr: 1 }}
                  >
                    {actionLoading === request.id ? <CircularProgress size={24} /> : 'Accept'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => handleDeclineFriendRequest(request.id)}
                    disabled={actionLoading === request.id}
                  >
                    {actionLoading === request.id ? <CircularProgress size={24} /> : 'Decline'}
                  </Button>
                </Box>
              }
            >
              <ListItemAvatar>
                <Avatar src={request.users.avatar_url} alt={request.users.full_name || request.users.username}>
                  {(request.users.full_name || request.users.username || '?')[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={request.users.full_name || request.users.username}
                secondary={`@${request.users.username || 'unknown'} · Requested ${new Date(request.created_at).toLocaleDateString()}`}
              />
            </ListItem>
            <Divider variant="inset" component="li" />
          </React.Fragment>
        ))}
      </List>
    );
  };

  const renderSentRequests = () => {
    if (sentRequests.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          You haven't sent any friend requests.
        </Alert>
      );
    }

    return (
      <List>
        {sentRequests.map((request) => (
          <React.Fragment key={request.id}>
            <ListItem
              secondaryAction={
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => handleCancelFriendRequest(request.id)}
                  disabled={actionLoading === request.id}
                >
                  {actionLoading === request.id ? <CircularProgress size={24} /> : 'Cancel Request'}
                </Button>
              }
            >
              <ListItemAvatar>
                <Avatar src={request.friends.avatar_url} alt={request.friends.full_name || request.friends.username}>
                  {(request.friends.full_name || request.friends.username || '?')[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={request.friends.full_name || request.friends.username}
                secondary={`@${request.friends.username || 'unknown'} · Sent ${new Date(request.created_at).toLocaleDateString()}`}
              />
            </ListItem>
            <Divider variant="inset" component="li" />
          </React.Fragment>
        ))}
      </List>
    );
  };

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
    setFriendEmail('');
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setFriendEmail('');
  };

  const renderBlockedUsers = () => {
    if (blockedUsers.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          You haven't blocked any users.
        </Alert>
      );
    }

    return (
      <List>
        {blockedUsers.map((blocked) => (
          <React.Fragment key={blocked.id}>
            <ListItem
              secondaryAction={
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => handleUnblockUser(blocked.id)}
                  disabled={actionLoading === blocked.id}
                >
                  {actionLoading === blocked.id ? <CircularProgress size={24} /> : 'Unblock'}
                </Button>
              }
            >
              <ListItemAvatar>
                <Avatar src={blocked.avatar_url} alt={blocked.full_name || blocked.username}>
                  {(blocked.full_name || blocked.username || '?')[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={blocked.full_name || blocked.username}
                secondary={`@${blocked.username || 'unknown'} · Blocked since ${new Date(blocked.created_at).toLocaleDateString()}`}
              />
            </ListItem>
            <Divider variant="inset" component="li" />
          </React.Fragment>
        ))}
      </List>
    );
  };
  
  const handleSendFriendRequest = async () => {
    if (!friendEmail.trim()) return;
    
    try {
      setAddingFriend(true);
      
      // First find the user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', friendEmail.trim())
        .single();
        
      if (userError) {
        showErrorToast('User not found with that email');
        setAddingFriend(false);
        return;
      }
      
      // Send friend request
      const result = await friendshipService.sendFriendRequest(userData.id);
      
      if (result.success) {
        showSuccessToast('Friend request sent successfully');
        handleCloseAddDialog();
        fetchFriends(); // Reload all friend data
      } else {
        showErrorToast(result.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      showErrorToast('Failed to send friend request');
    } finally {
      setAddingFriend(false);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>Friends</Typography>
        <Alert severity="warning">You need to log in to manage your friends</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Friends
          </Typography>
          
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab label="Friends" />
            <Tab 
              label={
                <Badge color="error" badgeContent={pendingRequests.length} showZero={false}>
                  Requests
                </Badge>
              } 
            />
            <Tab label="Sent" />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BlockIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Blocked
                </Box>
              } 
            />
          </Tabs>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {activeTab === 0 && renderFriendsList()}
              {activeTab === 1 && renderPendingRequests()}
              {activeTab === 2 && renderSentRequests()}
              {activeTab === 3 && renderBlockedUsers()}
            </>
          )}
        </Box>
      </Paper>

      {/* Add Friend Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseAddDialog}>
        <DialogTitle>Add Friend</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the email address of the user you want to add as a friend.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={friendEmail}
            onChange={(e) => setFriendEmail(e.target.value)}
            disabled={addingFriend}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} disabled={addingFriend}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendFriendRequest} 
            variant="contained" 
            disabled={!friendEmail.trim() || addingFriend}
          >
            {addingFriend ? <CircularProgress size={24} /> : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Friends; 