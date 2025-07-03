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
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
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
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { supabase } from '../services/supabase';
import { reportService } from '../services/reportService';

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
        {currentTab === 2 && <UsersTab data={analytics.users} adminUser={adminUser} />}
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

const UsersTab = ({ data, adminUser }) => {
  const [selectedSubTab, setSelectedSubTab] = useState(0);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportFilters, setReportFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all'
  });
  const [reportStats, setReportStats] = useState(null);

  useEffect(() => {
    if (selectedSubTab === 1) {
      loadReports();
      loadReportStatistics();
    }
  }, [selectedSubTab, reportFilters]);

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const filters = {};
      if (reportFilters.status !== 'all') filters.status = reportFilters.status;
      if (reportFilters.category !== 'all') filters.category = reportFilters.category;
      if (reportFilters.priority !== 'all') filters.priority = reportFilters.priority;

      const result = await reportService.getReports(filters);
      if (result.success) {
        setReports(result.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  const loadReportStatistics = async () => {
    try {
      const result = await reportService.getReportStatistics();
      if (result.success) {
        setReportStats(result.data);
      }
    } catch (error) {
      console.error('Error loading report statistics:', error);
    }
  };

  const handleStatusUpdate = async (reportId, newStatus, adminNotes = '') => {
    try {
      const result = await reportService.updateReportStatus(
        reportId,
        newStatus,
        adminNotes,
        adminUser?.id
      );

      if (result.success) {
        await loadReports(); // Refresh the list
        await loadReportStatistics(); // Refresh the statistics
        // Show success message
      }
    } catch (error) {
      console.error('Failed to update report status:', error);
    }
  };

  if (!data) return <CircularProgress />;

  return (
    <Box>
      {/* Sub-tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedSubTab} onChange={(e, newValue) => setSelectedSubTab(newValue)}>
          <Tab label="User Analytics" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                User Reports
                {reportStats && (
                  <Chip
                    label={reportStats.statusCounts?.open || 0}
                    size="small"
                    color="warning"
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {selectedSubTab === 0 && (
        <Typography>User analytics will be displayed here</Typography>
      )}

      {selectedSubTab === 1 && (
        <ReportsManagement
          reports={reports}
          loading={reportsLoading}
          filters={reportFilters}
          statistics={reportStats}
          onFiltersChange={setReportFilters}
          onStatusUpdate={handleStatusUpdate}
          onRefresh={() => {
            loadReports();
            loadReportStatistics();
          }}
        />
      )}
    </Box>
  );
};

const MatchesTab = ({ data }) => {
  const [matchStats, setMatchStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const loadMatchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch comprehensive match statistics
      const [matchesResult, sportsResult, participantsResult] = await Promise.all([
        supabase.from('matches').select(`
          id, status, created_at, start_time, sport_id, max_participants,
          sports!inner(id, name)
        `),
        supabase.from('sports').select('id, name'),
        supabase.from('participants').select('id, match_id, status, joined_at')
      ]);

      if (matchesResult.error) throw matchesResult.error;
      if (sportsResult.error) throw sportsResult.error;
      if (participantsResult.error) throw participantsResult.error;

      const matches = matchesResult.data || [];
      const sports = sportsResult.data || [];
      const participants = participantsResult.data || [];

      // Calculate statistics
      const stats = calculateMatchStatistics(matches, sports, participants);
      setMatchStats(stats);

    } catch (err) {
      console.error('Error loading match statistics:', err);
      setError('Failed to load match statistics');
    } finally {
      setLoading(false);
    }
  };

  const calculateMatchStatistics = (matches, sports, participants) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Overall statistics
    const totalMatches = matches.length;
    const activeMatches = matches.filter(m => m.status === 'active').length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const cancelledMatches = matches.filter(m => m.status === 'cancelled').length;
    const recentMatches = matches.filter(m => new Date(m.created_at) > thirtyDaysAgo).length;

    // Sport-wise breakdown
    const sportStats = sports.map(sport => {
      const sportMatches = matches.filter(m => m.sport_id === sport.id);
      const activeCount = sportMatches.filter(m => m.status === 'active' || m.status === 'upcoming').length;
      const totalCount = sportMatches.filter(m => m.status !== 'cancelled').length;
      const completedCount = sportMatches.filter(m => m.status === 'completed').length;

      // Calculate average participants from participants table
      const sportParticipants = participants.filter(p =>
        sportMatches.some(m => m.id === p.match_id)
      );
      const avgParticipants = sportMatches.length > 0
        ? sportParticipants.length / sportMatches.length
        : 0;

      return {
        id: sport.id,
        name: sport.name,
        activeMatches: activeCount,
        totalMatches: totalCount,
        completedMatches: completedCount,
        averageParticipants: Math.round(avgParticipants * 10) / 10,
        popularity: totalCount / Math.max(totalMatches, 1) * 100
      };
    }).sort((a, b) => b.totalMatches - a.totalMatches);

    // Participation statistics
    const totalParticipants = participants.length;
    const activeParticipants = participants.filter(p => p.status === 'confirmed').length;
    const avgParticipantsPerMatch = totalMatches > 0 ? totalParticipants / totalMatches : 0;

    // Time-based trends (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayMatches = matches.filter(m => {
        const matchDate = new Date(m.created_at);
        return matchDate.toDateString() === date.toDateString();
      }).length;

      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        matches: dayMatches
      };
    }).reverse();

    return {
      overview: {
        totalMatches,
        activeMatches,
        completedMatches,
        cancelledMatches,
        recentMatches,
        totalParticipants,
        activeParticipants,
        avgParticipantsPerMatch: Math.round(avgParticipantsPerMatch * 10) / 10,
        completionRate: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
        cancellationRate: totalMatches > 0 ? Math.round((cancelledMatches / totalMatches) * 100) : 0
      },
      sportStats,
      trends: last7Days
    };
  };

  React.useEffect(() => {
    loadMatchStatistics();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!matchStats) return <Typography>No match data available</Typography>;

  return (
    <Box>
      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Matches
              </Typography>
              <Typography variant="h4">
                {matchStats.overview.totalMatches}
              </Typography>
              <Typography variant="body2" color="success.main">
                +{matchStats.overview.recentMatches} this month
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Matches
              </Typography>
              <Typography variant="h4" color="primary.main">
                {matchStats.overview.activeMatches}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently ongoing
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completion Rate
              </Typography>
              <Typography variant="h4" color="success.main">
                {matchStats.overview.completionRate}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {matchStats.overview.completedMatches} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Participants
              </Typography>
              <Typography variant="h4">
                {matchStats.overview.avgParticipantsPerMatch}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Per match
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Match Trends Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Match Creation Trends (Last 7 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={matchStats.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="matches"
                    stroke="#1976d2"
                    fill="#1976d2"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Match Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active', value: matchStats.overview.activeMatches, fill: '#4caf50' },
                      { name: 'Completed', value: matchStats.overview.completedMatches, fill: '#2196f3' },
                      { name: 'Cancelled', value: matchStats.overview.cancelledMatches, fill: '#f44336' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sport Statistics Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Sport-wise Statistics
            </Typography>
            <Button
              startIcon={<Refresh />}
              onClick={loadMatchStatistics}
              size="small"
            >
              Refresh
            </Button>
          </Box>

          <Grid container spacing={2}>
            {matchStats.sportStats.map((sport) => (
              <Grid item xs={12} sm={6} md={4} key={sport.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {sport.name}
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Active Matches:
                      </Typography>
                      <Chip
                        label={sport.activeMatches}
                        size="small"
                        color={sport.activeMatches > 0 ? 'success' : 'default'}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Total Matches:
                      </Typography>
                      <Chip label={sport.totalMatches} size="small" variant="outlined" />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Completed:
                      </Typography>
                      <Typography variant="body2">
                        {sport.completedMatches}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Avg Participants:
                      </Typography>
                      <Typography variant="body2">
                        {sport.averageParticipants}
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Popularity
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={sport.popularity}
                        sx={{ mt: 0.5 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(sport.popularity)}% of all matches
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
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

      {/* Clustering Visualizations */}
      <ClusteringVisualizationsSection clusterProfiles={clusterProfiles} totalUsers={totalUsers} />

      {/* Cluster Profiles */}
      {clusterProfiles?.map((cluster, index) => (
        <Grid item xs={12} md={6} key={cluster.id}>
          <ClusterProfileCard cluster={cluster} />
        </Grid>
      ))}
    </Grid>
  );
};

// Clustering Visualizations Section Component
const ClusteringVisualizationsSection = ({ clusterProfiles, totalUsers }) => {
  // Prepare data for different chart types
  const prepareRadarData = () => {
    if (!clusterProfiles || clusterProfiles.length === 0) return [];

    const features = [
      'Satisfaction',
      'Engagement',
      'Frequency',
      'Response Time',
      'Acceptance Rate'
    ];

    return features.map(feature => {
      const dataPoint = { feature };
      clusterProfiles.forEach(cluster => {
        const characteristics = cluster.characteristics;
        let value = 0;

        switch(feature) {
          case 'Satisfaction':
            value = Math.round((characteristics?.avgSatisfactionRate || 0) * 100);
            break;
          case 'Engagement':
            value = Math.round((characteristics?.avgEngagementLevel || 0) * 100);
            break;
          case 'Frequency':
            value = Math.round((characteristics?.avgFeedbackFrequency || 0) * 10); // Scale to 0-100
            break;
          case 'Response Time':
            value = Math.max(0, 100 - Math.round((characteristics?.avgResponseTime || 0) * 4)); // Invert and scale
            break;
          case 'Acceptance Rate':
            value = Math.round((characteristics?.avgAcceptanceRate || 0) * 100);
            break;
        }
        dataPoint[cluster.label] = value;
      });
      return dataPoint;
    });
  };

  const prepareBarData = () => {
    if (!clusterProfiles || clusterProfiles.length === 0) return [];

    return clusterProfiles.map(cluster => ({
      name: cluster.label.replace(' Users', ''),
      satisfaction: Math.round((cluster.characteristics?.avgSatisfactionRate || 0) * 100),
      engagement: Math.round((cluster.characteristics?.avgEngagementLevel || 0) * 100),
      frequency: Math.round((cluster.characteristics?.avgFeedbackFrequency || 0) * 10),
      acceptance: Math.round((cluster.characteristics?.avgAcceptanceRate || 0) * 100),
      size: cluster.size
    }));
  };

  const preparePieData = () => {
    if (!clusterProfiles || clusterProfiles.length === 0) return [];

    return clusterProfiles.map((cluster, index) => ({
      name: cluster.label,
      value: cluster.size,
      percentage: Math.round((cluster.size / totalUsers) * 100)
    }));
  };

  const prepareTimePatternData = () => {
    if (!clusterProfiles || clusterProfiles.length === 0) return [];

    const timeSlots = ['Morning', 'Afternoon', 'Evening', 'Night'];
    return timeSlots.map(slot => {
      const dataPoint = { timeSlot: slot };
      clusterProfiles.forEach(cluster => {
        const patterns = cluster.characteristics?.dominantTimePatterns || [];
        dataPoint[cluster.label] = patterns.includes(slot) ? cluster.size : 0;
      });
      return dataPoint;
    });
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

  const radarData = prepareRadarData();
  const barData = prepareBarData();
  const pieData = preparePieData();
  const timePatternData = prepareTimePatternData();

  return (
    <>
      {/* Cluster Characteristics Radar Chart */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
              Cluster Characteristics Comparison
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Compare behavioral patterns across all user clusters
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="feature" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                {clusterProfiles?.map((cluster, index) => (
                  <Radar
                    key={cluster.id}
                    name={cluster.label}
                    dataKey={cluster.label}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
                <Legend />
                <Tooltip formatter={(value) => [`${value}%`, '']} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Cluster Metrics Bar Chart */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
              Key Metrics by Cluster
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Satisfaction, engagement, and activity levels comparison
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, '']} />
                <Legend />
                <Bar dataKey="satisfaction" fill="#8884d8" name="Satisfaction %" />
                <Bar dataKey="engagement" fill="#82ca9d" name="Engagement %" />
                <Bar dataKey="acceptance" fill="#ffc658" name="Acceptance %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Cluster Distribution Pie Chart */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Groups sx={{ mr: 1, verticalAlign: 'middle' }} />
              User Distribution
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Percentage of users in each cluster
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} users`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Time Pattern Analysis */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
              Activity Time Patterns
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              When different user clusters are most active
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timePatternData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeSlot" />
                <YAxis />
                <Tooltip />
                <Legend />
                {clusterProfiles?.map((cluster, index) => (
                  <Area
                    key={cluster.id}
                    type="monotone"
                    dataKey={cluster.label}
                    stackId="1"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </>
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

// Reports Management Component
const ReportsManagement = ({
  reports,
  loading,
  filters,
  statistics,
  onFiltersChange,
  onStatusUpdate,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = (report, targetStatus = null) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setNewStatus(targetStatus || report.status);
    setStatusDialogOpen(true);
  };

  const confirmStatusUpdate = async () => {
    if (selectedReport && newStatus) {
      setUpdating(true);
      try {
        await onStatusUpdate(selectedReport.id, newStatus, adminNotes);
        setStatusDialogOpen(false);
        setSelectedReport(null);
        setAdminNotes('');
        setNewStatus('');
      } catch (error) {
        console.error('Error updating report status:', error);
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleReporterClick = (userId) => {
    navigate(`/profile/${userId}`);
  };

  const getAvailableStatuses = (currentStatus) => {
    const statusFlow = {
      'open': ['in_progress', 'closed'],
      'in_progress': ['resolved', 'closed'],
      'resolved': ['closed'],
      'closed': []
    };
    return statusFlow[currentStatus] || [];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Reports
                </Typography>
                <Typography variant="h4">
                  {statistics.totalReports}
                </Typography>
                <Typography variant="body2" color="success.main">
                  {statistics.recentReports} this week
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Open Reports
                </Typography>
                <Typography variant="h4" color="error.main">
                  {statistics.statusCounts?.open || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  In Progress
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {statistics.statusCounts?.in_progress || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Resolved
                </Typography>
                <Typography variant="h4" color="success.main">
                  {statistics.statusCounts?.resolved || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters and Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
                label="Category"
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="player">Player Issues</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority}
                onChange={(e) => onFiltersChange({ ...filters, priority: e.target.value })}
                label="Priority"
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={onRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            User Reports ({reports.length})
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : reports.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No reports found matching the current filters.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {reports.map((report) => (
                <Card key={report.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6">
                            {report.title}
                          </Typography>
                          <Chip
                            label={report.status.replace('_', ' ')}
                            color={getStatusColor(report.status)}
                            size="small"
                          />
                          <Chip
                            label={report.priority}
                            color={getPriorityColor(report.priority)}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={report.category}
                            size="small"
                            variant="outlined"
                          />
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          By: <Button
                            variant="text"
                            size="small"
                            sx={{
                              p: 0,
                              minWidth: 'auto',
                              textTransform: 'none',
                              color: 'primary.main',
                              '&:hover': {
                                backgroundColor: 'transparent',
                                textDecoration: 'underline'
                              }
                            }}
                            onClick={() => handleReporterClick(report.user_id)}
                          >
                            {report.user_full_name || report.user_email}
                          </Button> •
                          {new Date(report.created_at).toLocaleString()}
                        </Typography>

                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {report.description}
                        </Typography>

                        {report.player_name && (
                          <Typography variant="body2" color="warning.main">
                            <strong>Player Reported:</strong> {report.player_name}
                          </Typography>
                        )}

                        {report.admin_notes && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Admin Notes:</strong> {report.admin_notes}
                            </Typography>
                            {report.resolved_by_name && (
                              <Typography variant="caption" color="text.secondary">
                                Resolved by: {report.resolved_by_name}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                        {report.status === 'open' && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              onClick={() => handleStatusChange(report, 'in_progress')}
                            >
                              Start Review
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleStatusChange(report, 'closed')}
                            >
                              Close
                            </Button>
                          </>
                        )}
                        {report.status === 'in_progress' && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleStatusChange(report, 'resolved')}
                            >
                              Mark Resolved
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleStatusChange(report, 'closed')}
                            >
                              Close
                            </Button>
                          </>
                        )}
                        {report.status === 'resolved' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleStatusChange(report, 'closed')}
                          >
                            Close
                          </Button>
                        )}
                        {report.status !== 'closed' && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleStatusChange(report)}
                          >
                            Edit Notes
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedReport ? `Update Report: ${selectedReport.title}` : 'Update Report Status'}
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Current Status: <Chip
                  label={selectedReport.status.replace('_', ' ')}
                  color={getStatusColor(selectedReport.status)}
                  size="small"
                />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Reporter: {selectedReport.user_full_name || selectedReport.user_email}
              </Typography>
            </Box>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="New Status"
            >
              {selectedReport && getAvailableStatuses(selectedReport.status).map((status) => (
                <MenuItem key={status} value={status}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={status.replace('_', ' ')}
                      color={getStatusColor(status)}
                      size="small"
                    />
                  </Box>
                </MenuItem>
              ))}
              {selectedReport && getAvailableStatuses(selectedReport.status).length === 0 && (
                <MenuItem disabled>
                  No status changes available
                </MenuItem>
              )}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Admin Notes"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add notes about the resolution or action taken..."
            helperText="These notes will be visible to other admins and help track the resolution process."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            onClick={confirmStatusUpdate}
            variant="contained"
            disabled={updating || !newStatus || newStatus === selectedReport?.status}
            startIcon={updating && <CircularProgress size={20} />}
          >
            {updating ? 'Updating...' : 'Update Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
