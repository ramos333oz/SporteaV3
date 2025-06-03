import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

import { useAuth } from '../../hooks/useAuth';
import { notificationService, createNotificationContent } from '../../services/notifications';
import { supabase } from '../../services/supabase';

// This component is for testing the real-time notification system
// It allows sending test notifications to the current user
const NotificationTester = () => {
  const { user } = useAuth();
  
  const [notificationType, setNotificationType] = useState('match_invite');
  const [matchTitle, setMatchTitle] = useState('Basketball Match');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Notification types
  const notificationTypes = [
    { value: 'match_invite', label: 'Match Invite' },
    { value: 'match_join_request', label: 'Join Request' },
    { value: 'join_request_accepted', label: 'Request Accepted' },
    { value: 'join_request_rejected', label: 'Request Rejected' },
    { value: 'match_cancelled', label: 'Match Cancelled' },
    { value: 'match_updated', label: 'Match Updated' },
    { value: 'match_starting_soon', label: 'Match Starting Soon' },
    { value: 'new_message', label: 'New Message' }
  ];
  
  // Send a test notification
  const sendTestNotification = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Get random match ID if we have one
      let matchId = null;
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .limit(1);
      
      if (matches && matches.length > 0) {
        matchId = matches[0].id;
      }
      
      // Create notification data
      const notificationData = {
        user_id: user.id,
        type: notificationType,
        content: createNotificationContent(notificationType, {
          match_title: matchTitle,
          sender_name: 'Test User'
        }),
        read: false,
        sender_id: user.id, // Using current user as sender for simplicity
        match_id: matchId,
        created_at: new Date().toISOString()
      };
      
      // Send notification
      await notificationService.createNotification(notificationData);
      
      setSuccess(true);
    } catch (error) {
      console.error('Error sending test notification:', error);
      setError(error.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h2" gutterBottom>Notification Tester</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        This tool is for testing real-time notifications. Send a test notification to yourself.
      </Typography>
      
      <Box component="form" noValidate sx={{ mt: 1 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="notification-type-label">Notification Type</InputLabel>
          <Select
            labelId="notification-type-label"
            id="notification-type"
            value={notificationType}
            label="Notification Type"
            onChange={(e) => setNotificationType(e.target.value)}
          >
            {notificationTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <TextField
          fullWidth
          label="Match Title"
          value={matchTitle}
          onChange={(e) => setMatchTitle(e.target.value)}
          margin="normal"
          helperText="This will be used in the notification content"
        />
        
        <Button
          fullWidth
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          onClick={sendTestNotification}
          disabled={loading || !user}
          sx={{ mt: 2 }}
        >
          {loading ? 'Sending...' : 'Send Test Notification'}
        </Button>
      </Box>
      
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Notification sent successfully!
        </Alert>
      </Snackbar>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default NotificationTester;
