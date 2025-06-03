import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

// This is a special component that bypasses the normal auth flow
// and directly renders the home page content without relying on the auth context
const DirectHome = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  
  // Directly check session with Supabase
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('DirectHome - Checking session directly with Supabase');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('DirectHome - Session check error:', error);
          setError(error.message);
          setLoading(false);
          return;
        }
        
        console.log('DirectHome - Session check result:', data);
        setSession(data.session);
        
        // Fetch user profile data if needed
        if (data.session) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.session.user.id)
              .single();
              
            if (profileError) {
              console.warn('DirectHome - Error fetching profile:', profileError);
            } else {
              console.log('DirectHome - Profile data:', profileData);
            }
          } catch (profileError) {
            console.error('DirectHome - Profile fetch exception:', profileError);
          }
        }
      } catch (e) {
        console.error('DirectHome - Session check exception:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);
  
  // Function to handle manual sign in
  const handleManualSignIn = async (email, password) => {
    try {
      setLoading(true);
      console.log('DirectHome - Attempting manual sign in');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: '2022812796@student.uitm.edu.my',
        password: 'Test123456!'
      });
      
      if (error) {
        console.error('DirectHome - Sign in error:', error);
        setError(error.message);
        return;
      }
      
      console.log('DirectHome - Sign in success:', data);
      setSession(data.session);
      
      // Refresh the page after successful sign in
      window.location.reload();
    } catch (e) {
      console.error('DirectHome - Sign in exception:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Checking your session...
        </Typography>
      </Box>
    );
  }
  
  if (!session) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Direct Access
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
          You need to be signed in to access this page. This is a direct bypass that avoids the normal authentication flow.
        </Typography>
        
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            Error: {error}
          </Typography>
        )}
        
        <Button 
          variant="contained" 
          onClick={() => handleManualSignIn()}
          sx={{ mb: 2 }}
        >
          Sign In Directly
        </Button>
        
        <Button 
          variant="outlined"
          onClick={() => navigate('/login')}
        >
          Go to Login Page
        </Button>
      </Box>
    );
  }
  
  // If we have a session, render the main content
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Direct Home Access
      </Typography>
      
      <Typography variant="body1" paragraph>
        You're successfully logged in! This page bypasses the normal authentication flow and directly uses Supabase API.
      </Typography>
      
      <Typography variant="subtitle1" gutterBottom>
        Current user: {session.user.email}
      </Typography>
      
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained"
          onClick={() => navigate('/home')}
        >
          Go to Regular Home
        </Button>
        
        <Button 
          variant="outlined"
          onClick={async () => {
            try {
              await supabase.auth.signOut();
              window.location.reload();
            } catch (e) {
              console.error('Error signing out:', e);
            }
          }}
        >
          Sign Out
        </Button>
      </Box>
    </Box>
  );
};

export default DirectHome;
