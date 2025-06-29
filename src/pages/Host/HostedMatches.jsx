import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { matchService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';

const HostedMatches = () => {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const { showSuccessToast, showErrorToast } = useToast();
  const [tabValue, setTabValue] = useState(0);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const open = Boolean(menuAnchorEl);
  
  // Mock data for hosted matches (will be replaced with real data from Supabase)
  // Helper function to get sport icon based on sport name
  const getSportIcon = (sportName) => {
    if (!sportName) return <SportsSoccerIcon />;
    
    const sportNameLower = sportName.toLowerCase();
    if (sportNameLower.includes('football') || sportNameLower.includes('soccer') || sportNameLower.includes('futsal')) {
      return <SportsSoccerIcon />;
    } else if (sportNameLower.includes('basketball')) {
      return <SportsBasketballIcon />;
    } else if (sportNameLower.includes('tennis') || sportNameLower.includes('badminton')) {
      return <SportsTennisIcon />;
    }
    
    return <SportsSoccerIcon />; // Default
  };

  // Define fetchHostedMatches outside of useEffect so it can be called from handlers
  const fetchHostedMatches = async () => {
    setLoading(true);
    try {
      const matchStatus = tabValue === 0 ? 'upcoming' : tabValue === 1 ? 'completed' : 'cancelled';
      
      // Handle automatic categorization of past matches
      if (matchStatus === 'upcoming') {
        // First, get all upcoming matches
        const { data: upcomingMatches, error: upcomingError } = await supabase
          .from('matches')
          .select(`
            *,
            sport:sports(*),
            location:locations(*),
            participants(count)
          `)
          .eq('host_id', user.id)
          .eq('status', 'upcoming')
          .order('start_time', { ascending: true });
        
        if (upcomingError) {
          throw upcomingError;
        }
        
        // Check if any "upcoming" matches are actually in the past
        const now = new Date();
        const pastMatches = upcomingMatches.filter(match => new Date(match.start_time) < now);
        
        // If we found past matches that are still marked as "upcoming", update them to "completed"
        if (pastMatches.length > 0) {
          // Update status in database
          for (const match of pastMatches) {
            await supabase
              .from('matches')
              .update({ status: 'completed' })
              .eq('id', match.id);
          }
        }
      }
      
      // Now get the matches with the current tab status (which may have just been updated)
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          sport:sports(*),
          location:locations(*),
          participants(count)
        `)
        .eq('host_id', user.id)
        .eq('status', matchStatus)
        .order('start_time', { ascending: matchStatus === 'upcoming' });
      
      if (error) {
        throw error;
      }
      
      // Map Supabase data to component's expected format
      const formattedMatches = data.map(match => ({
        id: match.id,
        title: match.title,
        sport: match.sport?.name?.toLowerCase() || 'unknown',
        sportIcon: getSportIcon(match.sport?.name),
        location: match.location?.name || 'Unknown location',
        dateTime: match.start_time,
        currentParticipants: match.participants?.[0]?.count || 0,
        maxParticipants: match.max_participants,
        status: match.status,
        participantRequests: 0, // This would need another query to get pending requests
        participants: [] // This would need another query to get participant details
      }));
      
      setMatches(formattedMatches);
    } catch (error) {
      console.error('Error fetching hosted matches:', error);
      showErrorToast('Error', 'Failed to load your matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch hosted matches when component mounts or tab changes
    fetchHostedMatches();
  }, [tabValue, user.id]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleMenuOpen = (event, match) => {
    console.log('handleMenuOpen called with:', { event: event.type, match });
    setMenuAnchorEl(event.currentTarget);
    setSelectedMatch(match);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleEditMatch = (matchFromButton = null) => {
    // Use the match passed from button click, or fall back to selectedMatch from menu
    const matchToEdit = matchFromButton || selectedMatch;
    console.log('Edit match:', matchToEdit);

    // Safety check - ensure we have a valid match object
    if (!matchToEdit || !matchToEdit.id) {
      console.error('No valid match object found for editing');
      showErrorToast('Error', 'Unable to edit match. Please try again.');
      return;
    }

    // Only close menu if it was opened (selectedMatch exists)
    if (!matchFromButton) {
      handleMenuClose();
    }

    // Navigate to edit match page
    navigate(`/edit-match/${matchToEdit.id}`);
  };
  
  const handleCancelMatch = async (matchFromMenu = null) => {
    // Use the match passed from menu click, or fall back to selectedMatch
    const matchToCancel = matchFromMenu || selectedMatch;
    console.log('Cancel match:', matchToCancel);

    // Safety check - ensure we have a valid match object
    if (!matchToCancel || !matchToCancel.id) {
      console.error('No valid match object found for cancelling');
      showErrorToast('Error', 'Unable to cancel match. Please try again.');
      return;
    }

    // Only close menu if it was opened (selectedMatch exists)
    if (!matchFromMenu) {
      handleMenuClose();
    }

    if (window.confirm('Are you sure you want to cancel this match? This action cannot be undone.')) {
      try {
        const result = await matchService.cancelMatch(matchToCancel.id);

        if (result && result.error) {
          throw new Error(result.message || 'Failed to cancel the match');
        }

        showSuccessToast('Match Cancelled', 'The match has been cancelled successfully');

        // Refresh the matches list
        fetchHostedMatches();
      } catch (error) {
        console.error('Error cancelling match:', error);
        showErrorToast('Cancel Failed', error.message || 'Failed to cancel the match. Please try again.');
      }
    }
  };
  
  const handleDeleteMatch = async (matchFromMenu = null) => {
    // Use the match passed from menu click, or fall back to selectedMatch
    const matchToDelete = matchFromMenu || selectedMatch;
    console.log('Delete match:', matchToDelete);

    // Safety check - ensure we have a valid match object
    if (!matchToDelete || !matchToDelete.id) {
      console.error('No valid match object found for deleting');
      showErrorToast('Error', 'Unable to delete match. Please try again.');
      return;
    }

    // Only close menu if it was opened (selectedMatch exists)
    if (!matchFromMenu) {
      handleMenuClose();
    }

    if (window.confirm('Are you sure you want to delete this match? This action cannot be undone and all match data will be permanently deleted.')) {
      try {
        const result = await matchService.deleteMatch(matchToDelete.id);

        if (!result.success) {
          throw new Error(result.message || 'Failed to delete the match');
        }

        showSuccessToast('Match Deleted', 'The match has been permanently deleted');

        // Refresh the matches list
        fetchHostedMatches();
      } catch (error) {
        console.error('Error deleting match:', error);
        showErrorToast('Delete Failed', error.message || 'Failed to delete the match. Please try again.');
      }
    }
  };
  
  // Handle restoring a cancelled match
  const handleRestoreMatch = async (matchFromCard) => {
    // If called from card button, use that match, otherwise use the selected match from menu
    const matchToRestore = matchFromCard || selectedMatch;
    
    console.log('Restore match:', matchToRestore);
    
    // If called from menu, close it
    if (!matchFromCard) {
      handleMenuClose();
    }
    
    if (window.confirm('Are you sure you want to restore this cancelled match? This will make the match active again and notify all confirmed participants.')) {
      try {
        const result = await matchService.restoreMatch(matchToRestore.id);
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to restore the match');
        }
        
        showSuccessToast('Match Restored', 'The match has been restored successfully and confirmed participants have been notified');
        
        // Refresh the matches list
        fetchHostedMatches();
      } catch (error) {
        console.error('Error restoring match:', error);
        showErrorToast('Restore Failed', error.message || 'Failed to restore the match. Please try again.');
      }
    }
  };
  
  const handleViewParticipants = (matchFromButton = null) => {
    // Use the match passed from button click, or fall back to selectedMatch from menu
    const matchToView = matchFromButton || selectedMatch;
    console.log('View participants for match:', matchToView);

    // Safety check - ensure we have a valid match object
    if (!matchToView || !matchToView.id) {
      console.error('No valid match object found for viewing participants');
      showErrorToast('Error', 'Unable to view participants. Please try again.');
      return;
    }

    // Only close menu if it was opened (selectedMatch exists)
    if (!matchFromButton) {
      handleMenuClose();
    }

    // Navigate to match detail page
    navigate(`/match/${matchToView.id}`);
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
                onClick={() => handleViewParticipants(match)}
              >
                View Participants
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => handleEditMatch(match)}
              >
                Edit Match
              </Button>
            </>
          )}
          {match.status === 'completed' && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleViewParticipants(match)}
            >
              Match Summary
            </Button>
          )}
          {match.status === 'cancelled' && (
            <Button 
              size="small" 
              variant="outlined"
              color="primary"
              onClick={() => handleRestoreMatch(match)}
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
        open={open}
        onClose={handleMenuClose}
      >
        {selectedMatch?.status === 'upcoming' && (
          <MenuItem onClick={() => handleEditMatch(selectedMatch)}>Edit Match</MenuItem>
        )}
        {selectedMatch?.status === 'upcoming' && (
          <MenuItem onClick={() => handleCancelMatch(selectedMatch)}>Cancel Match</MenuItem>
        )}
        {selectedMatch?.status === 'cancelled' && (
          <MenuItem onClick={() => handleRestoreMatch(selectedMatch)}>Restore Match</MenuItem>
        )}
        {(selectedMatch?.status === 'cancelled' || selectedMatch?.status === 'completed') && (
          <MenuItem onClick={() => handleDeleteMatch(selectedMatch)}>Delete Match</MenuItem>
        )}
        <MenuItem onClick={() => handleViewParticipants(selectedMatch)}>
          {selectedMatch?.status === 'completed' ? 'View Summary' : 'View Participants'}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default HostedMatches;
