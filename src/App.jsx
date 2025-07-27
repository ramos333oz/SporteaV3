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
import {
  initializeLoggingOptimizations,
  monitorLoggingPerformance
} from './utils/loggingOptimizations';

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
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import ErrorDebug from './pages/ErrorDebug';
import AuthDebug from './pages/AuthDebug';
import DirectHome from './pages/DirectHome';
import Friends from './pages/Friends';
import FindPlayers from './pages/Find/FindPlayers';
import Leaderboard from './pages/Leaderboard';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

// Auth provider
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './contexts/ToastContext';
import { AchievementProvider } from './contexts/AchievementContext';
import { LevelUpProvider } from './contexts/LevelUpContext';

// Stagewise Toolbar integration
import { StagewiseToolbar } from '@stagewise/toolbar-react';
import ReactPlugin from '@stagewise-plugins/react';

// Create a theme instance based on the Elegant Luxury theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#9b2c2c', // Elegant Luxury Primary
      light: '#b91c1c',
      dark: '#7f1d1d',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#fdf2d6', // Elegant Luxury Secondary
      light: '#fef3c7',
      dark: '#805500',
      contrastText: '#805500',
    },
    error: {
      main: '#991b1b', // Elegant Luxury Destructive
      contrastText: '#ffffff',
    },
    success: {
      main: '#34A853', // Keep existing success color
    },
    warning: {
      main: '#b45309', // Elegant Luxury Chart-4
    },
    info: {
      main: '#b91c1c', // Elegant Luxury Chart-1
    },
    text: {
      primary: '#1a1a1a', // Elegant Luxury Foreground
      secondary: '#57534e', // Elegant Luxury Muted Foreground
    },
    background: {
      default: '#faf7f5', // Elegant Luxury Background
      paper: '#faf7f5', // Elegant Luxury Card
      light: '#f0ebe8', // Elegant Luxury Muted
    },
  },
  typography: {
    // Font families for the Elegant Luxury theme using CSS variables
    fontFamily: 'var(--font-sans)',

    // Headings use Libre Baskerville for elegance
    h1: {
      fontFamily: 'var(--font-serif)',
      fontSize: '2rem',        // 32px
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: 'var(--font-serif)',
      fontSize: '1.75rem',     // 28px
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: 'var(--font-serif)',
      fontSize: '1.5rem',      // 24px
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '0',
    },
    h4: {
      fontFamily: 'var(--font-serif)',
      fontSize: '1.25rem',     // 20px
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
    h5: {
      fontFamily: 'var(--font-serif)',
      fontSize: '1.125rem',    // 18px
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0',
    },
    h6: {
      fontFamily: 'var(--font-serif)',
      fontSize: '1rem',        // 16px
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '0',
    },

    // Body text uses Poppins for readability
    body1: {
      fontFamily: 'var(--font-sans)',
      fontSize: '1rem',        // 16px
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0',
    },
    body2: {
      fontFamily: 'var(--font-sans)',
      fontSize: '0.875rem',    // 14px
      fontWeight: 400,
      lineHeight: 1.43,
      letterSpacing: '0.01em',
    },

    // Subtitles for UI elements
    subtitle1: {
      fontFamily: 'var(--font-sans)',
      fontSize: '1rem',        // 16px
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    },
    subtitle2: {
      fontFamily: 'var(--font-sans)',
      fontSize: '0.875rem',    // 14px
      fontWeight: 600,
      lineHeight: 1.43,
      letterSpacing: '0.01em',
    },

    // UI elements
    button: {
      fontFamily: 'var(--font-sans)',
      fontSize: '0.875rem',    // 14px
      fontWeight: 500,
      lineHeight: 1.43,
      letterSpacing: '0.02em',
      textTransform: 'none',
    },
    caption: {
      fontFamily: 'var(--font-sans)',
      fontSize: '0.75rem',     // 12px
      fontWeight: 500,
      lineHeight: 1.33,
      letterSpacing: '0.03em',
    },

    // Technical elements (for future use)
    overline: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.75rem',     // 12px
      fontWeight: 400,
      lineHeight: 1.33,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          minHeight: 48,
          boxShadow: 'none',
          fontFamily: 'var(--font-sans) !important',
          fontWeight: 500,
        },
        containedPrimary: {
          backgroundColor: 'var(--primary)',
          color: 'var(--primary-foreground)',
          '&:hover': {
            backgroundColor: 'var(--chart-1)',
            boxShadow: 'none',
          },
        },
        outlinedPrimary: {
          borderColor: 'var(--primary)',
          color: 'var(--primary)',
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: 'var(--accent)',
            borderColor: 'var(--primary)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: 16,
          backgroundColor: 'var(--card)',
          color: 'var(--card-foreground)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            height: 56,
            borderRadius: 'var(--radius)',
            backgroundColor: 'var(--background)',
            borderColor: 'var(--border)',
            fontFamily: 'var(--font-sans) !important',
            '&:hover': {
              borderColor: 'var(--ring)',
            },
            '&.Mui-focused': {
              borderColor: 'var(--ring)',
            },
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

  console.log('RootRedirect - Auth state:', { user: !!user, loading });

  // Show loading while authentication is being determined
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading your sports experience...</Typography>
      </Box>
    );
  }

  // Redirect based on authentication state
  return user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />;
};

function App() {
  console.log('App component rendering');

  // Initialize performance optimizations on app startup
  useEffect(() => {
    initializePerformanceOptimizations();
    initializeLoggingOptimizations();
    monitorLoggingPerformance();

    // Cleanup on app unmount
    return () => {
      cleanupPerformanceOptimizations();
    };
  }, []);

  // Only show StagewiseToolbar in development mode
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {isDev && (
          <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
        )}
        <AuthProvider>
          <ToastProvider>
            <AchievementProvider>
              <LevelUpProvider>
                <ErrorBoundary>
                  <Router>
                    <Routes>
                      {/* Auth routes (not requiring authentication) */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
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
                        <Route path="/leaderboard" element={<Leaderboard />} />
                      </Route>
                      {/* Fallback for undefined routes */}
                      <Route path="*" element={<Navigate to="/not-found" replace />} />
                    </Routes>
                  </Router>
                </ErrorBoundary>
              </LevelUpProvider>
            </AchievementProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
