import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { supabase } from './services/supabase';

// Performance optimizations
import {
  initializePerformanceOptimizations,
  cleanupPerformanceOptimizations
} from './utils/performanceOptimizations';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import Find from './pages/Find';
import Host from './pages/Host';
import MatchDetail from './pages/MatchDetail';
import EditMatch from './pages/EditMatch';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import AuthCallback from './pages/Auth/AuthCallback';
import ErrorDebug from './pages/ErrorDebug';
import AuthDebug from './pages/AuthDebug';
import DirectHome from './pages/DirectHome';
import Friends from './pages/Friends';
import FindPlayers from './pages/Find/FindPlayers';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

// Auth provider
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './contexts/ToastContext';
import { AchievementProvider } from './contexts/AchievementContext';

// Create a theme instance based on the Sportea style guide
const theme = createTheme({
  palette: {
    primary: {
      main: '#8A1538', // Primary Maroon
      light: '#B52E4C', // Secondary Maroon Light
      dark: '#6E0F2D',
      lighter: 'rgba(138, 21, 56, 0.08)', // Very light maroon for hover/select states
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F9EBEE', // Secondary Maroon Pale
      light: '#FFFFFF',
      dark: '#E0D4D7',
      contrastText: '#8A1538',
    },
    error: {
      main: '#D32F2F', // Error Red
    },
    success: {
      main: '#34A853', // Success Green
    },
    warning: {
      main: '#F2C94C', // Accent Gold
    },
    info: {
      main: '#E63946', // Accent Red
    },
    text: {
      primary: '#424242', // Dark Gray
      secondary: '#9E9E9E', // Neutral Gray
    },
    background: {
      default: '#F5F5F7', // Light Gray
      paper: '#FFFFFF',
      light: '#F9F9FC',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontSize: '28px',
      fontWeight: 700,
      lineHeight: '34px',
      letterSpacing: '-0.2px',
    },
    h2: {
      fontSize: '24px',
      fontWeight: 700,
      lineHeight: '30px',
      letterSpacing: '-0.2px',
    },
    h3: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: '26px',
      letterSpacing: '-0.1px',
    },
    body1: {
      fontSize: '15px',
      lineHeight: '22px',
    },
    body2: {
      fontSize: '13px',
      lineHeight: '18px',
      letterSpacing: '0.1px',
    },
    button: {
      fontSize: '16px',
      fontWeight: 500,
      lineHeight: '24px',
      letterSpacing: '0.1px',
      textTransform: 'none',
    },
    caption: {
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: '16px',
      letterSpacing: '0.2px',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '12px 16px',
          minHeight: 48,
          boxShadow: 'none',
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#B52E4C', // Secondary Maroon Light
            boxShadow: 'none',
          },
        },
        outlinedPrimary: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
          padding: 16,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            height: 56,
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// Error Boundary component to catch rendering errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <p>The application encountered an error. Please refresh the page.</p>
          <pre style={{ color: 'red', textAlign: 'left' }}>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component to handle root path redirects based on authentication state
const RootRedirect = () => {
  const { user, loading } = useAuth();
  const [timeoutElapsed, setTimeoutElapsed] = React.useState(false);
  const [directSessionCheck, setDirectSessionCheck] = React.useState({ completed: false, hasSession: false });
  const navigate = useNavigate(); // Now this is inside Router context
  
  console.log('RootRedirect - Auth state:', { user, loading, timeoutElapsed, directCheck: directSessionCheck });
  
  // FIXED: Check session directly with Supabase
  React.useEffect(() => {
    // Only run this check if we're loading and haven't done the direct check yet
    if (loading && !directSessionCheck.completed) {
      const checkSessionDirectly = async () => {
        try {
          console.log('RootRedirect - Checking session directly with Supabase');
          const { data } = await supabase.auth.getSession();
          const hasSession = !!data?.session;
          console.log('RootRedirect - Direct session check result:', hasSession ? 'Has session' : 'No session');
          
          setDirectSessionCheck({ completed: true, hasSession });
          
          // If we have a session but context doesn't show user, force navigation
          if (hasSession && !user) {
            console.log('RootRedirect - Session exists but context missing, forcing navigation to /home');
            // Use direct navigate call to bypass React Router issues
            navigate('/home', { replace: true });
          }
        } catch (error) {
          console.error('RootRedirect - Error checking session:', error);
          setDirectSessionCheck({ completed: true, hasSession: false });
        }
      };
      
      checkSessionDirectly();
    }
  }, [loading, user, directSessionCheck.completed, navigate]);
  
  // Safety timeout to prevent infinite loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('RootRedirect - Safety timeout triggered');
        setTimeoutElapsed(true);
        
        // If timeout elapsed and we haven't done a direct check, force one now
        if (!directSessionCheck.completed) {
          supabase.auth.getSession().then(({ data }) => {
            const hasSession = !!data?.session;
            console.log('RootRedirect - Timeout expired, emergency session check:', hasSession ? 'Has session' : 'No session');
            
            // Force navigation based on direct session check
            if (hasSession) {
              console.log('RootRedirect - Emergency navigation to /home');
              navigate('/home', { replace: true });
            } else {
              console.log('RootRedirect - Emergency navigation to /login');
              navigate('/login', { replace: true });
            }
          });
        }
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [loading, directSessionCheck.completed, navigate]);
  
  // If direct check completed and we have a session, go to home
  if (directSessionCheck.completed && directSessionCheck.hasSession) {
    console.log('RootRedirect - Direct check says we have a session, going to /home');
    return <Navigate to="/home" replace />;
  }
  
  // If still loading auth state and timeout hasn't elapsed, show a loading indicator
  if ((loading && !timeoutElapsed) || (!directSessionCheck.completed && !timeoutElapsed)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'background.default'
        }}
      >
        <CircularProgress color="primary" size={60} thickness={4} sx={{ mb: 3 }} />
        <Typography variant="h2" color="primary" gutterBottom>
          Sportea
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Loading your sports experience...
        </Typography>
        {timeoutElapsed && (
          <Button 
            variant="contained" 
            sx={{ mt: 3 }}
            onClick={() => {
              // Force navigation to home if timeout elapsed
              navigate('/home', { replace: true });
            }}
          >
            Continue to App
          </Button>
        )}
      </Box>
    );
  }
  
  // If user is authenticated or we have a session, redirect to home, otherwise to login
  return user || directSessionCheck.hasSession ? 
    <Navigate to="/home" replace /> : 
    <Navigate to="/login" replace />;
};

function App() {
  console.log('App component rendering');

  // Initialize performance optimizations on app startup
  useEffect(() => {
    initializePerformanceOptimizations();

    // Cleanup on app unmount
    return () => {
      cleanupPerformanceOptimizations();
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <ToastProvider>
            <AchievementProvider>
          <ErrorBoundary>
            <Router>
              <Routes>
                {/* Auth routes (not requiring authentication) */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/not-found" element={<NotFound />} />
                <Route path="/debug" element={<ErrorDebug />} />
                <Route path="/auth-debug" element={<AuthDebug />} />
                <Route path="/direct-home" element={<DirectHome />} />

                {/* Admin routes (separate authentication) */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
                
                {/* Root route with conditional redirect */}
                <Route path="/" element={
                  <ErrorBoundary>
                    <RootRedirect />
                  </ErrorBoundary>
                } />
                
                {/* Protected routes that require authentication */}
                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/profile/edit" element={<ProfileEdit />} />
                  <Route path="/find" element={<Find />} />
                  <Route path="/find/players" element={<FindPlayers />} />
                  <Route path="/host" element={<Host />} />
                  <Route path="/match/:matchId" element={<MatchDetail />} />
                  <Route path="/edit-match/:matchId" element={<EditMatch />} />
                  <Route path="/friends" element={<Friends />} />
                </Route>
                
                {/* Fallback for undefined routes */}
                <Route path="*" element={<Navigate to="/not-found" replace />} />
              </Routes>
            </Router>
          </ErrorBoundary>
            </AchievementProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
