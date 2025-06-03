import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Button,
  Chip,
  Skeleton,
  Divider,
  Rating
} from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../../hooks/useAuth';

const FindPlayers = ({ searchQuery }) => {
  const { supabase } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSportFilter, setSelectedSportFilter] = useState('all');
  
  // Mock data for sports filters
  const sportFilters = [
    { id: 'all', name: 'All Sports' },
    { id: 'football', name: 'Football', icon: <SportsSoccerIcon /> },
    { id: 'basketball', name: 'Basketball', icon: <SportsBasketballIcon /> },
    { id: 'badminton', name: 'Badminton', icon: <SportsTennisIcon /> },
    { id: 'volleyball', name: 'Volleyball', icon: <SportsVolleyballIcon /> },
  ];
  
  // Mock player data (will be replaced with real data from Supabase)
  const mockPlayers = [
    {
      id: 1,
      name: 'Ahmad Zulkifli',
      studentId: '2021123456',
      avatar: null,
      rating: 4.5,
      bio: 'Football enthusiast looking for weekend matches. Prefer playing as a striker but can adapt to any position.',
      sports: [
        { name: 'football', level: 'Professional', icon: <SportsSoccerIcon /> },
        { name: 'basketball', level: 'Intermediate', icon: <SportsBasketballIcon /> }
      ],
      mutual_friends: 3,
      achievements: 5
    },
    {
      id: 2,
      name: 'Sarah Tan',
      studentId: '2020654321',
      avatar: null,
      rating: 4.2,
      bio: 'Basketball player with 5 years of experience. Looking for training partners to improve skills.',
      sports: [
        { name: 'basketball', level: 'Professional', icon: <SportsBasketballIcon /> },
        { name: 'volleyball', level: 'Beginner', icon: <SportsVolleyballIcon /> }
      ],
      mutual_friends: 0,
      achievements: 7
    },
    {
      id: 3,
      name: 'Raj Kumar',
      studentId: '2021987654',
      avatar: null,
      rating: 3.8,
      bio: 'Badminton player looking for doubles partner. Also enjoy casual football on weekends.',
      sports: [
        { name: 'badminton', level: 'Professional', icon: <SportsTennisIcon /> },
        { name: 'football', level: 'Intermediate', icon: <SportsSoccerIcon /> }
      ],
      mutual_friends: 1,
      achievements: 3
    },
    {
      id: 4,
      name: 'Lisa Wong',
      studentId: '2022112233',
      avatar: null,
      rating: 4.7,
      bio: 'Volleyball team captain looking for new players to join training sessions.',
      sports: [
        { name: 'volleyball', level: 'Professional', icon: <SportsVolleyballIcon /> }
      ],
      mutual_friends: 2,
      achievements: 9
    },
    {
      id: 5,
      name: 'Haziq Jalil',
      studentId: '2020445566',
      avatar: null,
      rating: 4.0,
      bio: 'Sports science student interested in football, basketball and badminton.',
      sports: [
        { name: 'football', level: 'Intermediate', icon: <SportsSoccerIcon /> },
        { name: 'basketball', level: 'Beginner', icon: <SportsBasketballIcon /> },
        { name: 'badminton', level: 'Intermediate', icon: <SportsTennisIcon /> }
      ],
      mutual_friends: 5,
      achievements: 4
    }
  ];
  
  useEffect(() => {
    // Simulate fetching players from Supabase
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        // In a real implementation, we would fetch players from Supabase here
        // const { data, error } = await supabase
        //   .from('profiles')
        //   .select('*')
        //   .order('rating', { ascending: false });
        
        // For now, use mock data
        setTimeout(() => {
          // Filter players based on search query if provided
          let filteredPlayers = [...mockPlayers];
          
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredPlayers = filteredPlayers.filter(player => 
              player.name.toLowerCase().includes(query) || 
              player.bio.toLowerCase().includes(query) ||
              player.studentId.includes(query) ||
              player.sports.some(sport => sport.name.toLowerCase().includes(query))
            );
          }
          
          // Filter by selected sport if not 'all'
          if (selectedSportFilter !== 'all') {
            filteredPlayers = filteredPlayers.filter(player => 
              player.sports.some(sport => sport.name === selectedSportFilter)
            );
          }
          
          setPlayers(filteredPlayers);
          setLoading(false);
        }, 1000); // Simulate network delay
      } catch (error) {
        console.error('Error fetching players:', error);
        setLoading(false);
      }
    };
    
    fetchPlayers();
  }, [searchQuery, selectedSportFilter]);
  
  const handleSportFilterChange = (sportId) => {
    setSelectedSportFilter(sportId);
  };
  
  // Render player card
  const renderPlayerCard = (player) => {
    return (
      <Card 
        elevation={2} 
        sx={{ 
          borderRadius: 3,
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4
          },
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar 
              sx={{ 
                width: 56, 
                height: 56, 
                bgcolor: 'primary.main',
                fontSize: '1.5rem',
                mr: 2
              }}
            >
              {player.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h3" component="h3" gutterBottom>
                {player.name}
              </Typography>
              <Rating 
                value={player.rating} 
                precision={0.5} 
                size="small" 
                readOnly 
              />
            </Box>
          </Box>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              height: '54px' // Approximately 3 lines
            }}
          >
            {player.bio}
          </Typography>
          
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            Preferred Sports:
          </Typography>
          <Box 
            sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1,
              mb: 2
            }}
          >
            {player.sports.map((sport, index) => (
              <Chip
                key={index}
                icon={sport.icon}
                label={`${sport.name.charAt(0).toUpperCase() + sport.name.slice(1)} (${sport.level})`}
                size="small"
                color={
                  sport.level === 'Professional' ? 'primary' : 
                  sport.level === 'Intermediate' ? 'info' : 
                  'success'
                }
                variant={sport.level === 'Professional' ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PeopleIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                {player.mutual_friends} mutual {player.mutual_friends === 1 ? 'friend' : 'friends'}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {player.achievements} {player.achievements === 1 ? 'achievement' : 'achievements'}
            </Typography>
          </Box>
        </CardContent>
        
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button 
            variant="outlined" 
            color="primary"
            sx={{ borderRadius: 2, mr: 1 }}
            fullWidth
          >
            View Profile
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            sx={{ borderRadius: 2 }}
            fullWidth
          >
            Add Friend
          </Button>
        </CardActions>
      </Card>
    );
  };
  
  return (
    <Box>
      {/* Sport Filters */}
      <Box 
        sx={{ 
          display: 'flex', 
          overflowX: 'auto', 
          pb: 1, 
          mb: 3,
          '&::-webkit-scrollbar': {
            height: 6
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'divider',
            borderRadius: 3
          }
        }}
      >
        {sportFilters.map((sport) => (
          <Chip
            key={sport.id}
            icon={sport.icon}
            label={sport.name}
            color={selectedSportFilter === sport.id ? 'primary' : 'default'}
            variant={selectedSportFilter === sport.id ? 'filled' : 'outlined'}
            onClick={() => handleSportFilterChange(sport.id)}
            sx={{ 
              mr: 1, 
              p: 0.5,
              '&:last-child': { mr: 0 }
            }}
          />
        ))}
      </Box>
      
      {/* Players Section */}
      <Box>
        <Typography variant="h2" gutterBottom>
          Players ({players.length})
        </Typography>
        {loading ? (
          <Grid container spacing={2}>
            {Array(4).fill().map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
                <Skeleton 
                  variant="rectangular" 
                  height={300} 
                  sx={{ borderRadius: 3 }} 
                />
              </Grid>
            ))}
          </Grid>
        ) : players.length === 0 ? (
          <Paper 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: 3
            }}
          >
            <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h3" gutterBottom>
              No players found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Try adjusting your filters or complete your profile to match with more players!
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
            >
              Update Profile
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {players.map(player => (
              <Grid item xs={12} sm={6} md={4} key={player.id}>
                {renderPlayerCard(player)}
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default FindPlayers;
