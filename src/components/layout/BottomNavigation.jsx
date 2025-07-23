import React from 'react';
import { Box, Paper, BottomNavigation as MuiBottomNavigation, BottomNavigationAction, Badge, Avatar } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuth } from '../../hooks/useAuth';
import { UserAvatarWithLevel } from '../achievements';

const BottomNavigation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = React.useState(getActiveTab(location.pathname));
  
  // Determine the active tab based on current route
  function getActiveTab(pathname) {
    if (pathname === '/home' || pathname === '/') return 0;
    if (pathname.startsWith('/find')) return 1;
    if (pathname.startsWith('/host')) return 2;
    if (pathname.startsWith('/friends')) return 3;
    if (pathname.startsWith('/leaderboard')) return 4;
    if (pathname.startsWith('/profile')) return 5;
    return 0; // Default to home
  }
  
  // Update the active tab when the route changes
  React.useEffect(() => {
    setValue(getActiveTab(location.pathname));
  }, [location.pathname]);
  
  const handleChange = (event, newValue) => {
    setValue(newValue);

    // Navigate to the appropriate route
    switch (newValue) {
      case 0:
        navigate('/home');
        break;
      case 1:
        navigate('/find');
        break;
      case 2:
        navigate('/host');
        break;
      case 3:
        navigate('/friends');
        break;
      case 4:
        navigate('/leaderboard');
        break;
      case 5:
        navigate('/profile');
        break;
      default:
        navigate('/home');
    }
  };
  
  // Mock new matches notification count
  const newMatchesCount = 3;
  
  return (
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }}>
      <Paper elevation={3} sx={{ borderRadius: '16px 16px 0 0' }}>
        <MuiBottomNavigation
          showLabels
          value={value}
          onChange={handleChange}
          sx={{
            height: 64,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              py: 1,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
          }}
        >
          <BottomNavigationAction 
            label="Home" 
            icon={<HomeIcon />} 
          />
          <BottomNavigationAction 
            label="Find" 
            icon={
              <Badge badgeContent={newMatchesCount} color="error" max={9}>
                <SearchIcon />
              </Badge>
            } 
          />
          <BottomNavigationAction 
            label="Host" 
            icon={
              <AddCircleIcon 
                sx={{ 
                  fontSize: 32, 
                  color: 'primary.main',
                  filter: 'drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.1))'
                }} 
              />
            } 
            sx={{
              '& .MuiBottomNavigationAction-label': {
                color: 'primary.main',
                fontWeight: 500,
              },
            }}
          />
          <BottomNavigationAction
            label="Friends"
            icon={<PeopleIcon />}
          />
          <BottomNavigationAction
            label="Leaderboard"
            icon={
              <EmojiEventsIcon
                sx={{
                  fontSize: 28,
                  color: value === 4 ? 'primary.main' : 'text.secondary'
                }}
              />
            }
          />
          <BottomNavigationAction
            label="Profile"
            icon={
              <UserAvatarWithLevel
                user={{
                  avatar_url: user?.user_metadata?.avatar_url,
                  full_name: user?.user_metadata?.username || user?.user_metadata?.full_name,
                  level: user?.level || 1
                }}
                size={28}
                badgeSize="small"
                sx={{
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem',
                }}
              />
            }
          />
        </MuiBottomNavigation>
      </Paper>
    </Box>
  );
};

export default BottomNavigation;
