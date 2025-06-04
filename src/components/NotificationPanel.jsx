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
import { useRealtime } from '../hooks/useRealtime';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
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
  const { connectionState, subscribeToUserNotifications } = useRealtime();
  const { user } = useAuth();
  const { showInfoToast } = useToast();
  const navigate = useNavigate();
  
  // Helper function to generate notification titles based on type
  const getNotificationTitle = (notification) => {
    const type = notification.type || 'general';
    
    switch (type) {
      case 'match_invitation':
        return 'New Match Invitation';
      case 'match_joined':
        return 'New Participant';
      case 'match_cancelled':
        return 'Match Cancelled';
      case 'match_updated':
        return 'Match Updated';
      case 'friend_request':
        return 'Friend Request';
      case 'system':
        return 'System Notification';
      default:
        return 'New Notification';
    }
  };
  
  const open = Boolean(anchorEl);
  
  // Load initial notifications
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (error) throw error;
        
        setNotifications(data || []);
        
        // Count unread notifications
        const unread = data ? data.filter(n => !n.read).length : 0;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, [user]);
  
  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!user || !connectionState.isConnected) return;
    
    const handleNotification = (update) => {
      if (update.type === 'notification') {
        const { data, eventType } = update;
        
        if (eventType === 'INSERT') {
          // Add new notification to the top of the list
          setNotifications(prev => [data, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          const title = getNotificationTitle(data);
          const message = data.message || 'You have a new notification';
          showInfoToast(title, message);
        } else if (eventType === 'UPDATE') {
          // Update existing notification
          setNotifications(prev => 
            prev.map(n => n.id === data.id ? data : n)
          );
          
          // Recalculate unread count
          updateUnreadCount();
        } else if (eventType === 'DELETE') {
          // Remove deleted notification
          setNotifications(prev => 
            prev.filter(n => n.id !== data.id)
          );
          
          // Recalculate unread count
          updateUnreadCount();
        }
      }
    };
    
    // Subscribe to notifications
    subscribeToUserNotifications(user.id, handleNotification);
  }, [user, connectionState.isConnected, subscribeToUserNotifications]);
  
  // Handle click to open notification panel
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle close
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Handle navigation based on notification type
    if (notification.type === 'match_update' && notification.resource_id) {
      navigate(`/match/${notification.resource_id}`);
      handleClose();
    } else if (notification.type === 'friend_request' && notification.resource_id) {
      navigate(`/profile?friend=${notification.resource_id}`);
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
        .update({ read: true })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
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
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };
  
  // Update unread count
  const updateUnreadCount = () => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  };
  
  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'match_update':
        return <SportsIcon />;
      case 'friend_request':
        return <PersonAddIcon />;
      case 'system':
      default:
        return <EventAvailableIcon />;
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'MMM d, h:mm a');
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
                    bgcolor: !notification.read ? 'action.hover' : 'inherit',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: notification.read ? 'grey.400' : 'primary.main' }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={notification.title}
                    secondary={
                      <React.Fragment>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                          sx={{ display: 'block' }}
                        >
                          {notification.message}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {formatDate(notification.created_at)}
                        </Typography>
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
