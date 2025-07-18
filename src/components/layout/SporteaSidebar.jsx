import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import {
  Home,
  Search,
  Plus,
  Users,
  Trophy,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { SporteaButton } from '../common/SporteaButton';
import { SporteaNotificationButton } from '../common/SporteaNotificationButton';
import { SporteaConnectionButton } from '../common/SporteaConnectionButton';
import { SporteaReportButton } from '../common/SporteaReportButton';
import { SporteaNotificationPanel } from '../common/SporteaNotificationPanel';

// Mural-inspired sidebar variants
const sidebarVariants = cva(
  "flex flex-col h-full bg-white border-r border-gray-200 shadow-sm",
  {
    variants: {
      size: {
        default: "w-64",
        collapsed: "w-16",
      }
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const navItemVariants = cva(
  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
  {
    variants: {
      variant: {
        default: "text-gray-700 hover:bg-gray-50 hover:text-brand-primary",
        active: "bg-brand-primary text-white shadow-sm",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export function SporteaSidebar({ className, collapsed = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  // Navigation items with Mural-inspired design
  const navItems = [
    { name: 'Home', icon: Home, path: '/home' },
    { name: 'Find', icon: Search, path: '/find' },
    { name: 'Host', icon: Plus, path: '/host' },
    { name: 'Friends', icon: Users, path: '/friends' },
    { name: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || '??';
  };

  return (
    <div className={cn(sidebarVariants({ size: collapsed ? "collapsed" : "default" }), className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-gray-900">Sportea</span>
          )}
        </div>
        
        {/* Connection Status & Notifications */}
        {!collapsed && (
          <div className="mt-4 flex items-center justify-between">
            <SporteaConnectionButton showStatus={true} />
            <div className="flex items-center gap-1 relative">
              <SporteaConnectionButton showStatus={false} />
              <div className="relative">
                <SporteaNotificationButton
                  onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                />
                <SporteaNotificationPanel
                  isOpen={notificationPanelOpen}
                  onClose={() => setNotificationPanelOpen(false)}
                />
              </div>
              <SporteaReportButton />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={cn(navItemVariants({ 
                    variant: isActive ? "active" : "default" 
                  }))}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile & Sign Out */}
      <div className="p-4 border-t border-gray-100">
        {!collapsed && user && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {getInitials(user.user_metadata?.name || user.email)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h6 className="font-medium text-gray-900 truncate">
                {user.user_metadata?.name || 'User'}
              </h6>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}
        
        <button
          onClick={handleSignOut}
          className={cn(navItemVariants({ variant: "default" }), "w-full justify-start")}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

export default SporteaSidebar;
