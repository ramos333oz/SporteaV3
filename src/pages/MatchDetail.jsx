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
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
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
  Email as InviteIcon,
  DeleteOutline as DeleteIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon
} from '@mui/icons-material';
import { format, formatDistance, formatDistanceToNow, isPast, isFuture, isAfter, differenceInMinutes, differenceInSeconds, intervalToDuration } from 'date-fns';

import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { useToast } from '../contexts/ToastContext';
import { matchService, participantService, supabase } from '../services/supabase';
import { notificationService } from '../services/notifications';
import FriendInvitationModal from '../components/FriendInvitationModal';

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
        icon: <PendingIcon />,
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
      icon: <PendingIcon />,
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
  const { showInfoToast, showSuccessToast, showWarningToast } = useToast();
  
  const [match, setMatch] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userParticipation, setUserParticipation] = useState(null);
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [openLeaveDialog, setOpenLeaveDialog] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showFriendInvitationModal, setShowFriendInvitationModal] = useState(false);
  const [hasDirectInvitation, setHasDirectInvitation] = useState(false);
  
  // Calculate active participants count (only confirmed participants)
  const activeParticipantsCount = participants.filter(p => p.status === 'confirmed').length;
  
  // Check if match is full
  const isMatchFull = activeParticipantsCount >= match?.max_participants;

  // Check if user has a Direct Join invitation for this match
  const checkDirectInvitation = useCallback(async () => {
    if (!user?.id || !matchId) return;

    try {
      const { data: invitation, error } = await supabase
        .from('match_invitations')
        .select('*')
        .eq('match_id', matchId)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .eq('invitation_type', 'direct')
        .single();

      setHasDirectInvitation(!!invitation && !error);
    } catch (error) {
      console.error('Error checking direct invitation:', error);
      setHasDirectInvitation(false);
    }
  }, [user?.id, matchId]);
  
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
  
  // Modify the handleJoinMatchClick to open the dialog first
  const handleJoinMatchClick = () => {
    setOpenJoinDialog(true);
  };

  // Actual join match handler (called from dialog confirmation)
  const handleJoinMatch = async () => {
    try {
      setOpenJoinDialog(false);
      setButtonLoading(true);

      const result = await participantService.joinMatch(matchId, user.id);

      // Update local state immediately to reflect the change
      if (result && result.success) {
        if (result.joinType === 'direct_invitation') {
          // Direct Join invitation was accepted - user is immediately confirmed
          setUserParticipation({
            user_id: user.id,
            match_id: matchId,
            status: 'confirmed'
          });
          showSuccessToast('Joined Successfully!', 'You have successfully joined the match via Direct Join invitation!');
          // Force refetch to update participant count
          fetchParticipants();
        } else {
          // Regular join request - user is pending approval
          setUserParticipation({
            user_id: user.id,
            match_id: matchId,
            status: 'pending'
          });
          showSuccessToast('Request Sent', 'Successfully sent request to join match. Waiting for host approval.');
        }
      } else if (result && !result.success) {
        // Handle cases where request failed but we need to update UI state
        if (result.status === 'pending') {
          // User already has a pending request
          setUserParticipation({
            user_id: user.id,
            match_id: matchId,
            status: 'pending'
          });
        } else if (result.status === 'confirmed') {
          // User is already confirmed
          setUserParticipation({
            user_id: user.id,
            match_id: matchId,
            status: 'confirmed'
          });
        }
        showInfoToast('Request Status', result.message);

        // Force refetch to ensure UI is in sync with database
        fetchParticipants();
      }
      // Real-time update will eventually come through subscription as well
    } catch (error) {
      setError('Failed to join the match. Please try again.');
      console.error('Error joining match:', error);
      showErrorToast('Error', error.message || 'Failed to join match');
    } finally {
      setButtonLoading(false);
    }
  };
  
  // Leave match handler
  const handleLeaveMatch = async () => {
    try {
      // Show confirmation dialog using Dialog component instead of window.confirm
      setOpenLeaveDialog(true);
    } catch (error) {
      setError('Failed to process your request. Please try again.');
      console.error('Error in leave match handler:', error);
      showErrorToast('Error', error.message || 'Failed to process your request');
    }
  };
  
  // Actual leave match implementation after confirmation
  const processLeaveMatch = async () => {
    try {
      setButtonLoading(true);
      const result = await participantService.leaveMatch(matchId, user.id);

      // Update local state immediately to reflect the change
      if (result && result.success) {
        // Set user participation to 'left' status instead of null to properly handle button state
        setUserParticipation({
          user_id: user.id,
          match_id: matchId,
          status: 'left'
        });

        showSuccessToast('Success', result.message || 'You have successfully left the match');

        // Force refetch participants to update UI correctly and trigger real-time updates
        fetchParticipants();

        console.log('[LEAVE MATCH] User participation updated to left status');
      }
      setOpenLeaveDialog(false);
      setButtonLoading(false);
    } catch (error) {
      setError('Failed to leave the match. Please try again.');
      console.error('Error leaving match:', error);
      showErrorToast('Error', error.message || 'Failed to leave the match');
      setButtonLoading(false);
      setOpenLeaveDialog(false);
    }
  };
  
  // Edit match handler (redirects to edit page)
  const handleEditMatch = () => {
    navigate(`/edit-match/${matchId}`);
  };
  
  // Handle cancel match
  const handleCancelMatch = async () => {
    try {
      if (!window.confirm('Are you sure you want to cancel this match?')) {
        return;
      }
      
      const result = await matchService.cancelMatch(matchId);
      
      // After cancellation, send notifications to all participants
      try {
        // Get all participants who need to be notified (confirmed and pending)
        const participantsToNotify = participants.filter(p => 
          (p.status === 'confirmed' || p.status === 'pending') && 
          p.user_id !== user?.id // Don't notify the host
        );
        
        // Create notifications for each participant
        for (const participant of participantsToNotify) {
          await notificationService.createNotification({
            user_id: participant.user_id,
            type: 'match_cancelled',
            data: {
              match_id: matchId,
              match_title: match.title,
              sender_id: user.id,
              sender_name: user.full_name || user.username || 'Match host'
            },
            read: false
          });
        }
      } catch (notifError) {
        console.error('Error sending cancellation notifications:', notifError);
        // Continue execution - this is non-blocking
      }
      
      showSuccessToast('Match Cancelled', 'The match has been cancelled successfully');
      // Refresh match data to show cancelled status
      fetchMatch();
    } catch (error) {
      console.error('Error cancelling match:', error);
      showErrorToast('Error', 'Failed to cancel the match');
    }
  };
  
  // Delete match handler
  const handleDeleteMatch = async () => {
    // Check if the match is cancelled or completed first
    if (match.status !== 'cancelled' && match.status !== 'completed') {
      if (window.confirm('This match needs to be cancelled before it can be deleted. Would you like to go to the Host page to cancel it first?')) {
        navigate('/host');
      }
      return;
    }
    
    // If match is already cancelled or completed, proceed with deletion
    if (window.confirm('Are you sure you want to delete this match? This action cannot be undone and all match data will be permanently deleted.')) {
      try {
        await matchService.deleteMatch(matchId);
        showSuccessToast('Match Deleted', 'Match has been permanently deleted');
        navigate('/host'); // Redirect to host page after deletion
      } catch (error) {
        setError('Failed to delete the match. Please try again.');
        console.error('Error deleting match:', error);
        showErrorToast('Delete Failed', 'Failed to delete the match');
      }
    }
  };
  
  // Share match handler
  const handleShareMatch = () => {
    const sportName = match.sport?.name || 'Unknown Sport';
    if (navigator.share) {
      navigator.share({
        title: `${sportName} match on Sportea`,
        text: `Join me for a ${sportName} match on ${formatMatchDate(match.start_time)} at ${formatMatchTime(match.start_time)}`,
        url: window.location.href
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      showInfoToast('Link Copied', 'Match link copied to clipboard!');
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
      
      console.log('Fetched participants data:', data);
      
      // Sort participants: host first, then confirmed, then pending
      const sortedParticipants = data.sort((a, b) => {
        // Host always comes first
        if (a.user_id === match?.host_id) return -1;
        if (b.user_id === match?.host_id) return 1;
        
        // Then sort by status (confirmed > pending > left)
        const statusOrder = { 'confirmed': 0, 'pending': 1, 'left': 2, 'declined': 3 };
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
  
  // Real-time update handler for participants
  const handleParticipantsUpdate = useCallback((payload) => {
    // Fetch all participants again to get the latest state
    fetchParticipants();
    
    // Check if update involves current user
    if (payload.new?.user_id === user?.id) {
      setUserParticipation(payload.new);
    }
  }, [user]);
  
  // Real-time update handler for match
  const handleMatchUpdate = useCallback((payload) => {
    const oldMatch = match;
    const newMatchData = payload.data;

    console.log('[MatchDetail] Real-time match update received:', {
      matchId: matchId,
      eventType: payload.eventType,
      hasExistingMatch: !!oldMatch,
      hasRelationalData: !!(oldMatch?.sport || oldMatch?.location),
      newData: newMatchData
    });

    // Preserve relational data from existing match while updating changed fields
    // This prevents "Unknown Sport Match" issue by maintaining sport, location, and host data
    if (oldMatch && (oldMatch.sport || oldMatch.location || oldMatch.host)) {
      const mergedMatch = {
        ...oldMatch,           // Keep existing data including relationships
        ...newMatchData,       // Apply updates from real-time payload
        // Explicitly preserve critical relational data that might be missing from real-time updates
        sport: oldMatch.sport || newMatchData.sport,
        location: oldMatch.location || newMatchData.location,
        host: oldMatch.host || newMatchData.host,
        participants: oldMatch.participants || newMatchData.participants
      };

      console.log('[MatchDetail] Merged match data:', {
        sportName: mergedMatch.sport?.name,
        locationName: mergedMatch.location?.name,
        hostName: mergedMatch.host?.full_name
      });

      setMatch(mergedMatch);
    } else {
      // If no existing match data, use new data directly (initial load case)
      console.log('[MatchDetail] No existing match data, using new data directly');
      setMatch(newMatchData);
    }

    // Only show notifications for significant changes, not automatic updates
    if (newMatchData.status === 'cancelled' && oldMatch?.status !== 'cancelled') {
      showWarningToast('Match Cancelled', 'This match has been cancelled by the host.');
    } else if (newMatchData.status === 'completed' && oldMatch?.status !== 'completed') {
      showInfoToast('Match Completed', 'This match has been marked as completed.');
    }
    // Don't show generic "match updated" notifications for minor changes like participant counts
  }, [match, matchId, showInfoToast, showWarningToast]);
  
  // Fetch data on mount
  useEffect(() => {
    if (matchId && user) {
      fetchMatch();
      fetchParticipants();
      checkDirectInvitation();
    }
  }, [matchId, user, checkDirectInvitation]);
  
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
  }, [matchId, subscribeToMatch, handleMatchUpdate, handleParticipantsUpdate]);
  
  // Handle accepting a join request
  const handleAcceptRequest = async (participantId, userId) => {
    try {
      await participantService.acceptJoinRequest(matchId, userId, user.id);
      showSuccessToast('Request Accepted', 'The participant has been accepted to join the match');
      // Fetch participants again to update the UI
      fetchParticipants();
    } catch (error) {
      console.error('Error accepting request:', error);
      showErrorToast('Error', 'Failed to accept join request');
    }
  };

  // Handle declining a join request
  const handleDeclineRequest = async (participantId, userId) => {
    try {
      await participantService.declineJoinRequest(matchId, userId, user.id);
      showSuccessToast('Request Declined', 'The join request has been declined');
      // Fetch participants again to update the UI
      fetchParticipants();
    } catch (error) {
      console.error('Error declining request:', error);
      showErrorToast('Error', 'Failed to decline join request');
    }
  };
  
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
  
  // Filter participants by status
  const currentParticipants = participants.filter(p => 
    p.status === 'confirmed' || (p.user_id === match?.host_id)
  );

  const pendingParticipants = participants.filter(p => 
    p.status === 'pending' && p.user_id !== match?.host_id
  );
  
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h2">{match.sport?.name || 'Unknown Sport'} Match</Typography>
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
                <Typography>{match.location?.name || 'Unknown Location'}</Typography>
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
              
              {/* Show pending requests to host */}
              {isHost && pendingParticipants.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h4" color="warning.main" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PendingIcon sx={{ mr: 1 }} /> Pending Requests
                  </Typography>
                  <Paper elevation={1}>
                    <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                      {pendingParticipants.map((participant) => (
                        <ListItem 
                          key={`pending-${participant.id}`}
                          sx={{
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' },
                            '&:hover': { bgcolor: 'action.hover' },
                            transition: 'background-color 0.2s'
                          }}
                          secondaryAction={
                            <Box>
                              <IconButton 
                                edge="end" 
                                aria-label="accept" 
                                onClick={() => handleAcceptRequest(participant.id, participant.user_id)}
                                color="success"
                                title="Accept Request"
                                sx={{ mr: 1 }}
                              >
                                <ThumbUpIcon />
                              </IconButton>
                              <IconButton 
                                edge="end" 
                                aria-label="decline" 
                                onClick={() => handleDeclineRequest(participant.id, participant.user_id)}
                                color="error"
                                title="Decline Request"
                              >
                                <ThumbDownIcon />
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemAvatar>
                            <Avatar 
                              src={participant.user?.avatar_url}
                              sx={{
                                bgcolor: 'warning.main',
                              }}
                            >
                              {participant.user?.full_name?.charAt(0) || participant.user?.username?.charAt(0) || 'U'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={
                              <Typography variant="body1">
                                {participant.user?.full_name || participant.user?.username || 'Unknown'}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="body2" color="text.secondary">
                                {participant.user?.username || participant.user?.email?.split('@')[0] || 'Unknown'}
                                {participant.joined_at && ` • Requested ${format(new Date(participant.joined_at), 'MMM d, yyyy')}`}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              )}
              
              {/* Current participants */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h4" color="success.main" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircleIcon sx={{ mr: 1 }} /> Current Participants
                </Typography>
                <Paper elevation={1}>
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                    {currentParticipants.length === 0 ? (
                      <ListItem>
                        <ListItemText primary="No confirmed participants yet" />
                      </ListItem>
                    ) : (
                      currentParticipants.map((participant) => {
                        // Determine status colors and icons
                        let statusColor, statusIcon, statusText;
                        
                        if (participant.user_id === match.host_id) {
                          statusColor = 'primary';
                          statusIcon = <PersonIcon />;
                          statusText = 'Host';
                        } else {
                          statusColor = 'success';
                          statusIcon = <CheckCircleIcon />;
                          statusText = 'Confirmed';
                        }
                        
                        return (
                          <ListItem 
                            key={`current-${participant.id}`}
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
                                  {participant.user?.full_name?.charAt(0) || participant.user?.username?.charAt(0) || 'U'}
                                </Avatar>
                              </Tooltip>
                            </ListItemAvatar>
                            <ListItemText 
                              primary={
                                <Typography variant="body1" fontWeight={participant.user_id === user?.id ? 'bold' : 'normal'}>
                                  {participant.user?.full_name || participant.user?.username || 'Unknown'}
                                  {participant.user_id === user?.id && ' (You)'}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="body2" color="text.secondary">
                                  {participant.user?.full_name || participant.user?.username || (participant.user?.email ? `${participant.user.email.split('@')[0]}` : 'Unknown')}
                                  {participant.joined_at && ` • Joined ${format(new Date(participant.joined_at), 'MMM d, yyyy')}`}
                                </Typography>
                              }
                            />
                          </ListItem>
                        );
                      })
                    )}
                  </List>
                </Paper>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h3" gutterBottom>Actions</Typography>
              
              <Stack spacing={2}>
                {match.status !== 'cancelled' && match.status !== 'completed' ? (
                  <>
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
                          variant="contained"
                          color="primary"
                          startIcon={<InviteIcon />}
                          onClick={() => setShowFriendInvitationModal(true)}
                          fullWidth
                        >
                          Invite Friends
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
                    ) : userParticipation && userParticipation.status !== 'left' && userParticipation.status !== 'declined' ? (
                      userParticipation.status === 'pending' ? (
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={handleLeaveMatch}
                          fullWidth
                          disabled={buttonLoading}
                        >
                          {buttonLoading ? <CircularProgress size={24} /> : 'Cancel Request'}
                        </Button>
                      ) : (
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={handleLeaveMatch}
                          fullWidth
                          disabled={buttonLoading}
                        >
                          {buttonLoading ? <CircularProgress size={24} /> : 'Leave Match'}
                        </Button>
                      )
                    ) : (
                      <Button 
                        variant="contained" 
                        onClick={handleJoinMatchClick}
                        disabled={isMatchFull || buttonLoading}
                        fullWidth
                      >
                        {buttonLoading ? <CircularProgress size={24} /> : isMatchFull ? 'Match is Full' : hasDirectInvitation ? 'Accept Invitation' : 'Request to Join'}
                      </Button>
                    )}
                  </>
                ) : (
                  isHost && (
                    <Button 
                      variant="outlined" 
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteMatch}
                      fullWidth
                    >
                      Delete Match
                    </Button>
                  )
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
              
              {/* Add button to navigate to Host page for match management when user is the host */}
              {isHost && (
                <Button 
                  variant="text" 
                  onClick={() => navigate('/host')} 
                  sx={{ mt: 1 }}
                  fullWidth
                >
                  Manage Your Matches
                </Button>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Add this new section to display match summary for completed matches */}
      {match && match.status === 'completed' && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
          <Typography variant="h2" gutterBottom>
            Match Summary
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              Match Result
            </Typography>
            <Typography variant="body1">
              This match was completed on {formatMatchDate(match.end_time)} at {formatMatchTime(match.end_time)}.
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              Participation
            </Typography>
            <Typography variant="body1">
              {participants.filter(p => p.status === 'confirmed').length} participants joined this match.
            </Typography>
          </Box>
          {isHost && (
            <Box sx={{ mt: 3 }}>
              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<DeleteIcon />}
                onClick={handleDeleteMatch}
              >
                Delete Match
              </Button>
            </Box>
          )}
        </Paper>
      )}
      
      {/* Join Match Confirmation Dialog */}
      <Dialog
        open={openJoinDialog}
        onClose={() => setOpenJoinDialog(false)}
        aria-labelledby="join-match-dialog-title"
      >
        <DialogTitle id="join-match-dialog-title">
          {hasDirectInvitation ? 'Join Match' : 'Request to Join Match'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {hasDirectInvitation ? (
              <>
                Are you sure you want to join "{match?.title}"? You have a Direct Join invitation, so you will be added to the match immediately.
              </>
            ) : (
              <>
                Are you sure you want to send a request to join "{match?.title}"? The host will need to approve your request.
                {match?.is_private && " This is a private match and will require an access code."}
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenJoinDialog(false)}>Cancel</Button>
          <Button onClick={handleJoinMatch} color="primary" variant="contained" disabled={buttonLoading}>
            {buttonLoading ? <CircularProgress size={24} /> : (hasDirectInvitation ? 'Accept Invitation' : 'Send Request')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Leave Match Confirmation Dialog */}
      <Dialog
        open={openLeaveDialog}
        onClose={() => setOpenLeaveDialog(false)}
        aria-labelledby="leave-match-dialog-title"
      >
        <DialogTitle id="leave-match-dialog-title">Leave Match</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to leave "{match?.title}"? 
            {userParticipation?.status === 'confirmed' 
              ? " You will need to request to join again if you change your mind."
              : " This will cancel your request to join."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLeaveDialog(false)}>Cancel</Button>
          <Button onClick={processLeaveMatch} color="error" variant="contained" disabled={buttonLoading}>
            {buttonLoading ? <CircularProgress size={24} /> : 'Leave Match'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Friend Invitation Modal */}
      <FriendInvitationModal
        open={showFriendInvitationModal}
        onClose={() => setShowFriendInvitationModal(false)}
        match={match}
        onInvitationsSent={(count) => {
          showSuccessToast('Invitations Sent', `Successfully sent invitations to ${count} friend${count !== 1 ? 's' : ''}`);
        }}
      />
    </Box>
  );
};

export default MatchDetail;
