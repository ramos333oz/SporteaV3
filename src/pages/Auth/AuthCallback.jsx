import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Container,
  Paper,
  Alert
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

/**
 * Auth Callback page - handles redirects from email confirmations
 * This component processes auth tokens in the URL after email verification
 */
const AuthCallback = () => {
  const { supabase } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        
        // Get the URL hash and parse the access token and refresh token
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (!accessToken) {
          throw new Error('No access token found in URL');
        }
        
        // Exchange the tokens with Supabase to create a valid session
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (error) {
          throw error;
        }
        
        // If we successfully got a session, redirect to the home page
        navigate('/', { replace: true });
        
      } catch (err) {
        console.error('Error processing auth callback:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    handleAuthCallback();
  }, [navigate, supabase.auth]);
  
  return (
    <Container component="main" maxWidth="xs">
      <Paper
        elevation={3}
        sx={{
          marginTop: 8,
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
            <CircularProgress color="primary" sx={{ mb: 2 }} />
            <Typography variant="h2" sx={{ mb: 2 }}>
              Verifying your account...
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please wait while we complete your registration.
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        ) : null}
      </Paper>
    </Container>
  );
};

export default AuthCallback;
