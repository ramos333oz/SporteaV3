import React, { useState, useEffect } from 'react';
import { Box, Paper, BottomNavigation as MuiBottomNavigation, BottomNavigationAction, Badge, Avatar, Fade, Zoom } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuth } from '../../hooks/useAuth';
import { UserAvatarWithLevel } from '../achievements';

const BottomNavigation = () => {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = React.useState(getActiveTab(location.pathname));
  const [userLevel, setUserLevel] = useState(1);
  const [gamificationData, setGamificationData] = useState(null);
  
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

  // Fetch user's gamification data to get actual level
  useEffect(() => {
    const fetchUserLevel = async () => {
      if (!user?.id || !supabase) return;

      try {
        const { data: gamificationData, error } = await supabase
          .from('user_gamification')
          .select('current_level, total_xp')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user gamification data:', error);
          // If no gamification data exists, create it
          if (error.code === 'PGRST116') {
            const { data: newGamificationData, error: createError } = await supabase
              .from('user_gamification')
              .insert({
                user_id: user.id,
                total_xp: 0,
                current_level: 1,
                current_streak: 0,
                longest_streak: 0,
                community_score: 0,
                weekly_xp: 0,
                monthly_xp: 0
              })
              .select()
              .single();

            if (!createError && newGamificationData) {
              setUserLevel(newGamificationData.current_level);
              setGamificationData(newGamificationData);
            }
          }
        } else if (gamificationData) {
          setUserLevel(gamificationData.current_level);
          setGamificationData(gamificationData);
        }
      } catch (error) {
        console.error('Error in fetchUserLevel:', error);
      }
    };

    fetchUserLevel();
  }, [user?.id, supabase]);
  
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
  
  // Remove hardcoded badge - should be dynamic based on actual data
  const newMatchesCount = 0; // Set to 0 to hide misleading badge
  
  return (
    <Fade in timeout={300}>
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }}>
        <Paper
          elevation={8}
          sx={{
            borderRadius: '20px 20px 0 0',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,247,245,0.95) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(155, 44, 44, 0.1)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1), 0 -1px 4px rgba(155, 44, 44, 0.1)',
          }}
        >
          <MuiBottomNavigation
            showLabels
            value={value}
            onChange={handleChange}
            sx={{
              height: 72,
              background: 'transparent',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 'auto',
                py: 1.5,
                px: 0.5,
                color: 'text.secondary',
                borderRadius: 2,
                margin: '4px 2px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&.Mui-selected': {
                  color: 'primary.main',
                  backgroundColor: 'rgba(155, 44, 44, 0.08)',
                  transform: 'translateY(-2px)',
                  '& .MuiBottomNavigationAction-label': {
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transform: 'scale(1.05)',
                  },
                  '& .MuiSvgIcon-root': {
                    transform: 'scale(1.1)',
                  },
                },
                '&:hover:not(.Mui-selected)': {
                  backgroundColor: 'rgba(155, 44, 44, 0.04)',
                  transform: 'translateY(-1px)',
                },
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  marginTop: '4px',
                  transition: 'all 0.2s ease',
                },
                '& .MuiSvgIcon-root': {
                  fontSize: '1.4rem',
                  transition: 'all 0.2s ease',
                },
              },
            }}
          >
          <Zoom in timeout={200}>
            <BottomNavigationAction
              label="Home"
              icon={<HomeIcon />}
            />
          </Zoom>
          <Zoom in timeout={250}>
            <BottomNavigationAction
              label="Find"
              icon={
                newMatchesCount > 0 ? (
                  <Badge
                    badgeContent={newMatchesCount}
                    color="error"
                    max={9}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.65rem',
                        minWidth: '16px',
                        height: '16px',
                        backgroundColor: '#d32f2f',
                        color: 'white',
                        fontWeight: 600,
                      }
                    }}
                  >
                    <SearchIcon />
                  </Badge>
                ) : (
                  <SearchIcon />
                )
              }
            />
          </Zoom>
          <Zoom in timeout={300}>
            <BottomNavigationAction
              label="Host"
              icon={
                <AddCircleIcon
                  sx={{
                    fontSize: '2rem',
                    color: value === 2 ? 'primary.main' : 'primary.main',
                    filter: 'drop-shadow(0px 2px 4px rgba(155, 44, 44, 0.3))',
                    transition: 'all 0.2s ease',
                  }}
                />
              }
              sx={{
                '& .MuiBottomNavigationAction-label': {
                  color: 'primary.main',
                  fontWeight: 600,
                },
                '&.Mui-selected': {
                  '& .MuiBottomNavigationAction-label': {
                    color: 'primary.main',
                  },
                },
              }}
            />
          </Zoom>
          <Zoom in timeout={350}>
            <BottomNavigationAction
              label="Friends"
              icon={<PeopleIcon />}
            />
          </Zoom>
          <Zoom in timeout={400}>
            <BottomNavigationAction
              label="Leaderboard"
              icon={
                <EmojiEventsIcon
                  sx={{
                    fontSize: '1.5rem',
                    color: value === 4 ? 'primary.main' : 'text.secondary',
                    transition: 'all 0.2s ease',
                  }}
                />
              }
            />
          </Zoom>
          <Zoom in timeout={450}>
            <BottomNavigationAction
              label="Profile"
              icon={
                <UserAvatarWithLevel
                  user={{
                    avatar_url: user?.user_metadata?.avatar_url,
                    full_name: user?.user_metadata?.username || user?.user_metadata?.full_name,
                    level: userLevel
                  }}
                  size={24}
                  badgeSize="small"
                  sx={{
                    bgcolor: 'primary.main',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease',
                  }}
                />
              }
            />
          </Zoom>
          </MuiBottomNavigation>
        </Paper>
      </Box>
    </Fade>
  );
};

export default BottomNavigation;
