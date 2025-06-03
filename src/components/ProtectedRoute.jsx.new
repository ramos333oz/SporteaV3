import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { supabase } from '../services/supabase';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [timeoutElapsed, setTimeoutElapsed] = useState(false);
  const [directSession, setDirectSession] = useState({ checked: false, exists: false, user: null });
  const [emergencyBypass, setEmergencyBypass] = useState(false);
  const navigate = useNavigate();
  
  console.log('ProtectedRoute - Auth state:', { user, loading, timeoutElapsed, directSession });
  
  // Immediately check session directly with Supabase as soon as component mounts
  useEffect(() => {
    const checkSessionDirectly = async () => {
      try {
        console.log('ProtectedRoute - Performing direct session check');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('ProtectedRoute - Session check error:', error);
          setDirectSession({ checked: true, exists: false, user: null });
          return;
        }
        
        const hasSession = !!data?.session;
        console.log('ProtectedRoute - Direct session check result:', hasSession ? 'Has session' : 'No session');
        
        if (hasSession) {
          // Get user info if we have a session
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('ProtectedRoute - Error getting user from session:', userError);
            setDirectSession({ checked: true, exists: true, user: null });
          } else {
            console.log('ProtectedRoute - Got user from direct session check:', userData?.user?.email);
            setDirectSession({ checked: true, exists: true, user: userData?.user || null });
          }
        } else {
          setDirectSession({ checked: true, exists: false, user: null });
        }
      } catch (e) {
        console.error('ProtectedRoute - Exception during direct session check:', e);
        setDirectSession({ checked: true, exists: false, user: null });
      }
    };
    
    // Run the session check immediately
    checkSessionDirectly();
  }, []);
  
  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('ProtectedRoute - Loading timeout reached. Setting fallback states.');
        setTimeoutElapsed(true);
      }
    }, 2000); // 2 second timeout
    
    return () => clearTimeout(timer);
  }, [loading]);
  
  // Handle manual logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Redirect to login page
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('ProtectedRoute - Error signing out:', error);
    }
  };
  
  // If loading is still happening but direct session check is done, use that result
  if (loading && directSession.checked) {
    if (directSession.exists) {
      console.log('ProtectedRoute - Auth context still loading but session exists, proceeding');
      return children;
    } else if (!timeoutElapsed) {
      // Keep showing loading until timeout
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress size={40} />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading...</Typography>
        </Box>
      );
    }
  }
  
  // If auth context is still loading and timeout hasn't elapsed, show loading
  if (loading && !timeoutElapsed) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  // Emergency bypass for serious loading issues
  if (emergencyBypass) {
    console.log('ProtectedRoute - Using emergency bypass to render content');
    return children;
  }

  // After timeout, show emergency options
  if (timeoutElapsed && loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', p: 3 }}>
        <Typography variant="h5" gutterBottom>Authentication Timeout</Typography>
        <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
          There seems to be an issue with the authentication process. Please choose an option below:
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 300 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => setEmergencyBypass(true)}
          >
            Continue to App
          </Button>
          
          <Button 
            variant="outlined"
            onClick={handleLogout}
          >
            Sign Out
          </Button>
          
          <Button 
            variant="outlined"
            onClick={() => navigate('/auth-debug')}
          >
            Debug Auth
          </Button>
        </Box>
      </Box>
    );
  }

  // After timeout, use direct session check if no user in context
  if (!user && directSession.checked) {
    if (directSession.exists) {
      // We have a session directly with Supabase but no user in context
      // Let the user proceed anyway since they're authenticated
      console.log('ProtectedRoute - Using direct session to allow access');
      return children;
    } else {
      // No session found directly with Supabase either
      console.log('ProtectedRoute - No session found, redirecting to login');
      return <Navigate to="/login" replace />;
    }
  }

  // Normal flow - if user exists, render children, otherwise redirect to login
  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
