import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GroupIcon from '@mui/icons-material/Group';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import MessageIcon from '@mui/icons-material/Message';
import EventIcon from '@mui/icons-material/Event';
import { format, isToday, isYesterday } from 'date-fns';

import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { notificationService } from '../../services/notifications';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'match_invite':
    case 'match_updated':
    case 'match_cancelled':
    case 'match_starting_soon':
      return <EventIcon color="primary" />;
    case 'match_join_request':
    case 'join_request_accepted':
    case 'join_request_rejected':
      return <GroupIcon color="primary" />;
    case 'new_message':
      return <MessageIcon color="primary" />;
    default:
      return <SportsSoccerIcon color="primary" />;
  }
};

const formatNotificationDate = (date) => {
  const notificationDate = new Date(date);
  
  if (isToday(notificationDate)) {
    return `Today at ${format(notificationDate, 'h:mm a')}`;
  } else if (isYesterday(notificationDate)) {
    return `Yesterday at ${format(notificationDate, 'h:mm a')}`;
  } else {
    return format(notificationDate, 'MMM d, yyyy');
  }
};

const NotificationList = () => {
  const { user } = useAuth();
  const { subscribeToNotifications } = useRealtime();
  const navigate = useNavigate();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const open = Boolean(anchorEl);
  
  // Fetch all notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data);
      
      // Count unread
      const unread = data.filter(notification => !notification.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      await notificationService.markAllAsRead(user.id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.match_id) {
      navigate(`/match/${notification.match_id}`);
    } else if (notification.type === 'new_message' && notification.sender_id) {
      navigate(`/messages/${notification.sender_id}`);
    }
    
    // Close menu
    setAnchorEl(null);
  };
  
  // Handle new notification event
  const handleNewNotification = useCallback((event) => {
    const notification = event.detail;
    
    // Update notifications list
    setNotifications(prev => [notification, ...prev]);
    
    // Update unread count
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);
  
  // Initial data loading
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  
  // Set up real-time notifications
  useEffect(() => {
    // Subscribe to user notifications
    const subscriptionId = subscribeToNotifications();
    
    // Listen for notification events
    window.addEventListener('sportea:notification', handleNewNotification);
    
    return () => {
      // Remove event listener on cleanup
      window.removeEventListener('sportea:notification', handleNewNotification);
    };
  }, [subscribeToNotifications, handleNewNotification]);
  
  // Menu handlers
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  return (
    <>
      <IconButton
        color="primary"
        aria-label="notifications"
        onClick={handleClick}
        aria-controls={open ? 'notification-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            maxHeight: 'calc(100vh - 100px)',
            width: '340px',
            maxWidth: '100%',
            overflow: 'hidden',
            mt: 1.5
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h3">Notifications</Typography>
          {unreadCount > 0 && (
            <Button
              variant="text"
              size="small"
              onClick={markAllAsRead}
              startIcon={<CheckCircleIcon />}
              sx={{ minWidth: 'auto' }}
            >
              Mark all as read
            </Button>
          )}
        </Box>
        
        <Divider />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={30} />
          </Box>
        ) : notifications.length > 0 ? (
          <List
            sx={{
              width: '100%',
              bgcolor: 'background.paper',
              overflow: 'auto',
              maxHeight: 'calc(100vh - 200px)',
            }}
          >
            {notifications.map((notification) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  alignItems="flex-start"
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'primary.lighter',
                    px: 2,
                    py: 1.5,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar alt={notification.sender?.full_name || 'Notification'}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={notification.content}
                    secondary={
                      <React.Fragment>
                        <Typography
                          sx={{ display: 'block' }}
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          {formatNotificationDate(notification.created_at)}
                        </Typography>
                      </React.Fragment>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
            }}
          >
            <Typography variant="h3" color="text.secondary" gutterBottom>
              No notifications yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You'll see notifications about matches, join requests, and messages here.
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationList;
