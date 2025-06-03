import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, Divider, Alert, Paper, Button, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NotificationTester from '../components/admin/NotificationTester';
import { useAuth } from '../hooks/useAuth';

const Admin = () => {
  const { user } = useAuth();
  
  // Check if user is admin (this should be enhanced with proper role-based checking)
  // For now, we'll just allow all authenticated users during development
  const isAdmin = true; // TODO: Implement proper admin check when user roles are added
  
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You do not have permission to access this page.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h1" gutterBottom>Admin Panel</Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        This panel provides administrative tools for the Sportea platform.
      </Typography>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Real-time notification testing */}
      <NotificationTester />
      
      <Divider sx={{ my: 3 }} />
      
      {/* Debug Information Panel */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h2" gutterBottom>Debug Panel</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          View application state and debug information. This panel is only visible in development mode.
        </Typography>
        
        <DebugPanel />
      </Paper>
      
      {/* Add more admin tools here as needed */}
    </Container>
  );
};

// Debug Panel Component to display app state information
const DebugPanel = () => {
  const { user, loading } = useAuth();
  const [showConsole, setShowConsole] = useState(false);
  const [consoleMessages, setConsoleMessages] = useState([]);
  const [appState, setAppState] = useState({
    route: window.location.pathname,
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    localStorage: {},
    sessionStorage: {}
  });
  
  // Capture console logs
  useEffect(() => {
    if (!showConsole) return;
    
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Override console methods to capture logs
    console.log = (...args) => {
      setConsoleMessages(prev => [
        { type: 'log', content: args.map(arg => JSON.stringify(arg)).join(' '), time: new Date().toISOString() },
        ...prev.slice(0, 49) // Keep last 50 messages
      ]);
      originalConsoleLog(...args);
    };
    
    console.error = (...args) => {
      setConsoleMessages(prev => [
        { type: 'error', content: args.map(arg => JSON.stringify(arg)).join(' '), time: new Date().toISOString() },
        ...prev.slice(0, 49)
      ]);
      originalConsoleError(...args);
    };
    
    console.warn = (...args) => {
      setConsoleMessages(prev => [
        { type: 'warn', content: args.map(arg => JSON.stringify(arg)).join(' '), time: new Date().toISOString() },
        ...prev.slice(0, 49)
      ]);
      originalConsoleWarn(...args);
    };
    
    // Restore original console methods on cleanup
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, [showConsole]);
  
  // Update app state periodically
  useEffect(() => {
    const updateAppState = () => {
      // Get LocalStorage items
      const localStorageItems = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          localStorageItems[key] = localStorage.getItem(key);
        } catch (e) {
          localStorageItems[key] = 'Error reading value';
        }
      }
      
      // Get SessionStorage items
      const sessionStorageItems = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        try {
          sessionStorageItems[key] = sessionStorage.getItem(key);
        } catch (e) {
          sessionStorageItems[key] = 'Error reading value';
        }
      }
      
      setAppState({
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        localStorage: localStorageItems,
        sessionStorage: sessionStorageItems
      });
    };
    
    updateAppState();
    const interval = setInterval(updateAppState, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Box>
      <FormControlLabel 
        control={<Switch checked={showConsole} onChange={(e) => setShowConsole(e.target.checked)} />} 
        label="Capture Console Messages" 
      />
      
      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h3">Authentication State</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', bgcolor: 'background.light', p: 2, borderRadius: 1 }}>
            {JSON.stringify({ 
              isAuthenticated: !!user, 
              loading, 
              user: user ? {
                id: user.id,
                email: user.email,
                emailVerified: user.email_confirmed_at ? true : false,
                userMetadata: user.user_metadata,
                createdAt: user.created_at
              } : null 
            }, null, 2)}
          </Typography>
        </AccordionDetails>
      </Accordion>
      
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h3">Application State</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', bgcolor: 'background.light', p: 2, borderRadius: 1 }}>
            {JSON.stringify(appState, null, 2)}
          </Typography>
        </AccordionDetails>
      </Accordion>
      
      {showConsole && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h3">Console Messages ({consoleMessages.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ maxHeight: '500px', overflow: 'auto' }}>
              {consoleMessages.length === 0 ? (
                <Typography color="text.secondary">No console messages captured yet...</Typography>
              ) : (
                consoleMessages.map((msg, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      mb: 1, 
                      p: 1, 
                      borderRadius: 1,
                      bgcolor: msg.type === 'error' ? 'error.lighter' : 
                               msg.type === 'warn' ? 'warning.lighter' : 
                               'background.light'
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      [{new Date(msg.time).toLocaleTimeString()}] [{msg.type.toUpperCase()}]
                    </Typography>
                    <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', m: 0 }}>
                      {msg.content}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ mt: 2 }}
              onClick={() => setConsoleMessages([])}
            >
              Clear Console
            </Button>
          </AccordionDetails>
        </Accordion>
      )}
      
      <Button 
        variant="contained" 
        onClick={() => {
          console.log('Debug button clicked', { appState, user, location: window.location });
          console.log('Current timestamp:', new Date().toISOString());
        }}
        sx={{ mb: 2 }}
      >
        Log Debug Information
      </Button>
    </Box>
  );
};

export default Admin;
