import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Chip, 
  Divider, 
  Avatar,
  Grid,
  Stack,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  SportsSoccer as SportIcon,
  CancelOutlined as CancelIcon,
  Edit as EditIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { matchService } from '../services/supabase';

const MatchDetail = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribeToMatch } = useRealtime();
  
  const [match, setMatch] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userParticipation, setUserParticipation] = useState(null);
  
  // Check if match is full
  const isMatchFull = match?.participants_count >= match?.max_participants;
  
  // Check if user is host
  const isHost = match?.host_id === user?.id;
  
  // Format match date and time
  const formatMatchDate = (date) => {
    return date ? format(new Date(date), 'EEEE, MMMM d, yyyy') : '';
  };
  
  const formatMatchTime = (date) => {
    return date ? format(new Date(date), 'h:mm a') : '';
  };
  
  // Join match handler
  const handleJoinMatch = async () => {
    try {
      await matchService.joinMatch(matchId, user.id);
      // Update will come through real-time subscription
    } catch (error) {
      setError('Failed to join the match. Please try again.');
      console.error('Error joining match:', error);
    }
  };
  
  // Leave match handler
  const handleLeaveMatch = async () => {
    try {
      await matchService.leaveMatch(matchId, user.id);
      // Update will come through real-time subscription
    } catch (error) {
      setError('Failed to leave the match. Please try again.');
      console.error('Error leaving match:', error);
    }
  };
  
  // Edit match handler (redirects to edit page)
  const handleEditMatch = () => {
    navigate(`/edit-match/${matchId}`);
  };
  
  // Cancel match handler
  const handleCancelMatch = async () => {
    if (window.confirm('Are you sure you want to cancel this match? This action cannot be undone.')) {
      try {
        await matchService.cancelMatch(matchId);
        // Update will come through real-time subscription
      } catch (error) {
        setError('Failed to cancel the match. Please try again.');
        console.error('Error canceling match:', error);
      }
    }
  };
  
  // Share match handler
  const handleShareMatch = () => {
    if (navigator.share) {
      navigator.share({
        title: `${match.sport.name} match on Sportea`,
        text: `Join me for a ${match.sport.name} match on ${formatMatchDate(match.date)} at ${formatMatchTime(match.date)}`,
        url: window.location.href
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Match link copied to clipboard!');
    }
  };
  
  // Real-time update handler for match
  const handleMatchUpdate = (payload) => {
    if (payload.new) {
      setMatch(payload.new);
    }
  };
  
  // Real-time update handler for participants
  const handleParticipantsUpdate = (payload) => {
    // Fetch all participants again to get the latest state
    fetchParticipants();
    
    // Check if update involves current user
    if (payload.new?.user_id === user?.id) {
      setUserParticipation(payload.new);
    }
  };
  
  // Fetch match data
  const fetchMatch = async () => {
    try {
      const data = await matchService.getMatchById(matchId);
      if (!data) {
        setError('Match not found');
        return;
      }
      setMatch(data);
    } catch (error) {
      setError('Failed to load match details. Please try again.');
      console.error('Error fetching match:', error);
    }
  };
  
  // Fetch participants
  const fetchParticipants = async () => {
    try {
      const data = await matchService.getMatchParticipants(matchId);
      setParticipants(data);
      
      // Check if current user is a participant
      const userParticipant = data.find(p => p.user_id === user?.id);
      setUserParticipation(userParticipant);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data on mount
  useEffect(() => {
    if (matchId && user) {
      fetchMatch();
      fetchParticipants();
    }
  }, [matchId, user]);
  
  // Set up real-time subscriptions
  useEffect(() => {
    if (matchId) {
      // Subscribe to match updates
      const matchSubscription = subscribeToMatch(matchId, handleMatchUpdate);
      
      // Subscribe to participants updates for this match
      const participantsSubscription = subscribeToMatch(
        matchId, 
        handleParticipantsUpdate,
        'participants'
      );
      
      // Cleanup subscriptions on unmount
      return () => {
        // Cleanup is handled by the useRealtime hook internally
      };
    }
  }, [matchId, subscribeToMatch]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/home')} 
          sx={{ mt: 2 }}
        >
          Back to Home
        </Button>
      </Box>
    );
  }
  
  if (!match) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Match not found.</Alert>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/home')} 
          sx={{ mt: 2 }}
        >
          Back to Home
        </Button>
      </Box>
    );
  }
  
  // Determine match status chip
  const getStatusChip = () => {
    if (match.status === 'cancelled') {
      return <Chip label="Cancelled" color="error" />;
    } else if (match.status === 'completed') {
      return <Chip label="Completed" color="default" />;
    } else if (isMatchFull) {
      return <Chip label="Full" color="secondary" />;
    } else {
      return <Chip label="Open" color="success" />;
    }
  };
  
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h2">{match.sport.name} Match</Typography>
          {getStatusChip()}
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography>{formatMatchDate(match.date)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography>{formatMatchTime(match.date)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocationIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography>{match.location.name}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SportIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography>Skill Level: {match.skill_level}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography>
                  {match.participants_count} / {match.max_participants} participants
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography>Hosted by: {match.host?.full_name || 'Unknown'}</Typography>
              </Box>
            </Stack>
            
            {match.description && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h3" gutterBottom>Description</Typography>
                <Typography>{match.description}</Typography>
              </Box>
            )}
            
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h3">Participants</Typography>
                <Typography>
                  {match.participants_count}/{match.max_participants}
                </Typography>
              </Box>
              
              <List>
                {participants.map((participant) => (
                  <ListItem key={participant.id}>
                    <ListItemAvatar>
                      <Avatar src={participant.user?.avatar_url}>
                        {participant.user?.full_name?.charAt(0) || 'U'}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={participant.user?.full_name} 
                      secondary={participant.user_id === match.host_id ? 'Host' : 'Participant'}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h3" gutterBottom>Actions</Typography>
              
              {match.status !== 'cancelled' && match.status !== 'completed' && (
                <Stack spacing={2}>
                  {isHost ? (
                    <>
                      <Button 
                        variant="contained" 
                        startIcon={<EditIcon />}
                        onClick={handleEditMatch}
                        fullWidth
                      >
                        Edit Match
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={handleCancelMatch}
                        fullWidth
                      >
                        Cancel Match
                      </Button>
                    </>
                  ) : userParticipation ? (
                    <Button 
                      variant="outlined" 
                      color="error"
                      onClick={handleLeaveMatch}
                      fullWidth
                    >
                      Leave Match
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      onClick={handleJoinMatch}
                      disabled={isMatchFull}
                      fullWidth
                    >
                      {isMatchFull ? 'Match is Full' : 'Join Match'}
                    </Button>
                  )}
                  
                  <Button 
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={handleShareMatch}
                    fullWidth
                  >
                    Share Match
                  </Button>
                </Stack>
              )}
              
              {match.status === 'cancelled' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This match has been cancelled.
                </Alert>
              )}
              
              {match.status === 'completed' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  This match has been completed.
                </Alert>
              )}
              
              <Button 
                variant="text" 
                onClick={() => navigate('/home')} 
                sx={{ mt: 2 }}
                fullWidth
              >
                Back to Home
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default MatchDetail;
