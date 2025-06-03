import React, { useState, useEffect, useCallback } from 'react';
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
  ListItemText,
  Tooltip,
  Card,
  CardContent
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
  Share as ShareIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  ExitToApp as LeftIcon,
  Email as InviteIcon
} from '@mui/icons-material';
import { format, formatDistance, formatDistanceToNow, isPast, isFuture, isAfter, differenceInMinutes, differenceInSeconds, intervalToDuration } from 'date-fns';

import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { matchService, participantService } from '../services/supabase';

// Match Status Indicator component
const MatchStatusIndicator = ({ match }) => {
  const [timeDisplay, setTimeDisplay] = useState('');
  const [statusInfo, setStatusInfo] = useState({ 
    text: '', 
    color: 'default', 
    icon: null, 
    progress: 0 
  });

  // Function to determine match status
  const calculateMatchStatus = useCallback(() => {
    const now = new Date();
    const startTime = match?.start_time ? new Date(match.start_time) : null;
    const endTime = match?.end_time ? new Date(match.end_time) : null;
    
    if (!startTime || !endTime) {
      return { 
        text: 'Unknown', 
        color: 'default', 
        icon: <HourglassEmpty />,
        progress: 0
      };
    }
    
    // If match is cancelled
    if (match.status === 'cancelled') {
      setTimeDisplay('Cancelled');
      return { 
        text: 'Cancelled', 
        color: 'error', 
        icon: <CancelIcon />,
        progress: 100
      };
    }
    
    // If match is completed
    if (match.status === 'completed') {
      const completedDate = endTime < now ? endTime : now;
      setTimeDisplay(`Completed ${formatDistanceToNow(completedDate, { addSuffix: true })}`);
      return { 
        text: 'Completed', 
        color: 'default', 
        icon: <CheckCircleIcon />,
        progress: 100
      };
    }
    
    // If match is in the future (upcoming)
    if (isFuture(startTime)) {
      // Calculate time remaining until start
      const duration = intervalToDuration({ start: now, end: startTime });
      const formattedDuration = Object.entries(duration)
        .filter(([key, value]) => value > 0 && ['days', 'hours', 'minutes'].includes(key))
        .map(([key, value]) => `${value} ${value === 1 ? key.slice(0, -1) : key}`)
        .slice(0, 2)
        .join(', ');
      
      setTimeDisplay(`Starts in ${formattedDuration}`);
      
      // Calculate progress (inverse - goes from 100% to 0% as we approach start time)
      const totalDuration = differenceInMinutes(endTime, startTime);
      const timeUntilStart = differenceInMinutes(startTime, now);
      const progress = Math.max(0, Math.min(100, 100 - (timeUntilStart / totalDuration * 100)));
      
      return { 
        text: 'Upcoming', 
        color: 'info', 
        icon: <CalendarIcon />,
        progress: progress
      };
    }
    
    // If match is ongoing (between start and end time)
    if (isPast(startTime) && isFuture(endTime)) {
      // Calculate elapsed time
      const elapsedDuration = intervalToDuration({ start: startTime, end: now });
      const formattedElapsed = Object.entries(elapsedDuration)
        .filter(([key, value]) => value > 0 && ['hours', 'minutes'].includes(key))
        .map(([key, value]) => `${value} ${value === 1 ? key.slice(0, -1) : key}`)
        .slice(0, 2)
        .join(', ');
      
      setTimeDisplay(`In progress: ${formattedElapsed} elapsed`);
      
      // Calculate progress
      const totalDuration = differenceInMinutes(endTime, startTime);
      const elapsed = differenceInMinutes(now, startTime);
      const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
      
      return { 
        text: 'In Progress', 
        color: 'success', 
        icon: <TimeIcon />,
        progress: progress
      };
    }
    
    // If match is in the past (finished but not marked completed)
    if (isPast(endTime)) {
      setTimeDisplay(`Ended ${formatDistanceToNow(endTime, { addSuffix: true })}`);
      return { 
        text: 'Ended', 
        color: 'warning', 
        icon: <SportIcon />,
        progress: 100
      };
    }
    
    // Default case
    return { 
      text: 'Unknown Status', 
      color: 'default', 
      icon: <HourglassEmpty />,
      progress: 0
    };
  }, [match]);
  
  // Update status info and time display
  useEffect(() => {
    if (match) {
      const newStatus = calculateMatchStatus();
      setStatusInfo(newStatus);
    }
  }, [match, calculateMatchStatus]);
  
  // Set up timer to update the time display every minute
  useEffect(() => {
    if (!match) return;
    
    // Update immediately
    calculateMatchStatus();
    
    // Then update every minute
    const timer = setInterval(() => {
      const newStatus = calculateMatchStatus();
      setStatusInfo(newStatus);
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, [match, calculateMatchStatus]);
  
  return (
    <Box>
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mb: 3, 
          borderLeft: 4, 
          borderColor: `${statusInfo.color}.main`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          height: '4px', 
          width: `${statusInfo.progress}%`, 
          bgcolor: `${statusInfo.color}.main`,
          transition: 'width 1s ease-in-out'
        }} />
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              sx={{ 
                bgcolor: `${statusInfo.color}.main`, 
                mr: 2,
                color: 'white'
              }}
            >
              {statusInfo.icon}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {statusInfo.text}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {timeDisplay}
              </Typography>
            </Box>
          </Box>
          
          <Chip 
            label={match.status === 'cancelled' ? 'Cancelled' : 
                  match.participants_count >= match.max_participants ? 'Full' : 'Open to Join'} 
            color={match.status === 'cancelled' ? 'error' : 
                  match.participants_count >= match.max_participants ? 'secondary' : 'success'}
            variant="outlined"
            size="small"
          />
        </Stack>
      </Paper>
    </Box>
  );
};

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
  
  // Calculate active participants count (excluding those who left)
  const activeParticipantsCount = participants.filter(p => p.status !== 'left').length;
  
  // Check if match is full
  const isMatchFull = activeParticipantsCount >= match?.max_participants;
  
  // Check if user is host
  const isHost = match?.host_id === user?.id;
  
  // Format match date and time
  const formatMatchDate = (date) => {
    return date ? format(new Date(date), 'EEEE, MMMM d, yyyy') : '';
  };
  
  const formatMatchTime = (date) => {
    return date ? format(new Date(date), 'h:mm a') : '';
  };
  
  // Format time range from start_time to end_time
  const formatTimeRange = () => {
    if (!match?.start_time || !match?.end_time) return '';
    const start = new Date(match.start_time);
    const end = new Date(match.end_time);
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
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
      const data = await participantService.getParticipants(matchId);
      
      // Sort participants: host first, then confirmed, then pending
      const sortedParticipants = data.sort((a, b) => {
        // Host always comes first
        if (a.user_id === match?.host_id) return -1;
        if (b.user_id === match?.host_id) return 1;
        
        // Then sort by status (confirmed > pending > left)
        const statusOrder = { 'confirmed': 0, 'pending': 1, 'left': 2 };
        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
      });
      
      setParticipants(sortedParticipants);
      
      // Check if current user is a participant
      const userParticipant = data.find(p => p.user_id === user?.id);
      setUserParticipation(userParticipant);
    } catch (error) {
      console.error('Error fetching participants:', error);
      setError('Failed to load participants');
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
        
        {/* Match Status Indicator */}
        <MatchStatusIndicator match={match} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography>{formatMatchDate(match.start_time)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography>{formatTimeRange()}</Typography>
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
                  {activeParticipantsCount} / {match.max_participants} participants
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography>
                  Hosted by: {match.host?.full_name || match.host?.username || 
                  participants.find(p => p.user_id === match.host_id)?.user?.full_name || 
                  participants.find(p => p.user_id === match.host_id)?.user?.username || 
                  'Unknown'}
                </Typography>
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
                <Chip 
                  label={`${activeParticipantsCount}/${match.max_participants}`} 
                  color={activeParticipantsCount >= match.max_participants ? "error" : "success"}
                  icon={<GroupIcon />}
                />
              </Box>
              
              <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                {participants.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No participants yet" secondary="Be the first to join!" />
                  </ListItem>
                ) : (
                  participants.map((participant) => {
                    // Determine status colors and icons
                    let statusColor, statusIcon, statusText;
                    
                    if (participant.user_id === match.host_id) {
                      statusColor = 'primary';
                      statusIcon = <PersonIcon />;
                      statusText = 'Host';
                    } else {
                      switch (participant.status) {
                        case 'confirmed':
                          statusColor = 'success';
                          statusIcon = <CheckCircleIcon />;
                          statusText = 'Confirmed';
                          break;
                        case 'pending':
                          statusColor = 'warning';
                          statusIcon = <PendingIcon />;
                          statusText = 'Pending';
                          break;
                        case 'left':
                          statusColor = 'error';
                          statusIcon = <LeftIcon />;
                          statusText = 'Left';
                          break;
                        default:
                          statusColor = 'default';
                          statusIcon = <PendingIcon />;
                          statusText = 'Unknown';
                      }
                    }
                    
                    return (
                      <ListItem 
                        key={participant.id}
                        sx={{
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:last-child': { borderBottom: 'none' },
                          '&:hover': { bgcolor: 'action.hover' },
                          transition: 'background-color 0.2s'
                        }}
                        secondaryAction={
                          <Chip 
                            size="small"
                            label={statusText}
                            color={statusColor}
                            icon={statusIcon}
                          />
                        }
                      >
                        <ListItemAvatar>
                          <Tooltip title={participant.user?.email || 'Unknown email'}>
                            <Avatar 
                              src={participant.user?.avatar_url}
                              sx={{
                                bgcolor: statusColor + '.main',
                                border: participant.user_id === user?.id ? '2px solid' : 'none',
                                borderColor: 'primary.main'
                              }}
                            >
                              {participant.user?.full_name?.charAt(0) || 'U'}
                            </Avatar>
                          </Tooltip>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={
                            <Typography variant="body1" fontWeight={participant.user_id === user?.id ? 'bold' : 'normal'}>
                              {participant.user?.full_name || 'Unknown'}
                              {participant.user_id === user?.id && ' (You)'}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {participant.user?.username || participant.user?.email?.split('@')[0] || 'Unknown'}
                              {participant.joined_at && ` • Joined ${format(new Date(participant.joined_at), 'MMM d, yyyy')}`}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })
                )}
              </List>
              
              {match.participants_count < match.max_participants && match.status === 'scheduled' && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Tooltip title="Share with friends">
                    <Button 
                      startIcon={<InviteIcon />}
                      onClick={handleShareMatch}
                      variant="outlined"
                      size="small"
                    >
                      Invite Friends
                    </Button>
                  </Tooltip>
                </Box>
              )}
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
