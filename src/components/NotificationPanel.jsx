import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Badge,
  IconButton,
  Divider,
  CircularProgress,
  Button
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SportsIcon from '@mui/icons-material/Sports';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LogoutIcon from '@mui/icons-material/Logout';
import { useOptimizedRealtime } from '../hooks/useOptimizedRealtime';
import { useAuth } from '../hooks/useAuth';
import { supabase, friendshipService } from '../services/supabase';
import { participantService } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '../contexts/ToastContext';

/**
 * NotificationPanel component
 * Displays real-time notifications for the user with WebSocket updates
 */
const NotificationPanel = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const { connectionState, subscribeToUserNotifications } = useOptimizedRealtime();
  const { user } = useAuth();
  const { showInfoToast, showSuccessToast, showErrorToast } = useToast();
  const navigate = useNavigate();
  
  // Helper function to generate notification titles based on type
  const getNotificationTitle = (notification) => {
    switch (notification.type) {
      case 'match_update':
        return 'Match Update';
      case 'match_join_request':
        return 'Join Request';
      case 'match_invitation':
        return 'Match Invitation';
      case 'join_request_accepted':
        return 'Join Request Accepted';
      case 'join_request_rejected':
        return 'Join Request Declined';
      case 'invitation_accepted':
        return 'Invitation Accepted';
      case 'invitation_declined':
        return 'Invitation Declined';
      case 'friend_request':
        return 'Friend Request';
      case 'friend_request_accepted':
        return 'Friend Request Accepted';
      case 'friend_request_declined':
        return 'Friend Request Declined';
      case 'friend_removed':
        return 'Friend Removed';
      case 'participant_left':
        return 'Participant Left';
      case 'system':
        return 'System Notification';
      default:
        return 'Notification';
    }
  };

  // Helper function to format notification messages
  const getNotificationMessage = (notification) => {
    const contentData = parseNotificationContent(notification);

    switch (notification.type) {
      case 'match_invitation':
        if (contentData) {
          const inviterName = contentData.inviter_name || 'Someone';
          const matchTitle = contentData.match_title || 'a match';
          return `${inviterName} invited you to join "${matchTitle}". Click to view match details.`;
        }
        return 'You have been invited to join a match';

      case 'match_join_request':
        if (contentData) {
          const requesterName = contentData.requester_name || 'Someone';
          const matchTitle = contentData.match_title || 'your match';
          return `${requesterName} wants to join "${matchTitle}"`;
        }
        return 'Someone wants to join your match';
        
      case 'invitation_accepted':
        if (contentData) {
          const responderName = contentData.responder_name || contentData.responder || 'Someone';
          const matchTitle = contentData.match_title || 'your match';
          return `${responderName} has accepted your invitation and joined "${matchTitle}"`;
        }
        return 'Someone has accepted your match invitation';
        
      case 'invitation_declined':
        if (contentData) {
          const responderName = contentData.responder_name || contentData.responder || 'Someone';
          const matchTitle = contentData.match_title || 'your match';
          return `${responderName} has declined your invitation to join "${matchTitle}"`;
        }
        return 'Someone has declined your match invitation';
      
      case 'participant_left':
        if (contentData) {
          const participantName = contentData.participant_name || 'Someone';
          const matchTitle = contentData.match_title || 'your match';
          return `${participantName} has left your match "${matchTitle}"`;
        }
        return 'Someone has left your match';
        
      case 'join_request_accepted':
        if (contentData) {
          const matchTitle = contentData.match_title || 'the match';
          return `Your request to join "${matchTitle}" has been accepted`;
        }
        return 'Your join request has been accepted';
        
      case 'join_request_rejected':
        if (contentData) {
          const matchTitle = contentData.match_title || 'the match';
          return `Your request to join "${matchTitle}" has been declined`;
        }
        return 'Your join request has been declined';

      default:
        return contentData?.message || notification.content || "New notification";
    }
  };
  
  const open = Boolean(anchorEl);
  
  // Load initial notifications and unread count
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setLoading(true);

      try {
        // Get notifications with more detailed data to help debugging
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            *,
            sender:users(id, full_name, username, avatar_url)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        console.log('[NotificationPanel] Fetched notifications:', data);

        setNotifications(data || []);

        // Count unread notifications
        const unread = data ? data.filter(n => !n.is_read).length : 0;
        console.log('[NotificationPanel] Setting unread count:', unread, 'from', data?.length, 'total notifications');
        setUnreadCount(unread);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  // Separate effect to refresh when panel is opened
  useEffect(() => {
    if (!user || !open) return;

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select(`
            *,
            sender:users(id, full_name, username, avatar_url)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        setNotifications(data || []);
        const unread = data ? data.filter(n => !n.is_read).length : 0;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Error refreshing notifications:', err);
      }
    };

    fetchNotifications();
  }, [user, open]);
  
  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!user) return;

    console.log(`[NotificationPanel] Setting up notification subscription for user: ${user.id}`);
    console.log(`[NotificationPanel] Connection state:`, connectionState);

    // Don't wait for connection - subscribe immediately and let the realtime service handle reconnection
    if (!connectionState.isConnected) {
      console.log('[NotificationPanel] Not connected yet, but setting up subscription anyway');
    }

    const handleNotification = (update) => {
      console.log('[NotificationPanel] Received optimized realtime update:', update);

      const { data, eventType } = update;
      console.log(`[NotificationPanel] Processing notification: ${eventType}`, data);

      if (eventType === 'INSERT') {
          // Add new notification to the top of the list
          setNotifications(prev => [data, ...prev]);
          setUnreadCount(prev => {
            const newCount = prev + 1;
            console.log('[NotificationPanel] Incrementing unread count from', prev, 'to', newCount);
            return newCount;
          });

          // Show toast notification
          const title = getNotificationTitle(data);
          const message = getNotificationMessage(data);
          showInfoToast(title, message);
          console.log(`[NotificationPanel] Added new notification: ${title}`);
        } else if (eventType === 'UPDATE') {
          // Update existing notification
          setNotifications(prev => 
            prev.map(n => n.id === data.id ? data : n)
          );
          
          // Recalculate unread count
          updateUnreadCount();
          console.log(`[NotificationPanel] Updated notification: ${data.id}`);
        } else if (eventType === 'DELETE') {
          // Remove deleted notification
          setNotifications(prev => 
            prev.filter(n => n.id !== data.id)
          );
          
          // Recalculate unread count
          updateUnreadCount();
          console.log(`[NotificationPanel] Removed notification: ${data.id}`);
        }
    };
    
    // Subscribe to notifications
    const subscriptionId = subscribeToUserNotifications(user.id, handleNotification);
    console.log(`[NotificationPanel] Subscribed to notifications with ID: ${subscriptionId}`);
    
    // Refresh notifications on connection change
    if (connectionState.isConnected) {
      const fetchNotifications = async () => {
        try {
          const { data, error } = await supabase
            .from('notifications')
            .select(`
              *,
              sender:users(id, full_name, username, avatar_url)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
            
          if (error) throw error;
          
          console.log('[NotificationPanel] Refreshed notifications on connection change:', data?.length || 0);
          
          if (data && data.length > 0) {
            setNotifications(data);
            const unread = data.filter(n => !n.is_read).length;
            setUnreadCount(unread);
          }
        } catch (err) {
          console.error('[NotificationPanel] Error refreshing notifications:', err);
        }
      };
      
      fetchNotifications();
    }
    
    return () => {
      // No need to manually unsubscribe as the useRealtime hook handles this
      console.log(`[NotificationPanel] Cleaning up notification subscription`);
    };
  }, [user, subscribeToUserNotifications, showInfoToast]); // Removed connectionState.isConnected dependency

  // Periodic refresh of unread count (fallback for real-time issues)
  useEffect(() => {
    if (!user) return;

    const refreshUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, is_read')
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (error) throw error;

        const currentUnreadCount = data?.length || 0;
        console.log('[NotificationPanel] Periodic refresh - unread count:', currentUnreadCount);

        setUnreadCount(prev => {
          if (prev !== currentUnreadCount) {
            console.log('[NotificationPanel] Updating unread count from', prev, 'to', currentUnreadCount);
            return currentUnreadCount;
          }
          return prev;
        });
      } catch (err) {
        console.error('[NotificationPanel] Error in periodic refresh:', err);
      }
    };

    // Initial refresh
    refreshUnreadCount();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(refreshUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  // Handle click to open notification panel
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications(); // Refresh notifications when panel opens
  };
  
  // Handle close
  const handleClose = () => {
    setAnchorEl(null);
    markNotificationsAsRead();
  };
  
  // Parse JSON content for notification data
  const parseNotificationContent = (notification) => {
    if (!notification.content) return null;

    try {
      // Try to parse as JSON first
      return JSON.parse(notification.content);
    } catch (e) {
      // If it's not JSON, return the content as is in a message field
      return { message: notification.content };
    }
  };

  // Check if a join request notification is still actionable
  const isJoinRequestActionable = useCallback(async (notification) => {
    if (notification.type !== 'match_join_request' || !notification.match_id) {
      return false;
    }

    try {
      const content = parseNotificationContent(notification);
      const senderId = content?.sender_id;

      if (!senderId) return false;

      // Check current participant status
      const { data, error } = await supabase
        .from('participants')
        .select('status')
        .eq('match_id', notification.match_id)
        .eq('user_id', senderId)
        .single();

      if (error || !data) return false;

      // Only actionable if status is still 'pending'
      return data.status === 'pending';
    } catch (error) {
      console.error('Error checking join request status:', error);
      return false;
    }
  }, []);

  // Enhanced notification processing with actionability check
  const [actionableNotifications, setActionableNotifications] = useState(new Set());

  // Check actionability for join request notifications
  useEffect(() => {
    const checkActionability = async () => {
      const joinRequestNotifications = notifications.filter(n => n.type === 'match_join_request');
      const actionableIds = new Set();

      for (const notification of joinRequestNotifications) {
        const isActionable = await isJoinRequestActionable(notification);
        if (isActionable) {
          actionableIds.add(notification.id);
        }
      }

      setActionableNotifications(actionableIds);
    };

    if (notifications.length > 0) {
      checkActionability();
    }
  }, [notifications, isJoinRequestActionable]);
  
  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Parse content if it contains JSON data
    const contentData = parseNotificationContent(notification);
    
    // Handle navigation based on notification type
    if (notification.type === 'match_update' && notification.resource_id) {
      navigate(`/match/${notification.resource_id}`);
      handleClose();
    } else if (notification.type === 'match_invitation' && contentData?.match_id) {
      console.log('Navigating to match from invitation notification:', contentData);
      navigate(`/match/${contentData.match_id}?from=notification&type=match_invitation`);
      handleClose();
    } else if (notification.type === 'match_join_request' && notification.match_id) {
      navigate(`/match/${notification.match_id}`);
      handleClose();
    } else if ((notification.type === 'join_request_accepted' || notification.type === 'join_request_rejected') && notification.match_id) {
      navigate(`/match/${notification.match_id}`);
      handleClose();
    } else if (notification.type === 'friend_request' && notification.data && notification.data.sender_id) {
      // Navigate to sender's profile
      navigate(`/profile/${notification.data.sender_id}`);
      handleClose();
    } else if (notification.type === 'friend_request_accepted' && notification.data && notification.data.accepter_id) {
      // Navigate to accepter's profile
      navigate(`/profile/${notification.data.accepter_id}`);
      handleClose();
    } else if (notification.type === 'system') {
      handleClose();
    }
  };
  
  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { 
          ...n, 
          is_read: true, 
          // Mark as processed if it's a join request notification
          ...(n.type === 'match_join_request' || n.type === 'friend_request' ? { processed: true } : {})
        } : n)
      );
      
      // Update unread count
      updateUnreadCount();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };
  
  // Mark all as read
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          is_read: true,
          // Mark join request notifications as processed too
          ...(n.type === 'match_join_request' || n.type === 'friend_request' ? { processed: true } : {})
        }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };
  
  // Update unread count
  const updateUnreadCount = () => {
    const unread = notifications.filter(n => !n.is_read).length;
    setUnreadCount(unread);
  };
  
  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'match_update':
        return <SportsIcon />;
      case 'friend_request':
      case 'friend_request_accepted':
        return <PersonAddIcon />;
      case 'match_join_request':
        return <PersonAddIcon />;
      case 'join_request_accepted':
      case 'invitation_accepted':
        return <CheckCircleIcon />;
      case 'join_request_rejected':
      case 'invitation_declined':
        return <CancelIcon />;
      case 'participant_left':
        return <LogoutIcon />;
      case 'system':
      default:
        return <EventAvailableIcon />;
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  // Handle accepting a friend request
  const handleAcceptFriendRequest = async (notification) => {
    if (!notification || !notification.content) return;
    
    setActionLoading(notification.id);
    try {
      // Parse the content to get friendship details
      const content = typeof notification.content === 'string'
        ? JSON.parse(notification.content)
        : notification.content;
      
      // Get the friendship ID from the notification
      const { data: friendship, error: queryError } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', content.sender_id)
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (queryError) throw queryError;
      
      if (!friendship) {
        showErrorToast('Friend request not found or already processed');
        return;
      }
      
      // Accept the friend request
      const { success } = await friendshipService.acceptFriendRequest(friendship.id);
      
      if (success) {
        showSuccessToast('Friend request accepted');
        // Remove this notification from the list
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showErrorToast('Failed to accept friend request');
    } finally {
      setActionLoading(null);
    }
  };
  
  // Handle declining a friend request
  const handleDeclineFriendRequest = async (notification) => {
    if (!notification || !notification.content) return;
    
    setActionLoading(notification.id);
    try {
      // Parse the content to get friendship details
      const content = typeof notification.content === 'string'
        ? JSON.parse(notification.content)
        : notification.content;
      
      // Get the friendship ID from the notification
      const { data: friendship, error: queryError } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_id', content.sender_id)
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (queryError) throw queryError;
      
      if (!friendship) {
        showErrorToast('Friend request not found or already processed');
        return;
      }
      
      // Decline the friend request
      const { success } = await friendshipService.declineFriendRequest(friendship.id);
      
      if (success) {
        showSuccessToast('Friend request declined');
        // Remove this notification from the list
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      showErrorToast('Failed to decline friend request');
    } finally {
      setActionLoading(null);
    }
  };
  
  // Handle accept join request
  const handleAcceptJoinRequest = async (notification, event) => {
    event.stopPropagation(); // Prevent notification click handler
    
    // Parse JSON content to get sender_id
    const contentData = parseNotificationContent(notification);
    const senderId = contentData?.sender_id;
    
    if (!notification.match_id || !senderId) {
      showInfoToast('Error', 'Invalid join request data');
      return;
    }
    
    try {
      await participantService.acceptJoinRequest(
        notification.match_id,
        senderId,
        user.id
      );
      
      // Mark as read
      await markAsRead(notification.id);
      
      // Update local notification list
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true, processed: true } : n)
      );

      // Remove from actionable notifications
      setActionableNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });

      // Show success toast
      showInfoToast('Success', 'Join request accepted');

      // Update unread count
      updateUnreadCount();
    } catch (error) {
      console.error('Error accepting join request:', error);
      showInfoToast('Error', error.message || 'Failed to accept join request');
    }
  };
  
  // Handle decline join request
  const handleDeclineJoinRequest = async (notification, event) => {
    event.stopPropagation(); // Prevent notification click handler
    
    // Parse JSON content to get sender_id
    const contentData = parseNotificationContent(notification);
    const senderId = contentData?.sender_id;
    
    if (!notification.match_id || !senderId) {
      showInfoToast('Error', 'Invalid join request data');
      return;
    }
    
    try {
      await participantService.declineJoinRequest(
        notification.match_id,
        senderId,
        user.id
      );
      
      // Mark as read
      await markAsRead(notification.id);
      
      // Update local notification list
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true, processed: true } : n)
      );

      // Remove from actionable notifications
      setActionableNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });

      // Show success toast
      showInfoToast('Success', 'Join request declined');

      // Update unread count
      updateUnreadCount();
    } catch (error) {
      console.error('Error declining join request:', error);
      showInfoToast('Error', error.message || 'Failed to decline join request');
    }
  };
  
  const markNotificationsAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    // Get IDs of unread notifications
    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id);
    
    if (unreadIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };
  
  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label="show notifications"
        title={`${unreadCount} unread notifications`}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          showZero={false}
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.75rem',
              minWidth: '20px',
              height: '20px',
              borderRadius: '10px',
              fontWeight: 'bold',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }
          }}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 4,
          sx: {
            width: '350px',
            maxHeight: '500px',
            overflow: 'auto',
            mt: 1
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" onClick={() => {
              // Manual refresh
              const fetchNotifications = async () => {
                try {
                  const { data, error } = await supabase
                    .from('notifications')
                    .select(`
                      *,
                      sender:users(id, full_name, username, avatar_url)
                    `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                  if (error) throw error;

                  setNotifications(data || []);
                  const unread = data ? data.filter(n => !n.is_read).length : 0;
                  setUnreadCount(unread);
                  console.log('[NotificationPanel] Manual refresh completed, unread count:', unread);
                } catch (err) {
                  console.error('Error in manual refresh:', err);
                }
              };
              fetchNotifications();
            }}>
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </Box>
        </Box>
        
        <Divider />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length > 0 ? (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem 
                  alignItems="flex-start"
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: !notification.is_read ? 'action.hover' : 'inherit',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: notification.is_read ? 'grey.400' : 'primary.main' }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={getNotificationTitle(notification)}
                    secondary={
                      <React.Fragment>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                          sx={{ display: 'block' }}
                        >
                          {getNotificationMessage(notification)}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {formatDate(notification.created_at)}
                        </Typography>
                        
                        {/* Friend request action buttons */}
                        {notification.type === 'friend_request' && !notification.processed && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptFriendRequest(notification);
                              }}
                              disabled={actionLoading === notification.id}
                            >
                              {actionLoading === notification.id ? <CircularProgress size={20} /> : 'Accept'}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeclineFriendRequest(notification);
                              }}
                              disabled={actionLoading === notification.id}
                            >
                              {actionLoading === notification.id ? <CircularProgress size={20} /> : 'Decline'}
                            </Button>
                          </Box>
                        )}

                        {/* Match join request action buttons */}
                        {notification.type === 'match_join_request' && actionableNotifications.has(notification.id) && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={(e) => handleAcceptJoinRequest(notification, e)}
                              disabled={actionLoading === notification.id}
                            >
                              {actionLoading === notification.id ? <CircularProgress size={20} /> : 'Accept'}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={(e) => handleDeclineJoinRequest(notification, e)}
                              disabled={actionLoading === notification.id}
                            >
                              {actionLoading === notification.id ? <CircularProgress size={20} /> : 'Decline'}
                            </Button>
                          </Box>
                        )}
                      </React.Fragment>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        )}
        
        {notifications.length > 0 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Button size="small" color="primary">
              View All
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
};

export default NotificationPanel;
