import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Divider
} from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import BottomNavigation from './BottomNavigation';
import NotificationList from '../notifications/NotificationList';
import ConnectionStatus from '../ConnectionStatus';
import NotificationPanel from '../NotificationPanel';
import { ReportButton } from '../reporting';
import { useAuth } from '../../hooks/useAuth';

const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  // Sidebar state management
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Real-time notifications are handled by the NotificationList component

  // Sidebar width for desktop view
  const drawerWidth = 240;
  const collapsedWidth = 80;
  
  // Navigation items
  const navItems = [
    { name: 'Home', icon: <HomeIcon />, path: '/home' },
    { name: 'Find', icon: <SearchIcon />, path: '/find' },
    { name: 'Host', icon: <AddCircleIcon color="primary" />, path: '/host' },
    { name: 'Friends', icon: <PeopleIcon />, path: '/friends' },
    { name: 'Leaderboard', icon: <EmojiEventsIcon />, path: '/leaderboard' },
    { name: 'Profile', icon: <PersonIcon />, path: '/profile' }
  ];
  
  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          width: {
            xs: '100%',
            md: `calc(100% - ${sidebarOpen ? drawerWidth : collapsedWidth}px)`
          },
          ml: {
            xs: 0,
            md: `${sidebarOpen ? drawerWidth : collapsedWidth}px`
          },
          transition: 'width 0.3s ease, margin-left 0.3s ease',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          minHeight: 64,
          maxHeight: 64,
          boxSizing: 'border-box'
        }}
      >
        <Toolbar sx={{
          minHeight: '64px !important',
          maxHeight: '64px !important',
          boxSizing: 'border-box'
        }}>
          <Box sx={{ flexGrow: 1 }} />
          <ConnectionStatus />
          <ReportButton />
          <NotificationPanel />
        </Toolbar>
      </AppBar>
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: sidebarOpen ? drawerWidth : collapsedWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarOpen ? drawerWidth : collapsedWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              transition: 'width 0.3s ease',
              overflowX: 'hidden'
            },
          }}
        >
          {/* Sidebar Header with Hamburger Menu and Sportea Logo/Title */}
          <Box sx={{
            minHeight: 64,
            maxHeight: 64,
            display: 'flex',
            alignItems: 'center',
            px: sidebarOpen ? 2 : 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            gap: sidebarOpen ? 2 : 0,
            boxSizing: 'border-box'
          }}>
            {/* Hamburger Menu Button */}
            <IconButton
              onClick={toggleSidebar}
              sx={{
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <MenuIcon />
            </IconButton>

            {/* Sportea Heading - Only show when sidebar is open */}
            {sidebarOpen && (
              <Typography
                variant="h2"
                component="div"
                color="primary"
                sx={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 700,
                  fontSize: '1.5rem'
                }}
              >
                Sportea
              </Typography>
            )}
          </Box>

          <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <List>
              {navItems.map((item) => (
                <ListItem key={item.name} disablePadding>
                  <ListItemButton
                    selected={location.pathname.startsWith(item.path)}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      minHeight: 48,
                      justifyContent: sidebarOpen ? 'initial' : 'center',
                      px: 2.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.lighter',
                        '&:hover': {
                          bgcolor: 'primary.light',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: sidebarOpen ? 3 : 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {sidebarOpen && <ListItemText primary={item.name} />}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ flexGrow: 1 }} />
            
            <Divider />
            <Box sx={{
              p: sidebarOpen ? 2 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'flex-start' : 'center'
            }}>
              <Avatar
                src={user?.user_metadata?.avatar_url}
                sx={{
                  mr: sidebarOpen ? 2 : 0,
                  bgcolor: 'primary.main',
                  width: sidebarOpen ? 40 : 32,
                  height: sidebarOpen ? 40 : 32
                }}
              >
                {user?.user_metadata?.username?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </Avatar>
              {sidebarOpen && (
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                  <Typography variant="subtitle2" noWrap>
                    {user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {user?.email}
                  </Typography>
                </Box>
              )}
            </Box>
            <ListItem disablePadding>
              <ListItemButton
                onClick={handleSignOut}
                sx={{
                  minHeight: 48,
                  justifyContent: sidebarOpen ? 'initial' : 'center',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: sidebarOpen ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <LogoutIcon color="error" />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Sign Out" sx={{ color: 'error.main' }} />}
              </ListItemButton>
            </ListItem>
          </Box>
        </Drawer>
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            xs: '100%',
            md: `calc(100% - ${sidebarOpen ? drawerWidth : collapsedWidth}px)`
          },
          pt: { xs: 8, sm: 9 }, // Adjust for the app bar height
          pb: isMobile ? 8 : 2, // Adjust for the bottom navigation on mobile
          bgcolor: 'background.light',
          transition: 'width 0.3s ease'
        }}
      >
        <Outlet />
      </Box>
      
      {isMobile && <BottomNavigation />}
    </Box>
  );
};

export default MainLayout;
