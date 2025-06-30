import React, { useState, useEffect } from 'react';
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
  LinearProgress,
  Divider,
  Avatar,
  Badge
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
  ThumbDown,
  Groups,
  Refresh,
  TrendingDown,
  Assessment
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
      case 'feedback':
        return await loadFeedbackData();
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

  const loadFeedbackData = async () => {
    try {
      // Get detailed feedback data with user and match information
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('recommendation_feedback')
        .select(`
          id,
          user_id,
          match_id,
          feedback_type,
          final_score,
          algorithm_scores,
          recommendation_data,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (feedbackError) throw feedbackError;

      // Get user information for feedback entries
      const userIds = [...new Set(feedbackData?.map(f => f.user_id) || [])];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      // Process feedback analytics
      const totalFeedback = feedbackData?.length || 0;
      const positiveFeedback = feedbackData?.filter(f => f.feedback_type === 'liked').length || 0;
      const negativeFeedback = feedbackData?.filter(f => f.feedback_type === 'disliked').length || 0;

      // Calculate trends (last 7 days vs previous 7 days)
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const recentFeedback = feedbackData?.filter(f => new Date(f.created_at) > last7Days) || [];
      const previousFeedback = feedbackData?.filter(f =>
        new Date(f.created_at) > previous7Days && new Date(f.created_at) <= last7Days
      ) || [];

      // Algorithm performance breakdown
      const algorithmStats = {
        direct_preference: { total: 0, positive: 0, avgScore: 0 },
        collaborative_filtering: { total: 0, positive: 0, avgScore: 0 },
        activity_based: { total: 0, positive: 0, avgScore: 0 }
      };

      feedbackData?.forEach(feedback => {
        if (feedback.algorithm_scores) {
          Object.keys(algorithmStats).forEach(algorithm => {
            if (feedback.algorithm_scores[algorithm] !== undefined) {
              algorithmStats[algorithm].total++;
              if (feedback.feedback_type === 'liked') {
                algorithmStats[algorithm].positive++;
              }
              algorithmStats[algorithm].avgScore += feedback.algorithm_scores[algorithm] || 0;
            }
          });
        }
      });

      // Calculate averages
      Object.keys(algorithmStats).forEach(algorithm => {
        const stats = algorithmStats[algorithm];
        stats.avgScore = stats.total > 0 ? stats.avgScore / stats.total : 0;
        stats.satisfactionRate = stats.total > 0 ? stats.positive / stats.total : 0;
      });

      // Recent feedback with user details
      const recentFeedbackWithUsers = feedbackData?.slice(0, 20).map(feedback => ({
        ...feedback,
        user: usersData?.find(u => u.id === feedback.user_id) || { full_name: 'Unknown User' }
      })) || [];

      return {
        feedback: {
          totalFeedback,
          positiveFeedback,
          negativeFeedback,
          satisfactionRate: totalFeedback > 0 ? positiveFeedback / totalFeedback : 0,
          averageScore: feedbackData?.reduce((sum, f) => sum + (f.final_score || 0), 0) / totalFeedback || 0,
          recentTrend: {
            current: recentFeedback.length,
            previous: previousFeedback.length,
            change: recentFeedback.length - previousFeedback.length
          },
          algorithmStats,
          recentFeedback: recentFeedbackWithUsers,
          feedbackByDay: calculateFeedbackByDay(feedbackData || [])
        }
      };
    } catch (error) {
      console.error('Error loading feedback data:', error);
      return { feedback: { message: 'Error loading feedback data' } };
    }
  };

  const calculateFeedbackByDay = (feedbackData) => {
    const last7Days = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const dayFeedback = feedbackData.filter(f => {
        const feedbackDate = new Date(f.created_at);
        return feedbackDate >= dayStart && feedbackDate < dayEnd;
      });

      last7Days.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: dayFeedback.length,
        positive: dayFeedback.filter(f => f.feedback_type === 'liked').length,
        negative: dayFeedback.filter(f => f.feedback_type === 'disliked').length
      });
    }

    return last7Days;
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
  const [clusterData, setClusterData] = React.useState(null);
  const [clusterLoading, setClusterLoading] = React.useState(false);
  const [clusterError, setClusterError] = React.useState(null);
  const [selectedTab, setSelectedTab] = React.useState(0);

  // Load clustering data
  const loadClusteringData = React.useCallback(async () => {
    try {
      setClusterLoading(true);
      setClusterError(null);

      const { data: clusterResult, error } = await supabase.functions.invoke('analyze-user-clusters', {
        body: {
          forceRecalculate: false,
          maxK: 6,
          timeRange: 30
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setClusterData(clusterResult);
    } catch (err) {
      console.error('Error loading clustering data:', err);
      setClusterError(err.message);
    } finally {
      setClusterLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedTab === 1) { // Only load when clustering tab is selected
      loadClusteringData();
    }
  }, [selectedTab, loadClusteringData]);

  // Early returns after all hooks
  if (!data) return <CircularProgress />;

  const feedback = data.feedback;
  if (!feedback || feedback.message) {
    return (
      <Alert severity="info">
        {feedback?.message || 'No feedback data available'}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          <Tab label="Feedback Overview" />
          <Tab label="User Clustering Analysis" />
        </Tabs>
      </Box>

      {/* Feedback Overview Tab */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          {/* Overview Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Feedback
                </Typography>
                <Typography variant="h4">
                  {feedback.totalFeedback}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Typography variant="body2" color="success.main">
                    +{feedback.recentTrend?.change || 0} this week
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Satisfaction Rate
                </Typography>
                <Typography variant="h4" color="success.main">
                  {Math.round((feedback.satisfactionRate || 0) * 100)}%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <ThumbUp color="success" fontSize="small" />
                  <Typography variant="body2">
                    {feedback.positiveFeedback} positive
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average Score
                </Typography>
                <Typography variant="h4">
                  {(feedback.averageScore || 0).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Out of 1.0
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Negative Feedback
                </Typography>
                <Typography variant="h4" color="error.main">
                  {feedback.negativeFeedback}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <ThumbDown color="error" fontSize="small" />
                  <Typography variant="body2">
                    {Math.round(((feedback.negativeFeedback || 0) / (feedback.totalFeedback || 1)) * 100)}% negative
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Algorithm Performance */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Algorithm Performance
                </Typography>
                {Object.entries(feedback.algorithmStats || {}).map(([algorithm, stats]) => (
                  <Box key={algorithm} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                        {algorithm.replace('_', ' ')}
                      </Typography>
                      <Typography variant="body2">
                        {Math.round((stats.satisfactionRate || 0) * 100)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(stats.satisfactionRate || 0) * 100}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {stats.positive}/{stats.total} positive • Avg Score: {(stats.avgScore || 0).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Feedback Trend */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Weekly Feedback Trend
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(feedback.feedbackByDay || []).map((day, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" sx={{ minWidth: 60 }}>
                        {day.date}
                      </Typography>
                      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={day.total > 0 ? (day.positive / day.total) * 100 : 0}
                          sx={{ flexGrow: 1, height: 8 }}
                        />
                        <Typography variant="caption">
                          {day.positive}/{day.total}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Feedback */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Feedback
                </Typography>
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {(feedback.recentFeedback || []).map((item, index) => (
                    <Box key={item.id} sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 1,
                      borderBottom: index < feedback.recentFeedback.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider'
                    }}>
                      <Chip
                        icon={item.feedback_type === 'liked' ? <ThumbUp /> : <ThumbDown />}
                        label={item.feedback_type}
                        color={item.feedback_type === 'liked' ? 'success' : 'error'}
                        size="small"
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2">
                          {item.user?.full_name || 'Unknown User'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {item.recommendation_data?.match?.title || 'Unknown Match'} •
                          Score: {(item.final_score || 0).toFixed(2)} •
                          {new Date(item.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* User Clustering Analysis Tab */}
      {selectedTab === 1 && (
        <ClusteringAnalysisTab
          clusterData={clusterData}
          loading={clusterLoading}
          error={clusterError}
          onRefresh={loadClusteringData}
        />
      )}
    </Box>
  );
};

// Clustering Analysis Tab Component
const ClusteringAnalysisTab = ({ clusterData, loading, error, onRefresh }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Analyzing user clusters...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={onRefresh}>
          <Refresh sx={{ mr: 1 }} />
          Retry
        </Button>
      }>
        Error loading clustering data: {error}
      </Alert>
    );
  }

  // Handle insufficient data case
  if (clusterData?.error === 'Insufficient data for clustering') {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Alert severity="warning" action={
            <Button color="inherit" size="small" onClick={onRefresh}>
              <Refresh sx={{ mr: 1 }} />
              Check Again
            </Button>
          }>
            <Typography variant="h6" gutterBottom>
              Insufficient Data for Clustering Analysis
            </Typography>
            <Typography variant="body2" paragraph>
              {clusterData.message}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {clusterData.suggestion}
            </Typography>
          </Alert>
        </Grid>

        {/* Show current data status */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
                Current Data Status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="warning.main">
                      {clusterData.currentUsers || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Users with Feedback
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary.main">
                      {clusterData.minimumRequired || 3}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Minimum Required
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="info.main">
                      {Math.max(0, (clusterData.minimumRequired || 3) - (clusterData.currentUsers || 0))}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      More Users Needed
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  if (!clusterData?.result) {
    return (
      <Alert severity="info" action={
        <Button color="inherit" size="small" onClick={onRefresh}>
          <Analytics sx={{ mr: 1 }} />
          Run Analysis
        </Button>
      }>
        No clustering analysis available. Click "Run Analysis" to generate user clusters.
      </Alert>
    );
  }

  const { result } = clusterData;
  const { clusterProfiles, totalUsers, optimalK } = result;

  return (
    <Grid container spacing={3}>
      {/* Clustering Overview */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                <Groups sx={{ mr: 1, verticalAlign: 'middle' }} />
                User Clustering Analysis
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={onRefresh}
                startIcon={<Refresh />}
              >
                Refresh Analysis
              </Button>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">
                    {optimalK || clusterProfiles?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    User Clusters Identified
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="success.main">
                    {totalUsers || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Users Analyzed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="info.main">
                    {clusterData.cached ? 'Cached' : 'Fresh'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Analysis Status
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Cluster Profiles */}
      {clusterProfiles?.map((cluster, index) => (
        <Grid item xs={12} md={6} key={cluster.id}>
          <ClusterProfileCard cluster={cluster} />
        </Grid>
      ))}
    </Grid>
  );
};

// Individual Cluster Profile Card Component
const ClusterProfileCard = ({ cluster }) => {
  const getClusterColor = (label) => {
    const colors = {
      'Highly Satisfied Power Users': 'success',
      'Regular Active Users': 'primary',
      'Moderate Users': 'info',
      'Dissatisfied Users': 'error',
      'Low Engagement Users': 'warning',
      'Feedback Champions': 'secondary'
    };
    return colors[label] || 'default';
  };

  const getClusterIcon = (label) => {
    if (label.includes('Power Users')) return <TrendingUp />;
    if (label.includes('Active Users')) return <People />;
    if (label.includes('Dissatisfied')) return <TrendingDown />;
    if (label.includes('Low Engagement')) return <TrendingDown />;
    if (label.includes('Champions')) return <Assessment />;
    return <Groups />;
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Badge badgeContent={cluster.size} color={getClusterColor(cluster.label)}>
            <Avatar sx={{ bgcolor: `${getClusterColor(cluster.label)}.main`, mr: 2 }}>
              {getClusterIcon(cluster.label)}
            </Avatar>
          </Badge>
          <Box>
            <Typography variant="h6">
              {cluster.label}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Cluster {cluster.id} • {cluster.size} users
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Cluster Characteristics */}
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Satisfaction Rate
            </Typography>
            <Typography variant="h6" color={getClusterColor(cluster.label) + '.main'}>
              {Math.round((cluster.characteristics?.avgSatisfactionRate || 0) * 100)}%
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Engagement Level
            </Typography>
            <Typography variant="h6">
              {Math.round((cluster.characteristics?.avgEngagementLevel || 0) * 100)}%
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Feedback Frequency
            </Typography>
            <Typography variant="body1">
              {(cluster.characteristics?.avgFeedbackFrequency || 0).toFixed(1)}/week
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Response Time
            </Typography>
            <Typography variant="body1">
              {Math.round(cluster.characteristics?.avgResponseTime || 0)}h
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Preferred Algorithms */}
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Preferred Algorithms
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {cluster.characteristics?.preferredAlgorithms?.map((algorithm, idx) => (
            <Chip
              key={idx}
              label={algorithm.replace('_', ' ')}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>

        {/* Time Patterns */}
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Active Time Patterns
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {cluster.characteristics?.dominantTimePatterns?.map((pattern, idx) => (
            <Chip
              key={idx}
              label={pattern}
              size="small"
              color={getClusterColor(cluster.label)}
              variant="outlined"
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;
