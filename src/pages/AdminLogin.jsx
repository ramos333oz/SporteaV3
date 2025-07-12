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
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <Paper elevation={10} sx={{ width: '100%', maxWidth: 400 }}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <AdminPanelSettings 
                  sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} 
                />
                <Typography variant="h4" component="h1" gutterBottom>
                  Admin Login
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  SportEA Analytics Dashboard
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
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={<Security />}
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Box>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  <strong>Demo Credentials:</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Email: 2022812796@student.uitm.edu.my
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Password: (use your regular password)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminLogin;
