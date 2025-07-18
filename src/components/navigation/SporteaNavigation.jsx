import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Search, 
  Calendar, 
  Users, 
  Trophy, 
  User,
  LogOut,
  Bell,
  Settings
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { SporteaButton } from '../common/SporteaButton';

const navigationItems = [
  {
    name: 'Home',
    href: '/home',
    icon: Home,
    description: 'Dashboard and overview'
  },
  {
    name: 'Find',
    href: '/find',
    icon: Search,
    description: 'Find matches and players'
  },
  {
    name: 'Host',
    href: '/host',
    icon: Calendar,
    description: 'Create and manage matches'
  },
  {
    name: 'Friends',
    href: '/friends',
    icon: Users,
    description: 'Connect with other players'
  },
  {
    name: 'Leaderboard',
    href: '/leaderboard',
    icon: Trophy,
    description: 'Rankings and achievements'
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
    description: 'Your profile and settings'
  }
];

function SporteaNavigation({ className, ...props }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || '??';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav 
      className={cn(
        "flex flex-col h-full bg-background border-r border-border",
        className
      )} 
      {...props}
    >
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">S</span>
          </div>
          <span className="text-xl font-bold text-foreground">Sportea</span>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-3 py-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <li key={item.name}>
                <button
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url} alt={user?.full_name || user?.username} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(user?.full_name || user?.username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.full_name || user?.username || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

// Top Navigation Bar Component
function SporteaTopBar({ title, description, actions, notifications = 0 }) {
  const navigate = useNavigate();

  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex-1">
          {title && (
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          )}
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notifications > 99 ? '99+' : notifications}
              </Badge>
            )}
          </button>
          
          {/* Actions */}
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// Breadcrumb Component
function SporteaBreadcrumb({ items }) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span>/</span>}
          {item.href ? (
            <button
              onClick={() => navigate(item.href)}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export { SporteaNavigation, SporteaTopBar, SporteaBreadcrumb };
