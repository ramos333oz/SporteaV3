import React, { useState } from 'react';
import { 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Paper, 
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

/**
 * Component to resend confirmation emails for unverified accounts
 */
const ResendConfirmation = ({ prefilledEmail = '' }) => {
  const { resendConfirmationEmail } = useAuth();
  const [email, setEmail] = useState(prefilledEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleResend = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error, message } = await resendConfirmationEmail(email);
      
      if (error) {
        setError(error);
      } else {
        setMessage(message);
        // Clear email field after successful send
        if (!prefilledEmail) {
          setEmail('');
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h3" gutterBottom>
        Resend Confirmation Email
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }} color="text.secondary">
        Didn't receive a confirmation email? Enter your email address below to resend it.
      </Typography>
      
      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleResend} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          helperText="Please use your @student.uitm.edu.my email"
          disabled={loading || Boolean(prefilledEmail)}
          sx={{ mb: 2 }}
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'Sending...' : 'Resend Confirmation'}
        </Button>
      </Box>
    </Paper>
  );
};

export default ResendConfirmation;
