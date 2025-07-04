import React, { useState, useEffect, useMemo } from 'react';
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
import { useRealtime } from '../hooks/useRealtime';
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
  const { connectionState, subscribeToUserNotifications } = useRealtime();
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
      case 'join_request_accepted':
        return 'Join Request Accepted';
      case 'join_request_rejected':
        return 'Join Request Declined';
      case 'friend_request':
        return 'Friend Request';
      case 'friend_request_accepted':
        return 'Friend Request Accepted';
      case 'friend_request_declined':
        return 'Friend Request Declined';
      case 'friend_removed':
        return 'Friend Removed';
      case 'system':
        return 'System Notification';
      default:
        return 'Notification';
    }
  };
  
  const open = Boolean(anchorEl);
  
  // Load initial notifications
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
        setUnreadCount(unread);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
    
    // Refresh notifications when the panel is opened
    if (open) {
      fetchNotifications();
    }
  }, [user, open]);
  
  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!user || !connectionState.isConnected) return;
    
    console.log(`[NotificationPanel] Setting up notification subscription for user: ${user.id}`);
    console.log(`[NotificationPanel] Connection state:`, connectionState);

    const handleNotification = (update) => {
      console.log('[NotificationPanel] Received realtime update:', update);
      
      if (update.type === 'notification') {
        const { data, eventType } = update;
        console.log(`[NotificationPanel] Processing notification: ${eventType}`, data);
        
        if (eventType === 'INSERT') {
          // Add new notification to the top of the list
          setNotifications(prev => [data, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          const title = getNotificationTitle(data);
          const message = data.content || data.message || 'You have a new notification';
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
  }, [user, connectionState.isConnected, subscribeToUserNotifications, showInfoToast]);
  
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
        return <CheckCircleIcon />;
      case 'join_request_rejected':
        return <CancelIcon />;
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
        senderId
      );
      
      // Mark as read
      await markAsRead(notification.id);
      
      // Update local notification list
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true, processed: true } : n)
      );
      
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
        senderId
      );
      
      // Mark as read
      await markAsRead(notification.id);
      
      // Update local notification list
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true, processed: true } : n)
      );
      
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
      >
        <Badge badgeContent={unreadCount} color="error">
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
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
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
                          {parseNotificationContent(notification)?.message || notification.content || "New notification"}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {formatDate(notification.created_at)}
                        </Typography>
                        
                        {/* Friend request action buttons */}
                        {notification.type === 'friend_request' && !notification.is_read && !notification.processed && (
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
                        {notification.type === 'match_join_request' && !notification.is_read && !notification.processed && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={(e) => handleAcceptJoinRequest(notification, e)}
                            >
                              Accept
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={(e) => handleDeclineJoinRequest(notification, e)}
                            >
                              Decline
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
