import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper
} from '@mui/material';
import { AdminPanelSettings, Security } from '@mui/icons-material';
import { supabase } from '../services/supabase';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use regular Supabase auth with admin credentials
      // For demo: admin@sportea.com / admin123
      const email = credentials.username.includes('@')
        ? credentials.username
        : '2022812796@student.uitm.edu.my'; // Default admin email

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: credentials.password
      });

      if (authError) {
        throw authError;
      }

      // Check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email, is_admin, admin_role')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        throw new Error('Failed to get user data');
      }

      if (!userData.is_admin) {
        // Sign out the user since they're not admin
        await supabase.auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }

      // Store admin info
      localStorage.setItem('adminUser', JSON.stringify({
        id: userData.id,
        email: userData.email,
        fullName: userData.full_name,
        role: userData.admin_role
      }));

      // Redirect to admin dashboard
      navigate('/admin/dashboard');

    } catch (error) {
      console.error('Admin login error:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        minWidth: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto'
      }}
    >
      <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            background: 'rgba(255,255,255,0.95)'
          }}
        >
          <Card elevation={0} sx={{ background: 'transparent' }}>
            <CardContent sx={{ p: 5 }}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                  component="img"
                  src="/Sportea_logo/Sportea.png"
                  alt="Sportea Logo"
                  sx={{
                    height: 120,
                    width: 'auto',
                    mb: 3,
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                  }}
                />
                <Typography
                  variant="h4"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1
                  }}
                >
                  Admin Portal
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Sportea Analytics Dashboard
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleLogin}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={credentials.username}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                  autoFocus
                  disabled={loading}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.9)',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                      }
                    }
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                  disabled={loading}
                  sx={{
                    mb: 4,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.9)',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                      }
                    }
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={<Security />}
                  sx={{
                    mt: 2,
                    mb: 3,
                    py: 1.8,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                      boxShadow: '0 12px 24px rgba(102, 126, 234, 0.4)',
                      transform: 'translateY(-1px)'
                    },
                    '&:disabled': {
                      background: 'linear-gradient(135deg, #ccc 0%, #999 100%)',
                      boxShadow: 'none'
                    }
                  }}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Box>

              <Box
                sx={{
                  mt: 3,
                  p: 3,
                  bgcolor: 'rgba(102, 126, 234, 0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}
              >
                <Typography
                  variant="body2"
                  color="primary.main"
                  display="block"
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  Demo Credentials
                </Typography>
                <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Email: 2022812796@student.uitm.edu.my
                </Typography>
                <Typography variant="body2" color="text.secondary" display="block">
                  Password: (use your regular password)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminLogin;
