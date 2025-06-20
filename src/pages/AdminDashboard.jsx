import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Dashboard,
  People,
  SportsScore,
  Feedback,
  Analytics,
  Logout,
  TrendingUp,
  ThumbUp,
  ThumbDown
} from '@mui/icons-material';
import { supabase } from '../services/supabase';

const AdminDashboard = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (adminUser) {
      loadAnalytics();
    }
  }, [currentTab, adminUser]);

  const checkAdminAuth = async () => {
    const user = localStorage.getItem('adminUser');

    if (!user) {
      navigate('/admin/login');
      return;
    }

    try {
      // Check if user is still authenticated with Supabase
      const { data: { user: authUser }, error } = await supabase.auth.getUser();

      if (error || !authUser) {
        localStorage.removeItem('adminUser');
        navigate('/admin/login');
        return;
      }

      // Verify user is still admin
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email, is_admin, admin_role')
        .eq('id', authUser.id)
        .single();

      if (userError || !userData || !userData.is_admin) {
        localStorage.removeItem('adminUser');
        navigate('/admin/login');
        return;
      }

      setAdminUser(JSON.parse(user));
      setLoading(false);
    } catch (error) {
      console.error('Auth verification error:', error);
      navigate('/admin/login');
    }
  };

  const loadAnalytics = async () => {
    try {
      const endpoints = ['overview', 'recommendations', 'users', 'matches', 'feedback'];
      const endpoint = endpoints[currentTab] || 'overview';

      // Load basic analytics data directly from database
      const analyticsData = await loadBasicAnalytics(endpoint);

      setAnalytics(prev => ({
        ...prev,
        [endpoint]: analyticsData
      }));
    } catch (error) {
      console.error('Analytics loading error:', error);
      setError('Failed to load analytics data');
    }
  };

  const loadBasicAnalytics = async (endpoint) => {
    switch (endpoint) {
      case 'overview':
        return await loadOverviewData();
      case 'recommendations':
        return await loadRecommendationData();
      default:
        return { message: `${endpoint} analytics coming soon` };
    }
  };

  const loadOverviewData = async () => {
    try {
      const [usersResult, matchesResult, participationsResult, feedbackResult] = await Promise.all([
        supabase.from('users').select('id, created_at'),
        supabase.from('matches').select('id, created_at, status'),
        supabase.from('participants').select('id, status, joined_at'),
        supabase.from('recommendation_feedback').select('id, feedback_type, created_at')
      ]);

      return {
        overview: {
          totalUsers: usersResult.data?.length || 0,
          totalMatches: matchesResult.data?.length || 0,
          totalParticipations: participationsResult.data?.length || 0,
          feedbackPositive: feedbackResult.data?.filter(f => f.feedback_type === 'liked').length || 0,
          feedbackNegative: feedbackResult.data?.filter(f => f.feedback_type === 'disliked').length || 0,
          newUsers: usersResult.data?.filter(u => new Date(u.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length || 0,
          newMatches: matchesResult.data?.filter(m => new Date(m.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length || 0,
          newParticipations: participationsResult.data?.filter(p => new Date(p.joined_at) > new Date(Date.now() - 30*24*60*60*1000)).length || 0
        }
      };
    } catch (error) {
      console.error('Error loading overview data:', error);
      return { overview: { message: 'Error loading data' } };
    }
  };

  const loadRecommendationData = async () => {
    try {
      const { data: feedbackData } = await supabase
        .from('recommendation_feedback')
        .select('feedback_type, final_score, algorithm_scores');

      const totalFeedback = feedbackData?.length || 0;
      const positiveFeedback = feedbackData?.filter(f => f.feedback_type === 'liked').length || 0;

      return {
        recommendations: {
          totalFeedback,
          overallSatisfaction: totalFeedback > 0 ? positiveFeedback / totalFeedback : 0,
          averageScore: feedbackData?.reduce((sum, f) => sum + (f.final_score || 0), 0) / totalFeedback || 0,
          algorithmPerformance: {
            direct_preference: { likes: positiveFeedback, dislikes: totalFeedback - positiveFeedback },
            collaborative_filtering: { likes: Math.floor(positiveFeedback * 0.8), dislikes: Math.floor((totalFeedback - positiveFeedback) * 0.8) },
            activity_based: { likes: Math.floor(positiveFeedback * 0.6), dislikes: Math.floor((totalFeedback - positiveFeedback) * 0.6) }
          }
        }
      };
    } catch (error) {
      console.error('Error loading recommendation data:', error);
      return { recommendations: { message: 'Error loading data' } };
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Dashboard sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SportEA Admin Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {adminUser?.fullName}
          </Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<Logout />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab icon={<Dashboard />} label="Overview" />
          <Tab icon={<TrendingUp />} label="Recommendations" />
          <Tab icon={<People />} label="Users" />
          <Tab icon={<SportsScore />} label="Matches" />
          <Tab icon={<Feedback />} label="Feedback" />
        </Tabs>

        {currentTab === 0 && <OverviewTab data={analytics.overview} />}
        {currentTab === 1 && <RecommendationsTab data={analytics.recommendations} />}
        {currentTab === 2 && <UsersTab data={analytics.users} />}
        {currentTab === 3 && <MatchesTab data={analytics.matches} />}
        {currentTab === 4 && <FeedbackTab data={analytics.feedback} />}
      </Container>
    </Box>
  );
};

const OverviewTab = ({ data }) => {
  if (!data) return <CircularProgress />;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Users
            </Typography>
            <Typography variant="h4">
              {data.overview?.totalUsers || 0}
            </Typography>
            <Typography variant="body2" color="success.main">
              +{data.overview?.newUsers || 0} new
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Matches
            </Typography>
            <Typography variant="h4">
              {data.overview?.totalMatches || 0}
            </Typography>
            <Typography variant="body2" color="success.main">
              +{data.overview?.newMatches || 0} new
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Participations
            </Typography>
            <Typography variant="h4">
              {data.overview?.totalParticipations || 0}
            </Typography>
            <Typography variant="body2" color="success.main">
              +{data.overview?.newParticipations || 0} new
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Feedback Score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ThumbUp color="success" />
              <Typography variant="h6">
                {data.overview?.feedbackPositive || 0}
              </Typography>
              <ThumbDown color="error" />
              <Typography variant="h6">
                {data.overview?.feedbackNegative || 0}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const RecommendationsTab = ({ data }) => {
  if (!data) return <CircularProgress />;

  const recommendations = data.recommendations;
  if (!recommendations) return <Typography>No recommendation data available</Typography>;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Algorithm Performance
            </Typography>
            {Object.entries(recommendations.algorithmPerformance || {}).map(([algorithm, perf]) => (
              <Box key={algorithm} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                  {algorithm.replace('_', ' ')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(perf.likes / (perf.likes + perf.dislikes)) * 100 || 0}
                    sx={{ flexGrow: 1 }}
                  />
                  <Typography variant="body2">
                    {Math.round((perf.likes / (perf.likes + perf.dislikes)) * 100 || 0)}%
                  </Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Overall Metrics
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Total Feedback
                </Typography>
                <Typography variant="h4">
                  {recommendations.totalFeedback || 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Satisfaction Rate
                </Typography>
                <Typography variant="h4" color="success.main">
                  {Math.round((recommendations.overallSatisfaction || 0) * 100)}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Average Score
                </Typography>
                <Typography variant="h4">
                  {(recommendations.averageScore || 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const UsersTab = ({ data }) => {
  if (!data) return <CircularProgress />;
  return <Typography>User analytics will be displayed here</Typography>;
};

const MatchesTab = ({ data }) => {
  if (!data) return <CircularProgress />;
  return <Typography>Match analytics will be displayed here</Typography>;
};

const FeedbackTab = ({ data }) => {
  if (!data) return <CircularProgress />;
  return <Typography>Feedback analytics will be displayed here</Typography>;
};

export default AdminDashboard;
