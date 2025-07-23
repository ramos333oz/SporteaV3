import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  CircularProgress,
  Alert,
  Link
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        throw new Error(error);
      }
      
      setEmailSent(true);
      setSuccessMessage('Password reset email sent! Please check your inbox and follow the instructions to reset your password.');
    } catch (err) {
      console.error('Error sending password reset email:', err);
      setError(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        throw new Error(error);
      }
      
      setSuccessMessage('Password reset email sent again! Please check your inbox.');
    } catch (err) {
      console.error('Error resending password reset email:', err);
      setError(err.message || 'Failed to resend password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center' }}>
      <Paper 
        elevation={2} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          width: '100%',
          borderRadius: 3
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            component="img"
            src="/Sportea_logo/Sportea.png"
            alt="Sportea Logo"
            sx={{
              height: 180,
              width: 'auto',
              mb: 2,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
            }}
          />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 600,
              color: '#8A1538',
              mb: 1
            }}
          >
            Reset Password
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
            {emailSent 
              ? 'Check your email for reset instructions'
              : 'Enter your email to receive password reset instructions'
            }
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2, width: '100%' }}>{successMessage}</Alert>}

        {!emailSent ? (
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              helperText="Enter the email address associated with your account"
              sx={{ mb: 3 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mb: 3, height: 48 }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Email'}
            </Button>
          </Box>
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Didn't receive the email? Check your spam folder or try again.
            </Typography>
            
            <Button
              onClick={handleResendEmail}
              variant="outlined"
              size="large"
              disabled={isLoading}
              sx={{ mb: 3, height: 48, width: '100%' }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Resend Email'}
            </Button>
          </Box>
        )}

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Remember your password?{' '}
            <Link 
              component={RouterLink} 
              to="/login"
              color="primary"
              variant="body2"
              sx={{ fontWeight: 500 }}
            >
              Back to Login
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;
