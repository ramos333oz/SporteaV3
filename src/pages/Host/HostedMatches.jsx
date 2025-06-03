import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Divider,
  IconButton,
  Badge,
  Avatar,
  AvatarGroup,
  Skeleton,
  Menu,
  MenuItem
} from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

const HostedMatches = () => {
  const { user, supabase } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Mock data for hosted matches (will be replaced with real data from Supabase)
  const mockMatches = [
    {
      id: 101,
      title: 'Friday Evening Football',
      sport: 'football',
      sportIcon: <SportsSoccerIcon />,
      location: 'Padang Pusat Sukan A',
      dateTime: '2025-06-06T18:00:00',
      currentParticipants: 14,
      maxParticipants: 22,
      status: 'upcoming',
      participantRequests: 3,
      participants: [
        { id: 1, name: 'User 1', avatar: null },
        { id: 2, name: 'User 2', avatar: null },
        { id: 3, name: 'User 3', avatar: null }
      ]
    },
    {
      id: 102,
      title: 'Basketball Practice',
      sport: 'basketball',
      sportIcon: <SportsBasketballIcon />,
      location: 'Court Pusat Sukan B',
      dateTime: '2025-06-10T16:30:00',
      currentParticipants: 8,
      maxParticipants: 15,
      status: 'upcoming',
      participantRequests: 0,
      participants: [
        { id: 4, name: 'User 4', avatar: null },
        { id: 5, name: 'User 5', avatar: null }
      ]
    },
    {
      id: 103,
      title: 'Badminton Doubles',
      sport: 'badminton',
      sportIcon: <SportsTennisIcon />,
      location: 'Court Pusat Sukan C',
      dateTime: '2025-05-20T14:00:00',
      currentParticipants: 6,
      maxParticipants: 8,
      status: 'completed',
      participantRequests: 0,
      participants: [
        { id: 6, name: 'User 6', avatar: null },
        { id: 7, name: 'User 7', avatar: null },
        { id: 8, name: 'User 8', avatar: null }
      ]
    },
    {
      id: 104,
      title: 'Football Tournament',
      sport: 'football',
      sportIcon: <SportsSoccerIcon />,
      location: 'Padang Pusat Sukan A',
      dateTime: '2025-05-15T17:00:00',
      currentParticipants: 18,
      maxParticipants: 22,
      status: 'cancelled',
      participantRequests: 0,
      participants: []
    }
  ];
  
  useEffect(() => {
    // Simulate fetching hosted matches from Supabase
    const fetchHostedMatches = async () => {
      setLoading(true);
      try {
        // In a real implementation, we would fetch matches from Supabase here
        // const { data, error } = await supabase
        //   .from('matches')
        //   .select('*')
        //   .eq('host_id', user.id)
        //   .order('created_at', { ascending: false });
        
        // For now, use mock data
        setTimeout(() => {
          let filteredMatches;
          
          // Filter based on selected tab
          if (tabValue === 0) { // Upcoming
            filteredMatches = mockMatches.filter(match => match.status === 'upcoming');
          } else if (tabValue === 1) { // Past
            filteredMatches = mockMatches.filter(match => match.status === 'completed');
          } else { // Cancelled
            filteredMatches = mockMatches.filter(match => match.status === 'cancelled');
          }
          
          setMatches(filteredMatches);
          setLoading(false);
        }, 1000); // Simulate network delay
      } catch (error) {
        console.error('Error fetching hosted matches:', error);
        setLoading(false);
      }
    };
    
    fetchHostedMatches();
  }, [tabValue]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleMenuOpen = (event, match) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedMatch(match);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleEditMatch = () => {
    console.log('Edit match:', selectedMatch);
    handleMenuClose();
    // Logic to edit match will be implemented later
  };
  
  const handleCancelMatch = () => {
    console.log('Cancel match:', selectedMatch);
    handleMenuClose();
    // Logic to cancel match will be implemented later
  };
  
  const handleViewParticipants = () => {
    console.log('View participants for match:', selectedMatch);
    handleMenuClose();
    // Logic to view participants will be implemented later
  };
  
  // Format date and time
  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return {
      date: format(date, 'EEE, MMM d'),
      time: format(date, 'h:mm a')
    };
  };
  
  // Render match card
  const renderMatchCard = (match) => {
    const { date, time } = formatDateTime(match.dateTime);
    
    return (
      <Card 
        elevation={2} 
        sx={{ 
          borderRadius: 2,
          mb: 2,
          borderLeft: 4,
          borderColor: 
            match.status === 'upcoming' ? 'primary.main' :
            match.status === 'completed' ? 'success.main' : 'error.main'
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Chip 
                icon={match.sportIcon}
                label={match.sport.charAt(0).toUpperCase() + match.sport.slice(1)}
                color="primary"
                size="small"
                sx={{ mr: 1 }}
              />
              {match.participantRequests > 0 && (
                <Badge badgeContent={match.participantRequests} color="error">
                  <Chip 
                    label="Requests"
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                </Badge>
              )}
            </Box>
            
            <IconButton
              aria-label="more"
              onClick={(e) => handleMenuOpen(e, match)}
              size="small"
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
          
          <Typography variant="h3" component="h3" gutterBottom>
            {match.title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LocationOnIcon fontSize="small" color="action" sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {match.location}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <AccessTimeIcon fontSize="small" color="action" sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {date}, {time}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <PersonIcon fontSize="small" color="action" sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {match.currentParticipants}/{match.maxParticipants} participants
            </Typography>
          </Box>
          
          {match.participants.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Participants:
              </Typography>
              <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                {match.participants.map(participant => (
                  <Avatar key={participant.id} alt={participant.name}>
                    {participant.name.charAt(0)}
                  </Avatar>
                ))}
              </AvatarGroup>
            </Box>
          )}
        </CardContent>
        
        <CardActions sx={{ px: 2, pb: 2 }}>
          {match.status === 'upcoming' && (
            <>
              <Button 
                size="small" 
                variant="outlined"
                onClick={handleViewParticipants}
              >
                View Participants
              </Button>
              <Button 
                size="small" 
                variant="contained"
                onClick={handleEditMatch}
              >
                Edit Match
              </Button>
            </>
          )}
          {match.status === 'completed' && (
            <Button 
              size="small" 
              variant="outlined"
              onClick={handleViewParticipants}
            >
              Match Summary
            </Button>
          )}
          {match.status === 'cancelled' && (
            <Button 
              size="small" 
              variant="outlined"
              color="primary"
              onClick={handleEditMatch}
            >
              Restore Match
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };
  
  return (
    <Box>
      <Typography variant="h2" component="h2" gutterBottom>
        Your Hosted Matches
      </Typography>
      
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Upcoming" />
          <Tab label="Past" />
          <Tab label="Cancelled" />
        </Tabs>
      </Paper>
      
      {loading ? (
        // Loading skeletons
        Array(3).fill().map((_, index) => (
          <Skeleton 
            key={`skeleton-${index}`}
            variant="rectangular" 
            height={160} 
            sx={{ borderRadius: 2, mb: 2 }} 
          />
        ))
      ) : matches.length === 0 ? (
        // No matches found
        <Paper 
          sx={{ 
            p: 3, 
            textAlign: 'center',
            borderRadius: 2
          }}
        >
          <Typography variant="h3" gutterBottom>
            No {tabValue === 0 ? 'upcoming' : tabValue === 1 ? 'past' : 'cancelled'} matches
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {tabValue === 0 
              ? "You don't have any upcoming matches. Create a new match to get started!" 
              : tabValue === 1 
                ? "You haven't hosted any matches yet."
                : "You don't have any cancelled matches."}
          </Typography>
        </Paper>
      ) : (
        // Match list
        <List disablePadding>
          {matches.map(match => (
            <ListItem key={match.id} disablePadding sx={{ display: 'block', mb: 2 }}>
              {renderMatchCard(match)}
            </ListItem>
          ))}
        </List>
      )}
      
      {/* Match options menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {selectedMatch?.status === 'upcoming' && (
          <MenuItem onClick={handleEditMatch}>Edit Match</MenuItem>
        )}
        {selectedMatch?.status === 'upcoming' && (
          <MenuItem onClick={handleCancelMatch}>Cancel Match</MenuItem>
        )}
        <MenuItem onClick={handleViewParticipants}>
          {selectedMatch?.status === 'completed' ? 'View Summary' : 'View Participants'}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default HostedMatches;
