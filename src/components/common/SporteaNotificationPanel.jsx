import React, { useState, useEffect } from 'react';
import { X, Check, CheckCheck, Clock, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { SporteaCard } from './SporteaCard';
import { SporteaButton } from './SporteaButton';
import { useAuth } from '../../hooks/useAuth';
import { useProductionRealtime } from '../../hooks/useProductionRealtime';
import { supabase } from '../../services/supabase';
import { formatDistanceToNow } from 'date-fns';

// Mural-inspired notification panel variants
const panelVariants = cva(
  "absolute top-full right-0 mt-2 w-80 max-h-96 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg z-50",
  {
    variants: {
      variant: {
        default: "border-gray-200",
        elevated: "border-gray-200 shadow-xl",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const notificationItemVariants = cva(
  "p-3 border-b border-gray-100 last:border-b-0 transition-colors duration-200 cursor-pointer",
  {
    variants: {
      variant: {
        unread: "bg-brand-primary/5 hover:bg-brand-primary/10",
        read: "bg-white hover:bg-gray-50",
      }
    },
    defaultVariants: {
      variant: "read",
    },
  }
)

export function SporteaNotificationPanel({ 
  isOpen, 
  onClose, 
  className,
  ...props 
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const { user } = useAuth();
  const { connectionState } = useProductionRealtime();

  // Fetch notifications
  useEffect(() => {
    if (!user || !isOpen) return;

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
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user, isOpen]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user || !isOpen) return;

    const handleNotification = (event) => {
      const { eventType, new: data, old: oldData } = event.detail;

      if (eventType === 'INSERT') {
        setNotifications(prev => [data, ...prev]);
      } else if (eventType === 'UPDATE') {
        setNotifications(prev => 
          prev.map(n => n.id === data.id ? data : n)
        );
      } else if (eventType === 'DELETE') {
        setNotifications(prev => 
          prev.filter(n => n.id !== data.id)
        );
      }
    };

    window.addEventListener('sportea:notification', handleNotification);

    return () => {
      window.removeEventListener('sportea:notification', handleNotification);
    };
  }, [user, isOpen]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'match_join_request':
      case 'friend_request':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'match_update':
      case 'match_reminder':
        return <Calendar className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get notification title
  const getNotificationTitle = (notification) => {
    switch (notification.type) {
      case 'match_join_request':
        return 'Join Request';
      case 'friend_request':
        return 'Friend Request';
      case 'match_update':
        return 'Match Update';
      case 'match_reminder':
        return 'Match Reminder';
      default:
        return 'Notification';
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(panelVariants({ variant: "elevated" }), className)} {...props}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.is_read) && (
              <SporteaButton
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark all read
              </SporteaButton>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-md transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(notificationItemVariants({ 
                variant: notification.is_read ? "read" : "unread" 
              }))}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {getNotificationTitle(notification)}
                    </h4>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-brand-primary rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <SporteaButton
            variant="ghost"
            size="sm"
            className="w-full text-sm text-gray-600 hover:text-brand-primary"
          >
            View all notifications
          </SporteaButton>
        </div>
      )}
    </div>
  );
}

export default SporteaNotificationPanel;
