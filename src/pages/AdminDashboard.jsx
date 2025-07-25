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
  TextField,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Paper
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
  Assessment,
  Security,
  Menu as MenuIcon
} from '@mui/icons-material';
import {
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
import {
  getModerationQueue,
  getModerationStatistics,
  updateReviewStatus,
  approveMatch,
  rejectMatch,
  processAdminFeedback
} from '../services/contentModerationService';
import EnhancedReviewModal from '../components/admin/EnhancedReviewModal';

// Sidebar width constants
const DRAWER_WIDTH = 280;

const AdminDashboard = () => {
  const [currentSection, setCurrentSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [adaptiveLearningMetrics, setAdaptiveLearningMetrics] = useState(null);
  const navigate = useNavigate();

  // Navigation sections
  const navigationSections = [
    { id: 'overview', label: 'Overview', icon: <Dashboard /> },
    { id: 'users', label: 'Users', icon: <People /> },
    { id: 'matches', label: 'Matches', icon: <SportsScore /> },
    { id: 'feedback', label: 'Feedback', icon: <Feedback /> },
    { id: 'content-moderation', label: 'Content Moderation', icon: <Security /> }
  ];

  useEffect(() => {
    checkAdminAuth();
  }, []);

  useEffect(() => {
    if (adminUser) {
      loadAnalytics();
    }
  }, [currentSection, adminUser]);

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
      // Map section names to endpoints
      const sectionToEndpoint = {
        'overview': 'overview',
        'users': 'users',
        'matches': 'matches',
        'feedback': 'feedback',
        'content-moderation': 'moderation'
      };

      const endpoint = sectionToEndpoint[currentSection] || 'overview';

      // Skip analytics loading for content moderation section (it handles its own data)
      if (endpoint === 'moderation') {
        // Load adaptive learning metrics for content moderation section
        await loadAdaptiveLearningMetrics();
        return;
      }

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

  // Add function to load adaptive learning metrics
  const loadAdaptiveLearningMetrics = async () => {
    try {
      const { data: metrics } = await supabase
        .from('learning_performance_summary')
        .select('*');

      const { data: recentAdjustments } = await supabase
        .from('adaptive_threshold_history')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      setAdaptiveLearningMetrics({
        summary: metrics,
        recentAdjustments,
        totalAdjustments: recentAdjustments?.length || 0
      });
    } catch (error) {
      console.error('Error loading adaptive learning metrics:', error);
    }
  };

  const loadBasicAnalytics = async (endpoint) => {
    switch (endpoint) {
      case 'overview':
        return await loadOverviewData();
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

  const handleSectionChange = (sectionId) => {
    setCurrentSection(sectionId);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: sidebarOpen ? DRAWER_WIDTH : 80,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarOpen ? DRAWER_WIDTH : 80,
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            transition: 'width 0.3s ease',
            overflowX: 'hidden'
          },
        }}
      >
        {/* Sidebar Header */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {sidebarOpen && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                component="img"
                src="/Sportea_logo/Sportea.png"
                alt="Sportea Logo"
                sx={{
                  height: 60,
                  width: 'auto',
                  filter: 'brightness(0) invert(1)'
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Admin Portal
              </Typography>
            </Box>
          )}
          <IconButton onClick={toggleSidebar} sx={{ color: 'white' }}>
            <MenuIcon />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

        {/* Navigation Items */}
        <List sx={{ px: 1, py: 2 }}>
          {navigationSections.map((section) => (
            <ListItem key={section.id} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => handleSectionChange(section.id)}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  backgroundColor: currentSection === section.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                  minHeight: 48,
                  justifyContent: sidebarOpen ? 'initial' : 'center',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: sidebarOpen ? 3 : 'auto',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  {section.icon}
                </ListItemIcon>
                {sidebarOpen && (
                  <ListItemText
                    primary={section.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontWeight: currentSection === section.id ? 600 : 400
                      }
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Logout Button */}
        <Box sx={{ mt: 'auto', p: 2 }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)',
              },
              minHeight: 48,
              justifyContent: sidebarOpen ? 'initial' : 'center',
              px: 2.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: sidebarOpen ? 3 : 'auto',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <Logout />
            </ListItemIcon>
            {sidebarOpen && (
              <ListItemText primary="Logout" />
            )}
          </ListItemButton>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, bgcolor: '#f5f7f9' }}>
        {/* Top Bar */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: 'white',
            color: 'text.primary',
            borderBottom: '1px solid rgba(0,0,0,0.08)'
          }}
        >
          <Toolbar>
            <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 600, color: '#333' }}>
              {navigationSections.find(s => s.id === currentSection)?.label || 'Dashboard'}
            </Typography>
            <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary' }}>
              Welcome, {adminUser?.fullName}
            </Typography>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {adminUser?.fullName?.charAt(0) || 'A'}
            </Avatar>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Render Current Section */}
          {currentSection === 'overview' && <OverviewTab data={analytics.overview} />}
          {currentSection === 'users' && <UsersTab data={analytics.users} adminUser={adminUser} />}
          {currentSection === 'matches' && <MatchesTab data={analytics.matches} />}
          {currentSection === 'feedback' && <FeedbackTab data={analytics.feedback} />}
          {currentSection === 'content-moderation' && <ContentModerationTab adminUser={adminUser} />}
        </Container>
      </Box>
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



const UsersTab = ({ data, adminUser }) => {
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportFilters, setReportFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all'
  });
  const [reportStats, setReportStats] = useState(null);

  useEffect(() => {
    loadReports();
    loadReportStatistics();
  }, [reportFilters]);

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
      {/* User Reports Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Reports Management
        </Typography>
      </Box>
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

    // Filter sports to only show available sports from SportSelection.jsx
    const allowedSportIds = [
      '4746e9c1-f772-4515-8d08-6c28563fbfc9', // Football
      'd662bc78-9e50-4785-ac71-d1e591e4a9ce', // Futsal
      'dd400853-7ce6-47bc-aee6-2ee241530f79', // Basketball
      'fb575fc1-2eac-4142-898a-2f7dae107844', // Badminton
      '66e9893a-2be7-47f0-b7d3-d7191901dd77', // Volleyball
      '9a304214-6c57-4c33-8c5f-3f1955b63caf', // Tennis
      'dcedf87a-13aa-4c2f-979f-6b71d457f531', // Frisbee
      '3aba0f36-38bf-4ca2-b713-3dabd9f993f1', // Hockey
      '13e32815-8a3b-48f7-8cc9-5fdad873b851'  // Rugby
    ];
    const filteredSports = sports.filter(sport => allowedSportIds.includes(sport.id));

    // Overall statistics
    const totalMatches = matches.length;
    const activeMatches = matches.filter(m => m.status === 'active' || m.status === 'upcoming' || m.status === 'scheduled').length;
    const completedMatches = matches.filter(m => m.status === 'completed').length;
    const cancelledMatches = matches.filter(m => m.status === 'cancelled').length;
    const recentMatches = matches.filter(m => new Date(m.created_at) > thirtyDaysAgo).length;

    // Sport-wise breakdown
    const sportStats = filteredSports.map(sport => {
      const sportMatches = matches.filter(m => m.sport_id === sport.id);
      const activeCount = sportMatches.filter(m => m.status === 'active' || m.status === 'upcoming' || m.status === 'scheduled').length;
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
                      { name: 'Active/Upcoming', value: matchStats.overview.activeMatches, fill: '#4caf50' },
                      { name: 'Completed', value: matchStats.overview.completedMatches, fill: '#2196f3' },
                      { name: 'Cancelled', value: matchStats.overview.cancelledMatches, fill: '#f44336' }
                    ].filter(item => item.value > 0)}
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
      {/* Feedback Overview */}
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
    </Box>
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

const ContentModerationTab = ({ adminUser }) => {
  const [moderationQueue, setModerationQueue] = useState([]);
  const [moderationStats, setModerationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedQueueId, setSelectedQueueId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', queueId: null, item: null });
  const [adaptiveLearningMetrics, setAdaptiveLearningMetrics] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    risk_level: 'all'
  });

  useEffect(() => {
    loadModerationData();
    loadAdaptiveLearningMetrics();
  }, [filters]);

  const loadModerationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [queueResult, statsResult] = await Promise.all([
        getModerationQueue(filters),
        getModerationStatistics()
      ]);

      if (queueResult.success) {
        setModerationQueue(queueResult.data);
      } else {
        setError(queueResult.error);
      }

      if (statsResult.success) {
        setModerationStats(statsResult.data);
      }
    } catch (error) {
      console.error('Error loading moderation data:', error);
      setError('Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  };

  const loadAdaptiveLearningMetrics = async () => {
    try {
      const { data: metrics } = await supabase
        .from('learning_performance_summary')
        .select('*');

      const { data: recentAdjustments } = await supabase
        .from('adaptive_threshold_history')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      setAdaptiveLearningMetrics({
        summary: metrics,
        recentAdjustments,
        totalAdjustments: recentAdjustments?.length || 0
      });
    } catch (error) {
      console.error('Error loading adaptive learning metrics:', error);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleApprove = async (queueId, item) => {
    try {
      setActionLoading(prev => ({ ...prev, [queueId]: true }));
      setError(null);

      const result = await approveMatch(queueId, adminUser.id, '');

      if (result.success) {
        // Process adaptive learning feedback
        await processAdminFeedback({
          queueItemId: queueId,
          moderationResultId: item.moderation_result_id,
          adminDecision: 'approve',
          adminNotes: 'Approved by admin',
          originalScore: item.inappropriate_score,
          originalThreshold: item.adaptive_threshold_used
        });

        setSuccessMessage(`Match "${result.matchTitle}" approved successfully`);
        await loadModerationData();
        await loadAdaptiveLearningMetrics(); // Refresh adaptive learning metrics

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error approving match:', error);
      setError('Failed to approve match');
    } finally {
      setActionLoading(prev => ({ ...prev, [queueId]: false }));
      setConfirmDialog({ open: false, type: '', queueId: null, item: null });
    }
  };

  const handleReject = async (queueId, item, reason = 'Content violates community guidelines') => {
    try {
      setActionLoading(prev => ({ ...prev, [queueId]: true }));
      setError(null);

      const result = await rejectMatch(queueId, adminUser.id, reason, '');

      if (result.success) {
        // Process adaptive learning feedback
        await processAdminFeedback({
          queueItemId: queueId,
          moderationResultId: item.moderation_result_id,
          adminDecision: 'reject',
          adminNotes: reason,
          originalScore: item.inappropriate_score,
          originalThreshold: item.adaptive_threshold_used
        });

        setSuccessMessage(`Match "${result.matchTitle}" rejected successfully`);
        await loadModerationData();
        await loadAdaptiveLearningMetrics(); // Refresh adaptive learning metrics

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error rejecting match:', error);
      setError('Failed to reject match');
    } finally {
      setActionLoading(prev => ({ ...prev, [queueId]: false }));
      setConfirmDialog({ open: false, type: '', queueId: null, item: null });
    }
  };

  const handleReview = (queueId, matchId = null) => {
    // Use queueId if available, otherwise use matchId for auto-approved items
    const reviewId = queueId || matchId;
    setSelectedQueueId(reviewId);
    setReviewModalOpen(true);
  };

  const handleActionComplete = (action, message) => {
    setSuccessMessage(message);
    loadModerationData();

    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const openConfirmDialog = (type, queueId, item) => {
    setConfirmDialog({ open: true, type, queueId, item });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, type: '', queueId: null, item: null });
  };

  // Legacy function for backward compatibility
  const handleReviewAction = async (queueId, decision, notes = '') => {
    try {
      const result = await updateReviewStatus(queueId, decision, adminUser.id, notes);

      if (result.success) {
        await loadModerationData();
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error processing review action:', error);
      setError('Failed to process review action');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Adaptive Learning Metrics */}
      {adaptiveLearningMetrics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Adaptive Learning Performance
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Recent Adjustments (7 days)
                </Typography>
                <Typography variant="h4">
                  {adaptiveLearningMetrics.totalAdjustments}
                </Typography>
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Recent Threshold Changes
                </Typography>
                {adaptiveLearningMetrics.recentAdjustments && adaptiveLearningMetrics.recentAdjustments.length > 0 ? (
                  adaptiveLearningMetrics.recentAdjustments.slice(0, 3).map((adj, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                      {adj.context_type}: {adj.threshold_type} {adj.old_value?.toFixed(3)} → {adj.new_value?.toFixed(3)}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No recent threshold adjustments
                  </Typography>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {moderationStats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending Reviews
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {moderationStats.queue.pending}
                </Typography>
                <Typography variant="body2">
                  {moderationStats.queue.urgent} urgent
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Auto Approval Rate
                </Typography>
                <Typography variant="h4" color="success.main">
                  {moderationStats.performance.auto_approval_rate}%
                </Typography>
                <Typography variant="body2">
                  {moderationStats.moderation.auto_approved} auto-approved
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  High Risk Content
                </Typography>
                <Typography variant="h4" color="error.main">
                  {moderationStats.risk_levels.high}
                </Typography>
                <Typography variant="body2">
                  Requires immediate attention
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Moderated
                </Typography>
                <Typography variant="h4">
                  {moderationStats.moderation.total}
                </Typography>
                <Typography variant="body2" color="success.main">
                  {moderationStats.moderation.recent} this week
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filter Moderation Queue
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="in_review">In Review</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Risk Level</InputLabel>
                <Select
                  value={filters.risk_level}
                  label="Risk Level"
                  onChange={(e) => handleFilterChange('risk_level', e.target.value)}
                >
                  <MenuItem value="all">All Risk Levels</MenuItem>
                  <MenuItem value="high">High Risk</MenuItem>
                  <MenuItem value="medium">Medium Risk</MenuItem>
                  <MenuItem value="low">Low Risk</MenuItem>
                  <MenuItem value="minimal">Minimal Risk</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Moderation Queue */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Content Moderation Queue
          </Typography>
          {moderationQueue.length === 0 ? (
            <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
              No items in moderation queue
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {moderationQueue.map((item) => (
                <Grid item xs={12} key={item.queue_id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" gutterBottom>
                            {item.match_title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" paragraph>
                            {item.match_description?.substring(0, 150)}...
                          </Typography>
                          <Typography variant="caption" display="block">
                            Host: {item.host_username} | Queued: {new Date(item.queued_at).toLocaleDateString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Chip
                              label={item.priority.toUpperCase()}
                              color={
                                item.priority === 'urgent' ? 'error' :
                                item.priority === 'high' ? 'warning' :
                                item.priority === 'medium' ? 'info' : 'default'
                              }
                              size="small"
                            />
                            <Chip
                              label={`${item.overall_risk_level.toUpperCase()} RISK`}
                              color={
                                item.overall_risk_level === 'high' ? 'error' :
                                item.overall_risk_level === 'medium' ? 'warning' :
                                item.overall_risk_level === 'low' ? 'info' : 'success'
                              }
                              size="small"
                            />
                            <Typography variant="caption">
                              Toxic: {(item.inappropriate_score * 100).toFixed(1)}%
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              onClick={() => openConfirmDialog('approve', item.queue_id, item)}
                              disabled={item.status === 'approved' || item.status === 'rejected' || actionLoading[item.queue_id]}
                              startIcon={actionLoading[item.queue_id] ? <CircularProgress size={16} /> : null}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              onClick={() => openConfirmDialog('reject', item.queue_id, item)}
                              disabled={item.status === 'approved' || item.status === 'rejected' || actionLoading[item.queue_id]}
                              startIcon={actionLoading[item.queue_id] ? <CircularProgress size={16} /> : null}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleReview(item.queue_id, item.match_id)}
                              disabled={item.status === 'approved' || item.status === 'rejected'}
                            >
                              Review
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Review Modal */}
      <EnhancedReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        queueId={selectedQueueId}
        adminUser={adminUser}
        onActionComplete={handleActionComplete}
      />

      {/* Confirmation Dialogs */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {confirmDialog.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        </DialogTitle>
        <DialogContent>
          {confirmDialog.type === 'approve' ? (
            <Alert severity="info">
              Are you sure you want to approve the match "{confirmDialog.item?.match_title}"?
              This will mark the match as approved and notify the host.
            </Alert>
          ) : (
            <Alert severity="warning">
              Are you sure you want to reject the match "{confirmDialog.item?.match_title}"?
              This action will permanently remove the match from public listings and notify the host with the rejection reason.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} disabled={actionLoading[confirmDialog.queueId]}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirmDialog.type === 'approve' ? 'success' : 'error'}
            onClick={() => {
              if (confirmDialog.type === 'approve') {
                handleApprove(confirmDialog.queueId, confirmDialog.item);
              } else {
                handleReject(confirmDialog.queueId, confirmDialog.item);
              }
            }}
            disabled={actionLoading[confirmDialog.queueId]}
            startIcon={actionLoading[confirmDialog.queueId] ? <CircularProgress size={16} /> : null}
          >
            {confirmDialog.type === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
