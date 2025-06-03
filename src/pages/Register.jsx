import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link,
  Container,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  FormHelperText,
  Divider
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ResendConfirmation from '../components/ResendConfirmation';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    studentId: '',
    password: '',
    confirmPassword: ''
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [existingEmail, setExistingEmail] = useState('');
  
  const { signUp } = useAuth();
  const navigate = useNavigate();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;
    
    let strength = 0;
    // Length check
    if (password.length >= 8) strength += 25;
    // Contains lowercase letters
    if (/[a-z]/.test(password)) strength += 25;
    // Contains uppercase letters
    if (/[A-Z]/.test(password)) strength += 25;
    // Contains numbers or special characters
    if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 25;
    
    return strength;
  };
  
  const passwordStrength = calculatePasswordStrength(formData.password);
  
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 50) return 'error';
    if (passwordStrength < 75) return 'warning';
    return 'success';
  };
  
  const validateForm = () => {
    // Email domain validation
    if (!formData.email.endsWith('@student.uitm.edu.my')) {
      setError('Only @student.uitm.edu.my email addresses are allowed');
      return false;
    }
    
    // Password match validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    // Password strength validation
    if (passwordStrength < 50) {
      setError('Password is too weak. Please include uppercase letters, numbers, or special characters.');
      return false;
    }
    
    // Terms agreement validation
    if (!agreeToTerms) {
      setError('You must agree to the Terms and Conditions');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userData = {
        full_name: formData.fullName,
        student_id: formData.studentId
      };
      
      const { data, error } = await signUp(formData.email, formData.password, userData);
      
      if (error) {
        // Check if this is a case of unverified existing account
        if (error.includes('User already registered') || 
            error.toLowerCase().includes('already exists')) {
          setNeedsVerification(true);
          setExistingEmail(formData.email);
          throw new Error('This email is already registered but not verified.');
        }
        throw new Error(error);
      }
      
      // Set verification sent flag to show verification pending screen
      setVerificationSent(true);
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verification pending screen
  if (verificationSent) {
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
            borderRadius: 3,
            backgroundColor: 'background.light'
          }}
        >
          <Box 
            sx={{ 
              width: 64, 
              height: 64, 
              borderRadius: '50%', 
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3
            }}
          >
            <Box 
              component="span" 
              sx={{ 
                color: 'white',
                fontSize: 36
              }}
            >
              ✉️
            </Box>
          </Box>
          
          <Typography 
            variant="h2" 
            component="h1" 
            color="primary" 
            sx={{ mb: 2, textAlign: 'center' }}
          >
            Check Your Email
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
            We sent a verification link to <strong>{formData.email}</strong>
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Click the link in the email to verify your account. If you don't see it, check your spam folder.
          </Typography>
          
          <Button
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
            onClick={() => navigate('/login')}
          >
            Back to Login
          </Button>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container component="main" maxWidth="sm" sx={{ py: 4 }}>
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
        <Typography 
          variant="h1" 
          component="h1" 
          color="primary" 
          sx={{ mb: 2, textAlign: 'center' }}
        >
          Join Sportea
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
          Connect with UiTM students for sports
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}
        
        {needsVerification && (
          <>
            <Divider sx={{ my: 3, width: '100%' }}>
              <Typography variant="body2" color="text.secondary">
                Need to verify your email?
              </Typography>
            </Divider>
            <ResendConfirmation prefilledEmail={existingEmail} />
          </>
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
            value={formData.email}
            onChange={handleChange}
            placeholder="student@student.uitm.edu.my"
            helperText="Must be a valid @student.uitm.edu.my email"
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="fullName"
            label="Full Name"
            name="fullName"
            autoComplete="name"
            value={formData.fullName}
            onChange={handleChange}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="studentId"
            label="Student ID"
            name="studentId"
            value={formData.studentId}
            onChange={handleChange}
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
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            sx={{ mb: 1 }}
          />
          
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={passwordStrength} 
              color={getPasswordStrengthColor()}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <FormHelperText>
              {passwordStrength < 50 && 'Weak password'}
              {passwordStrength >= 50 && passwordStrength < 75 && 'Moderate password'}
              {passwordStrength >= 75 && 'Strong password'}
            </FormHelperText>
          </Box>
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            sx={{ mb: 3 }}
          />
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={agreeToTerms} 
                onChange={(e) => setAgreeToTerms(e.target.checked)} 
                color="primary"
              />
            }
            label={
              <Typography variant="caption">
                I agree to the {' '}
                <Link component={RouterLink} to="/terms" color="primary">
                  Terms and Conditions
                </Link>
              </Typography>
            }
            sx={{ mb: 3 }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mb: 2, height: 48 }}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body1">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" color="primary">
                Sign In
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
