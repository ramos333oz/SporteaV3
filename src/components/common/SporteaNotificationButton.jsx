import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { useAuth } from '../../hooks/useAuth';
import { useProductionRealtime } from '../../hooks/useProductionRealtime';
import { supabase } from '../../services/supabase';

// Mural-inspired notification button variants
const notificationButtonVariants = cva(
  "relative p-1.5 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50",
  {
    variants: {
      variant: {
        default: "hover:bg-gray-100 text-gray-500 hover:text-brand-primary",
        active: "bg-brand-primary/10 text-brand-primary",
      },
      size: {
        sm: "p-1",
        default: "p-1.5",
        lg: "p-2",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const badgeVariants = cva(
  "absolute -top-1 -right-1 flex items-center justify-center text-white text-xs font-medium rounded-full min-w-[12px] h-3",
  {
    variants: {
      variant: {
        default: "bg-brand-primary",
        warning: "bg-orange-500",
        success: "bg-green-500",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export function SporteaNotificationButton({ 
  className, 
  variant = "default", 
  size = "default",
  onClick,
  ...props 
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { connectionState } = useProductionRealtime();
  const { user } = useAuth();

  // Fetch initial unread count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (error) throw error;

        const count = data?.length || 0;
        setUnreadCount(count);
      } catch (err) {
        console.error('Error fetching unread count:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();
  }, [user]);

  // Subscribe to real-time notification updates
  useEffect(() => {
    if (!user) return;

    const handleNotification = (event) => {
      const { eventType, new: data } = event.detail;

      if (eventType === 'INSERT') {
        setUnreadCount(prev => prev + 1);
      } else if (eventType === 'UPDATE' && data.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else if (eventType === 'DELETE') {
        // Refresh count on delete
        fetchUnreadCount();
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (error) throw error;
        setUnreadCount(data?.length || 0);
      } catch (err) {
        console.error('Error refreshing unread count:', err);
      }
    };

    // Subscribe to production-optimized notification events
    window.addEventListener('sportea:notification', handleNotification);

    return () => {
      window.removeEventListener('sportea:notification', handleNotification);
    };
  }, [user]);

  // Periodic refresh as fallback
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_read', false);

        if (error) throw error;
        setUnreadCount(data?.length || 0);
      } catch (err) {
        console.error('Error in periodic unread count refresh:', err);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={cn(notificationButtonVariants({ variant, size, className }))}
      onClick={handleClick}
      disabled={loading}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      {...props}
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className={cn(badgeVariants({ variant: "default" }))}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export default SporteaNotificationButton;
