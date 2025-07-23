import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  CircularProgress,
  Alert,
  Link,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  
  const { updatePassword, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if we have a valid session (user should be authenticated via the reset link)
    const checkTokenValidity = async () => {
      try {
        // If user is authenticated, the token was valid
        if (user) {
          setIsValidToken(true);
        } else {
          setError('Invalid or expired reset link. Please request a new password reset.');
        }
      } catch (err) {
        console.error('Error checking token validity:', err);
        setError('Invalid or expired reset link. Please request a new password reset.');
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkTokenValidity();
  }, [user]);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setError('Both password fields are required');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error } = await updatePassword(password);
      
      if (error) {
        throw new Error(error);
      }
      
      setSuccessMessage('Password updated successfully! Redirecting to login...');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            message: 'Password reset successful! You can now log in with your new password.',
            type: 'success'
          }
        });
      }, 2000);
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (isCheckingToken) {
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
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Verifying reset link...
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (!isValidToken) {
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
              Invalid Reset Link
            </Typography>
          </Box>

          <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
            {error}
          </Alert>

          <Button
            component={RouterLink}
            to="/forgot-password"
            variant="contained"
            size="large"
            sx={{ mb: 2, height: 48, width: '100%' }}
          >
            Request New Reset Link
          </Button>

          <Link 
            component={RouterLink} 
            to="/login"
            color="primary"
            variant="body2"
            sx={{ fontWeight: 500 }}
          >
            Back to Login
          </Link>
        </Paper>
      </Container>
    );
  }

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
            Set New Password
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
            Enter your new password below
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2, width: '100%' }}>{successMessage}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Must be at least 8 characters with uppercase, lowercase, and number"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            helperText="Re-enter your new password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowConfirmPassword}
                    edge="end"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
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
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link 
            component={RouterLink} 
            to="/login"
            color="primary"
            variant="body2"
            sx={{ fontWeight: 500 }}
          >
            Back to Login
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResetPassword;
