import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Divider, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

// Utility function to safely stringify objects for display
const safeStringify = (obj) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return `Error stringifying: ${e.message}`;
  }
};

const AuthDebug = () => {
  const { user, loading, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [debugLog, setDebugLog] = useState([]);
  const [supabaseSession, setSupabaseSession] = useState(null);
  const [directCheckLoading, setDirectCheckLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('2022812796@student.uitm.edu.my');
  const [testPassword, setTestPassword] = useState('Test123456!');
  
  // Add to debug log with timestamp
  const addLog = (message, data = null) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    const logEntry = {
      id: Date.now(),
      timestamp,
      message,
      data: data ? safeStringify(data) : null
    };
    
    setDebugLog(prev => [logEntry, ...prev].slice(0, 50));
  };
  
  // Log initial component mount
  useEffect(() => {
    addLog('AuthDebug component mounted');
    
    // Check Supabase session directly
    checkSupabaseSession();
    
    return () => {
      addLog('AuthDebug component unmounted');
    };
  }, []);
  
  // Watch for auth context changes
  useEffect(() => {
    addLog('Auth context changed', { user: !!user, loading });
  }, [user, loading]);
  
  // Function to check Supabase session directly
  const checkSupabaseSession = async () => {
    setDirectCheckLoading(true);
    try {
      addLog('Checking Supabase session directly');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        addLog('Supabase session check error', error);
      } else {
        addLog('Supabase session check result', { 
          hasSession: !!data?.session,
          sessionExpiry: data?.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null
        });
        setSupabaseSession(data?.session);
      }
    } catch (error) {
      addLog('Exception checking Supabase session', error);
    } finally {
      setDirectCheckLoading(false);
    }
  };
  
  // Test login function
  const testLogin = async () => {
    try {
      addLog(`Testing login with email: ${testEmail}`);
      await signIn(testEmail, testPassword);
      addLog('Login function completed');
      
      // Wait 1 second and check session again
      setTimeout(() => {
        checkSupabaseSession();
        addLog('Auth context after login', { user: !!user, loading });
      }, 1000);
    } catch (error) {
      addLog('Test login error', error);
    }
  };
  
  // Force navigation function
  const forceNavigate = (path) => {
    addLog(`Forcing navigation to: ${path}`);
    navigate(path);
  };
  
  // Force logout function
  const forceLogout = async () => {
    try {
      addLog('Forcing logout');
      await signOut();
      addLog('Logout completed');
      
      // Check session after logout
      setTimeout(checkSupabaseSession, 1000);
    } catch (error) {
      addLog('Logout error', error);
    }
  };
  
  return (
    <Box sx={{ p: 2, maxWidth: '800px', mx: 'auto', my: 4 }}>
      <Typography variant="h4" gutterBottom>Auth Debug Page</Typography>
      <Typography variant="body1" paragraph>
        Use this page to diagnose authentication and navigation issues.
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Current Auth State</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="body2">
              <strong>Context Loading:</strong> {loading ? 'TRUE' : 'FALSE'}
            </Typography>
            <Typography variant="body2">
              <strong>Context User:</strong> {user ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}
            </Typography>
            {user && (
              <Typography variant="body2">
                <strong>User Email:</strong> {user.email}
              </Typography>
            )}
          </Box>
          
          <Box>
            <Typography variant="body2">
              <strong>Direct Session:</strong> {supabaseSession ? 'ACTIVE' : 'NONE'}
            </Typography>
            {supabaseSession && (
              <Typography variant="body2">
                <strong>Session User:</strong> {supabaseSession.user?.email}
              </Typography>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={checkSupabaseSession}
              disabled={directCheckLoading}
              sx={{ mt: 1 }}
            >
              {directCheckLoading ? <CircularProgress size={20} /> : 'Check Supabase Session'}
            </Button>
          </Box>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Test Login</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2">
            Email: {testEmail}
          </Typography>
          <Typography variant="body2">
            Password: {testPassword.replace(/./g, '*')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" onClick={testLogin}>Test Login</Button>
            <Button variant="outlined" onClick={forceLogout}>Force Logout</Button>
          </Box>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Force Navigation</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={() => forceNavigate('/login')}>Go to Login</Button>
          <Button variant="outlined" onClick={() => forceNavigate('/home')}>Go to Home</Button>
          <Button variant="outlined" onClick={() => forceNavigate('/')}>Go to Root</Button>
          <Button variant="outlined" onClick={() => forceNavigate('/emergency')}>Emergency Access</Button>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Debug Log</Typography>
        <Divider />
        <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
          {debugLog.map((log) => (
            <React.Fragment key={log.id}>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="body2">
                      <strong>[{log.timestamp}]</strong> {log.message}
                    </Typography>
                  }
                  secondary={
                    log.data && (
                      <Box component="pre" sx={{ 
                        mt: 1, p: 1, 
                        backgroundColor: 'rgba(0,0,0,0.03)', 
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        overflowX: 'auto'
                      }}>
                        {log.data}
                      </Box>
                    )
                  }
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default AuthDebug;
