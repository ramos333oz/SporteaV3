import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Divider, Alert, CircularProgress, Stack, TextField, List, ListItem, ListItemText } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

// A special debug component to help diagnose rendering errors
const ErrorDebug = () => {
  const [supabaseStatus, setSupabaseStatus] = useState('Checking...');
  const [authStatus, setAuthStatus] = useState('Unknown');
  const [sessionData, setSessionData] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  
  // Check supabase connectivity
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        // Try a simple query to check if Supabase is reachable
        const { data, error } = await supabase.from('sports').select('id').limit(1);
        
        if (error) {
          console.error('Supabase connection error:', error);
          setSupabaseStatus(`Error: ${error.message}`);
          addErrorLog('Supabase Connection', error.message);
        } else {
          setSupabaseStatus('Connected');
        }
      } catch (err) {
        console.error('Unexpected error checking Supabase:', err);
        setSupabaseStatus(`Unexpected error: ${err.message}`);
        addErrorLog('Supabase Connection', err.message);
      }
    };
    
    checkSupabase();
  }, []);
  
  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth session error:', error);
          setAuthStatus(`Error: ${error.message}`);
          addErrorLog('Auth Session', error.message);
        } else if (data?.session) {
          setAuthStatus('Session Active');
          setSessionData(data.session);
        } else {
          setAuthStatus('No Active Session');
        }
      } catch (err) {
        console.error('Unexpected auth error:', err);
        setAuthStatus(`Unexpected error: ${err.message}`);
        addErrorLog('Auth Check', err.message);
      }
    };
    
    checkAuth();
  }, []);
  
  // Helper to add an error log
  const addErrorLog = (source, message) => {
    setErrorLogs(prev => [
      ...prev, 
      { source, message, timestamp: new Date().toISOString() }
    ]);
  };
  
  // Force navigation to login
  const goToLogin = () => {
    window.location.href = '/login';
  };
  
  // Force navigation to home
  const goToHome = () => {
    window.location.href = '/home';
  };
  
  // Force sign out
  const forceSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setAuthStatus('Signed Out');
      setSessionData(null);
      addErrorLog('Manual Action', 'Signed out successfully');
    } catch (err) {
      addErrorLog('Sign Out', err.message);
    }
  };
  
  // Force login with email and password
  const [email, setEmail] = useState('2022812796@student.uitm.edu.my');
  const [password, setPassword] = useState('');
  const [directLoginLoading, setDirectLoginLoading] = useState(false);
  
  const directForceLogin = async () => {
    setDirectLoginLoading(true);
    try {
      // Direct login bypassing the normal authentication flow
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        addErrorLog('Direct Force Login', error.message);
        throw error;
      }
      
      if (data && data.user) {
        addErrorLog('Direct Force Login', `Success! Logged in as ${data.user.email}`);
        // Force redirect to home page after successful login
        setTimeout(() => {
          window.location.href = '/home';
        }, 1000);
      }
    } catch (err) {
      console.error('Direct login error:', err);
      addErrorLog('Direct Force Login', err.message);
    } finally {
      setDirectLoginLoading(false);
    }
  };
  
  return (
    <Box sx={{ 
      padding: 3,
      maxWidth: 600,
      margin: '0 auto',
      marginTop: 4
    }}>
      <Typography variant="h1" gutterBottom>
        Debug Tools
      </Typography>
      
      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h2" gutterBottom>System Status</Typography>
        
        <Box sx={{ marginBottom: 2 }}>
          <Typography variant="body1">
            <strong>Supabase Connection:</strong> {supabaseStatus}
          </Typography>
        </Box>
        
        <Box sx={{ marginBottom: 2 }}>
          <Typography variant="body1">
            <strong>Auth Status:</strong> {authStatus}
          </Typography>
        </Box>
        
        {sessionData && (
          <Box sx={{ marginBottom: 2 }}>
            <Typography variant="body1">
              <strong>User:</strong> {sessionData.user?.email || 'Unknown'}
            </Typography>
            <Typography variant="body2">
              <strong>Session Expires:</strong> {new Date(sessionData.expires_at * 1000).toLocaleString()}
            </Typography>
          </Box>
        )}
        
        <Box sx={{ display: 'flex', gap: 2, marginTop: 3 }}>
          <Button variant="contained" color="primary" onClick={goToLogin}>
            Go to Login
          </Button>
          <Button variant="contained" color="secondary" onClick={goToHome}>
            Go to Home
          </Button>
          <Button variant="outlined" color="error" onClick={forceSignOut}>
            Force Sign Out
          </Button>
        </Box>
      </Paper>
      
      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h2" gutterBottom>Direct Force Login</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This bypasses the normal authentication flow and directly sets the session.
          Use this if the regular login gets stuck on loading screens.
        </Typography>
        
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Button 
            variant="contained" 
            color="warning"
            onClick={directForceLogin}
            disabled={directLoginLoading || !email || !password}
            startIcon={directLoginLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {directLoginLoading ? 'Logging in...' : 'Force Direct Login'}
          </Button>
        </Box>
      </Paper>
      
      <Paper sx={{ padding: 3 }}>
        <Typography variant="h2" gutterBottom>Error Logs</Typography>
        
        {errorLogs.length === 0 ? (
          <Typography variant="body1">No errors recorded.</Typography>
        ) : (
          <List>
            {errorLogs.map((log, index) => (
              <React.Fragment key={index}>
                <ListItem alignItems="flex-start">
                  <ListItemText
                    primary={`${log.source}`}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="error">
                          {log.message}
                        </Typography>
                        <Typography component="span" variant="caption" sx={{ display: 'block' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {index < errorLogs.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default ErrorDebug;
