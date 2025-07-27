import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Link,
  Container,
  CircularProgress,
  FormControlLabel,
  Switch,
  Alert
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import DotGrid from '../components/animations/DotGrid';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  
  const { signIn, signUp, loading: authLoading, user, setUser, ensureUserProfile, supabase } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect authenticated users
  useEffect(() => {
    if (user && !authLoading) {
      console.log('Login: User is authenticated, redirecting to home');
      const from = location.state?.from?.pathname || '/home';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  // Handle verification success message from AuthCallback
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state to prevent the message from persisting on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Function to resend verification email
  const handleResendVerification = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) {
        throw error;
      }
      
      setVerificationSent(true);
      setSuccessMessage('Verification email has been resent. Please check your inbox.');
    } catch (err) {
      console.error('Error sending verification email:', err);
      setError('Failed to send verification email: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    
    // Email domain validation - allow test domains in development
    const allowedDomains = ['@student.uitm.edu.my', '@example.com', '@test.local', '@mailhog.example', '@gmail.com', '@outlook.com', '@yahoo.com', '@hotmail.com'];
    const isValidDomain = allowedDomains.some(domain => email.endsWith(domain));

    if (!isValidDomain) {
      setError('Only @student.uitm.edu.my email addresses are allowed (test domains: @example.com, @test.local, @mailhog.example, @gmail.com, @outlook.com, @yahoo.com, @hotmail.com)');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('Login: Attempting to sign in with email:', email);
      
      // Check if user profile exists in the public.users table
      const { data: profileData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      // Note: We can't directly check auth.users table from client-side code
      // We'll rely on the sign-in response and handle profile creation if needed
      
      // Attempt to sign in with rememberMe preference
      const result = await signIn(email, password, rememberMe);
      
      // Handle different response formats
      const error = result?.error || (typeof result === 'object' && 'error' in result ? result.error : null);
      
      if (error) {
        console.error('Login: Error during sign in:', error);
        
        // Try to recover from "Invalid login credentials" by checking if it's a profile issue
        if (error.message?.includes('Invalid login credentials')) {
          // Check directly with Supabase Auth to see if credentials are valid
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (authData?.user) {
            console.log('Login: Credentials are valid but profile may be missing, creating profile');
            // Create user profile since it's missing
            await createUserProfile(authData.user.id, email);
            // Auth state will update automatically
            setSuccessMessage('Profile created! Redirecting...');
            return;
          } else {
            throw new Error('Invalid email or password. Please try again.');
          }
        } else if (error.message?.includes('Email not confirmed')) {
          setVerificationSent(true);
          throw new Error('Please verify your email before logging in.');
        } else {
          throw new Error(error.message || 'Authentication failed');
        }
      }
      
      console.log('Login: Sign in successful, waiting for auth state to update');
      
      // Enhanced profile creation with backup mechanism
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        console.log('Login: Ensuring user profile exists');
        const profileResult = await ensureUserProfile(sessionData.session.user.id, email);

        if (!profileResult.success) {
          console.error('Login: Failed to ensure user profile:', profileResult.error);
          // Don't block login, but log the issue
          setError('Profile creation failed, but login successful. Some features may not work properly.');
        } else if (profileResult.created) {
          console.log(`Login: Profile created via ${profileResult.method}`);
        }
      }
      
      // Login successful - let the auth state change trigger navigation
      console.log('Login: Sign in successful, auth state will update automatically');
      setSuccessMessage('Login successful! Redirecting...');
      
    } catch (err) {
      console.error('Login: Caught error:', err);
      setError(err.message || 'Failed to sign in. Please try again.');
      setIsLoading(false);
    }
    // Don't set isLoading to false here, let the timeout or error handler do it
  };
  
  // Helper function to create user profile
  const createUserProfile = async (userId, userEmail) => {
    try {
      console.log('Creating user profile for:', userEmail, 'with ID:', userId);
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userEmail,
          username: userEmail.split('@')[0],
          created_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.warn('Failed to create user profile:', profileError);
        // Try upsert as a fallback
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: userEmail,
            username: userEmail.split('@')[0],
            created_at: new Date().toISOString()
          });
          
        if (upsertError) {
          console.error('Failed to upsert user profile:', upsertError);
        }
      }
    } catch (err) {
      console.error('Exception creating profile:', err);
    }
  };
  

  
  return (
    <Box sx={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      {/* Animated Background */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          opacity: 0.15, // Subtle background effect
        }}
      >
        <DotGrid
          dotSize={8}
          gap={25}
          baseColor="#9b2c2c"
          activeColor="#b91c1c"
          proximity={120}
          shockRadius={200}
          shockStrength={4}
          resistance={600}
          returnDuration={1.2}
        />
      </Box>

      {/* Login Content */}
      <Container
        component="main"
        maxWidth="sm"
        sx={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 3,
            backgroundColor: 'rgba(250, 247, 245, 0.95)', // Semi-transparent background
            backdropFilter: 'blur(10px)', // Glass effect
            border: '1px solid rgba(155, 44, 44, 0.1)', // Subtle border
          }}
        >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            component="img"
            src="/Sportea_logo/Sportea.png"
            alt="Sportea Logo"
            sx={{
              height: 240,
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
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
            Sign in to your Sportea account
          </Typography>
        </Box>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2, width: '100%' }}
            action={
              verificationSent && (
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={handleResendVerification}
                  disabled={isLoading}
                >
                  Resend
                </Button>
              )
            }
          >
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2, width: '100%' }}>
            {successMessage}
          </Alert>
        )}
        
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
            placeholder="student@student.uitm.edu.my"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 1 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  color="primary"
                />
              }
              label="Remember me"
            />
            <Link 
              component={RouterLink} 
              to="/forgot-password"
              color="primary"
              variant="body2"
            >
              Forgot password?
            </Link>
          </Box>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mb: 2, height: 48 }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body1">
              Don't have an account?{' '}
              <Link component={RouterLink} to="/register" color="primary">
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
    </Box>
  );
};

export default Login;
