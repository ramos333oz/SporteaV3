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
  Badge,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  FormLabel
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
  Cancel as CancelIcon,
  Badge as BadgeIcon,
  AlternateEmail as AlternateEmailIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import UserRecommendationSection from '../components/UserRecommendationSection';
import { friendshipService, supabase } from '../services/supabase';
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
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [inputMethod, setInputMethod] = useState('student_id'); // 'email' or 'id'
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[Friends] useEffect triggered with user:', user?.id || 'No user');

    if (user) {
      // Add a small delay to ensure auth session is fully established
      const timer = setTimeout(() => {
        fetchFriends();
      }, 100);
    }

    // Listen for friendship status changes
    const handleFriendshipStatusChange = (event) => {
      console.log('[Friends] Received friendship status change:', event.detail);
      // Refresh friends data when friendship status changes
      if (user) {
        fetchFriends();
      }
    };

    // Listen for friend request sent events for real-time UI updates
    const handleFriendRequestSent = async (event) => {
      console.log('[Friends] ✅ Friend request sent event received:', event.detail);
      const { userId, requestData } = event.detail;

      if (!userId || !requestData) {
        console.error('[Friends] ❌ Invalid event data:', { userId, requestData });
        return;
      }

      try {
        console.log('[Friends] 🔍 Fetching user details for userId:', userId);

        // Fetch the user details for the sent request
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, username, full_name, email, avatar_url')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('[Friends] ❌ Error fetching user data:', error);
          throw error;
        }

        if (userData) {
          console.log('[Friends] ✅ User data fetched:', userData);

          // Add to sent requests immediately for real-time UI update
          const newSentRequest = {
            addressee_id: userId,
            status: 'pending',
            created_at: new Date().toISOString(),
            ...userData,
            id: requestData.id // Ensure friendship ID is preserved after spread
          };

          console.log('[Friends] 🔍 New sent request structure:', {
            friendshipId: requestData.id,
            userId: userId,
            addresseeId: userId,
            finalId: newSentRequest.id
          });

          console.log('[Friends] 📝 Adding new sent request to UI:', newSentRequest);
          setSentRequests(prev => {
            // Check if this friend request already exists to prevent duplicates
            const existingRequest = prev.find(req =>
              req.addressee_id === userId ||
              req.friend_id === userId ||
              req.id === userId ||
              (req.username === userData.username && req.full_name === userData.full_name)
            );

            if (existingRequest) {
              console.log('[Friends] ⚠️ Friend request already exists, skipping duplicate:', existingRequest);
              return prev; // Return unchanged state
            }

            const updated = [newSentRequest, ...prev];
            console.log('[Friends] 📊 Updated sent requests:', updated);
            return updated;
          });

          console.log('[Friends] ✅ Real-time UI update completed successfully');
        } else {
          console.error('[Friends] ❌ No user data returned');
        }
      } catch (error) {
        console.error('[Friends] ❌ Error handling friend request sent event:', error);
        // Fallback to full refresh if real-time update fails
        console.log('[Friends] 🔄 Falling back to full refresh');
        fetchFriends();
      }
    };

    console.log('[Friends] 🎧 Registering event listeners for user:', user?.id);

    window.addEventListener('sportea:friendship_status_changed', handleFriendshipStatusChange);
    window.addEventListener('sportea:friend-request-sent', handleFriendRequestSent);

    console.log('[Friends] ✅ Event listeners registered successfully');

    return () => {
      console.log('[Friends] 🧹 Cleaning up event listeners for user:', user?.id);
      window.removeEventListener('sportea:friendship_status_changed', handleFriendshipStatusChange);
      window.removeEventListener('sportea:friend-request-sent', handleFriendRequestSent);
    };
  }, [user]);

  const fetchFriends = async (retryCount = 0) => {
    // Only set loading to true for the initial call, not for retries
    if (retryCount === 0) {
      setLoading(true);
    }
    setError(null);
    try {
      // Get friends
      const friendsResult = await friendshipService.getFriends();
      if (!friendsResult.success) {
        // Check if this is an authentication timing issue
        if (friendsResult.message && friendsResult.message.includes('Auth session missing') && retryCount < 3) {
          console.log(`[Friends] Auth session not ready, retrying in ${(retryCount + 1) * 1000}ms (attempt ${retryCount + 1}/3)`);
          setTimeout(() => fetchFriends(retryCount + 1), (retryCount + 1) * 1000);
          return;
        }
        throw new Error(friendsResult.message || friendsResult.error || 'Failed to fetch friends');
      }
      setFriends(friendsResult.data || []);
      
      // Get pending requests
      const pendingResult = await friendshipService.getPendingRequests();
      if (!pendingResult.success) {
        throw new Error(pendingResult.error || 'Failed to fetch pending requests');
      }
      setPendingRequests(pendingResult.data || []);
      
      // Get sent requests
      const sentResult = await friendshipService.getSentRequests();
      if (!sentResult.success) {
        throw new Error(sentResult.error || 'Failed to fetch sent requests');
      }
      setSentRequests(sentResult.data || []);
      
      // Get blocked users
      try {
        const blockedData = await friendshipService.getBlockedUsers();
        if (!blockedData.success) {
          console.warn('Failed to fetch blocked users:', blockedData.error);
          setBlockedUsers([]);
        } else {
          setBlockedUsers(blockedData.data || []);
        }
      } catch (blockError) {
        console.warn('Error fetching blocked users:', blockError);
        setBlockedUsers([]);
      }
      
    } catch (error) {
      console.error('Error getting friends:', error);
      setError(error.message || 'Failed to load friends');
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
    console.log('[Friends] 🚫 Cancel friend request called with ID:', friendshipId);
    setActionLoading(friendshipId);
    try {
      console.log('[Friends] 🔄 Calling friendshipService.removeFriend with ID:', friendshipId);
      const { success } = await friendshipService.removeFriend(friendshipId);

      console.log('[Friends] 📋 Remove friend result:', { success });

      if (success) {
        console.log('[Friends] ✅ Friend request canceled successfully');
        showSuccessToast('Friend request canceled');
        fetchFriends(); // Refresh the lists
      } else {
        console.log('[Friends] ❌ Friend request cancellation failed');
        showErrorToast('Failed to cancel friend request');
      }
    } catch (error) {
      console.error('[Friends] ❌ Error canceling friend request:', error);
      showErrorToast('Failed to cancel friend request');
    } finally {
      console.log('[Friends] 🏁 Cancel friend request operation completed');
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
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => handleBlockUser(friend)}
                    disabled={actionLoading === friend.id}
                    sx={{ mr: 1 }}
                  >
                    Block
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
                <Avatar src={request.avatar_url} alt={request.full_name || request.username}>
                  {(request.full_name || request.username || '?')[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={request.full_name || request.username}
                secondary={`@${request.username || 'unknown'} · Requested ${new Date(request.created_at).toLocaleDateString()}`}
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
                  onClick={() => {
                    console.log('[Friends] 🖱️ Cancel button clicked for request:', request);
                    console.log('[Friends] 🆔 Request ID being passed:', request.id);
                    handleCancelFriendRequest(request.id);
                  }}
                  disabled={actionLoading === request.id}
                >
                  {actionLoading === request.id ? <CircularProgress size={24} /> : 'Cancel Request'}
                </Button>
              }
            >
              <ListItemAvatar>
                <Avatar src={request.avatar_url} alt={request.username || request.full_name}>
                  {(request.username || request.full_name || '?')[0].toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={request.username || request.full_name}
                secondary={`@${request.username || 'unknown'} · Sent ${new Date(request.created_at).toLocaleDateString()}`}
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
    setFriendInput('');
    setInputMethod('student_id');
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setFriendEmail('');
    setFriendInput('');
    setInputMethod('student_id');
  };

  const renderDiscoverTab = () => {
    return (
      <Box sx={{ mt: 2 }}>
        <UserRecommendationSection
          title="People You May Know"
          showRefresh={true}
          maxUsers={10}
        />
      </Box>
    );
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
    const inputValue = friendInput.trim();
    if (!inputValue) return;

    try {
      setActionLoading(true);
      let userData;

      if (inputMethod === 'email') {
        // Find user by email
        const { data, error: userError } = await supabase
          .from('users')
          .select('id, email, username, full_name')
          .eq('email', inputValue)
          .single();

        if (userError) {
          showErrorToast('User not found with that email address');
          setActionLoading(false);
          return;
        }
        userData = data;
      } else if (inputMethod === 'student_id') {
        // Find user by student ID (extract from email)
        const studentEmail = `${inputValue}@student.uitm.edu.my`;
        const { data, error: userError } = await supabase
          .from('users')
          .select('id, email, username, full_name')
          .eq('email', studentEmail)
          .single();

        if (userError) {
          showErrorToast('Student not found with that ID');
          setActionLoading(false);
          return;
        }
        userData = data;
      } else {
        // Legacy support for username/UUID search
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inputValue);

        let query = supabase
          .from('users')
          .select('id, email, username, full_name');

        if (isUUID) {
          query = query.eq('id', inputValue);
        } else {
          query = query.ilike('username', inputValue);
        }

        const { data, error: userError } = await query.single();

        if (userError) {
          showErrorToast('User not found with that ID or username');
          setActionLoading(false);
          return;
        }
        userData = data;
      }

      // Send friend request
      const result = await friendshipService.sendFriendRequest(userData.id);

      if (result.success) {
        showSuccessToast(`Friend request sent to ${userData.full_name || userData.username || userData.email}`);
        handleCloseAddDialog();

        // Emit event for real-time UI update
        window.dispatchEvent(new CustomEvent('sportea:friend-request-sent', {
          detail: {
            userId: userData.id,
            requestData: result.data
          }
        }));

        // Also refresh all friend data as fallback
        fetchFriends();
      } else {
        showErrorToast(result.message || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      showErrorToast('Failed to send friend request');
    } finally {
      setActionLoading(false);
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">Friends</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonAddIcon />}
          onClick={handleOpenAddDialog}
        >
          Add Friend
        </Button>
      </Box>

      {/* Add error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Button
            size="small"
            sx={{ ml: 2 }}
            onClick={fetchFriends}
          >
            Retry
          </Button>
        </Alert>
      )}



      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Friends" />
          <Tab
            label={
              <Badge badgeContent={pendingRequests.length} color="error" showZero={false}>
                Requests
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={sentRequests.length} color="primary" showZero={false}>
                Sent
              </Badge>
            }
          />
          <Tab label="Discover" />
          <Tab label="Blocked" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {activeTab === 0 && renderFriendsList()}
          {activeTab === 1 && renderPendingRequests()}
          {activeTab === 2 && renderSentRequests()}
          {activeTab === 3 && renderDiscoverTab()}
          {activeTab === 4 && renderBlockedUsers()}
        </>
      )}

      {/* Add Friend Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Friend</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Add a friend by their student ID or email address.
          </DialogContentText>

          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ mb: 1 }}>Search Method</FormLabel>
            <ToggleButtonGroup
              value={inputMethod}
              exclusive
              onChange={(e, newMethod) => {
                if (newMethod !== null) {
                  setInputMethod(newMethod);
                  setFriendInput('');
                }
              }}
              aria-label="input method"
              size="small"
              fullWidth
            >
              <ToggleButton value="student_id" aria-label="student id">
                <BadgeIcon sx={{ mr: 1 }} />
                Student ID
              </ToggleButton>
              <ToggleButton value="email" aria-label="email">
                <EmailIcon sx={{ mr: 1 }} />
                Email Address
              </ToggleButton>
            </ToggleButtonGroup>
          </FormControl>

          <TextField
            autoFocus
            margin="dense"
            label={
              inputMethod === 'student_id'
                ? 'Student ID'
                : inputMethod === 'email'
                ? 'Email Address'
                : 'User ID or Username'
            }
            type={inputMethod === 'email' ? 'email' : 'text'}
            fullWidth
            variant="outlined"
            value={friendInput}
            onChange={(e) => setFriendInput(e.target.value)}
            disabled={actionLoading}
            placeholder={
              inputMethod === 'student_id'
                ? '2022812795'
                : inputMethod === 'email'
                ? 'example@student.uitm.edu.my'
                : 'Enter user ID or username'
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {inputMethod === 'email' ? <AlternateEmailIcon /> : <BadgeIcon />}
                </InputAdornment>
              ),
            }}
            helperText={
              inputMethod === 'student_id'
                ? 'Enter the student ID (the number before @student.uitm.edu.my)'
                : inputMethod === 'email'
                ? 'Enter the email address of the user you want to add'
                : 'Enter the user ID or username of the user you want to add'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSendFriendRequest}
            variant="contained"
            disabled={!friendInput.trim() || actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Friends; 