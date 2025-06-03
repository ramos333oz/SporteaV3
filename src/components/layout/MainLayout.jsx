import React from 'react';
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
import LogoutIcon from '@mui/icons-material/Logout';
import BottomNavigation from './BottomNavigation';
import NotificationList from '../notifications/NotificationList';
import { useAuth } from '../../hooks/useAuth';

const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  // Real-time notifications are handled by the NotificationList component
  
  // Sidebar width for desktop view
  const drawerWidth = 240;
  
  // Navigation items
  const navItems = [
    { name: 'Home', icon: <HomeIcon />, path: '/home' },
    { name: 'Find', icon: <SearchIcon />, path: '/find' },
    { name: 'Host', icon: <AddCircleIcon color="primary" />, path: '/host' },
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
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <Typography 
            variant="h2" 
            component="div" 
            color="primary"
            sx={{ flexGrow: 1 }}
          >
            Sportea
          </Typography>
          <NotificationList />
        </Toolbar>
      </AppBar>
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            },
          }}
        >
          <Toolbar /> {/* Empty toolbar for spacing */}
          <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <List>
              {navItems.map((item) => (
                <ListItem key={item.name} disablePadding>
                  <ListItemButton 
                    selected={location.pathname.startsWith(item.path)}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: 'primary.lighter',
                        '&:hover': {
                          bgcolor: 'primary.light',
                        },
                      },
                    }}
                  >
                    <ListItemIcon>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ flexGrow: 1 }} />
            
            <Divider />
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
              <Avatar 
                src={user?.user_metadata?.avatar_url}
                sx={{ mr: 2, bgcolor: 'primary.main' }}
              >
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <Typography variant="subtitle2" noWrap>
                  {user?.user_metadata?.full_name || user?.email}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user?.email}
                </Typography>
              </Box>
            </Box>
            <ListItem disablePadding>
              <ListItemButton onClick={handleSignOut}>
                <ListItemIcon>
                  <LogoutIcon color="error" />
                </ListItemIcon>
                <ListItemText primary="Sign Out" sx={{ color: 'error.main' }} />
              </ListItemButton>
            </ListItem>
          </Box>
        </Drawer>
      )}
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          pt: { xs: 8, sm: 9 }, // Adjust for the app bar height
          pb: isMobile ? 8 : 2, // Adjust for the bottom navigation on mobile
          bgcolor: 'background.light'
        }}
      >
        <Outlet />
      </Box>
      
      {isMobile && <BottomNavigation />}
    </Box>
  );
};

export default MainLayout;
