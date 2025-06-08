import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Button, 
  Grid, 
  Paper, 
  Card, 
  CardContent,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { matchService, participantService } from '../services/supabase';
import { format } from 'date-fns';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EventIcon from '@mui/icons-material/Event';
import LiveMatchBoard from '../components/LiveMatchBoard';
import RecommendationsList from '../components/RecommendationsList';
import { supabase } from '../services/supabase';

// Match card component
const MatchCard = ({ match, onJoin, joinedMatches }) => {
  const navigate = useNavigate();
  
  // Check if user has already joined this match
  const hasJoined = joinedMatches.includes(match.id);
  
  // Format date and time
  const formattedDate = format(new Date(match.start_time), 'MMM dd, yyyy');
  const formattedTime = format(new Date(match.start_time), 'h:mm a');
  
  // Calculate spots remaining
  const spotsRemaining = match.max_participants - (match.participants?.count || 0);
  
  return (
    <Card elevation={1} sx={{ mb: 2, borderRadius: 2, overflow: 'visible' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="h3" component="div" sx={{ mb: 1 }}>
              {match.title}
            </Typography>
            <Chip 
              label={match.sport?.name || 'Sport'} 
              size="small" 
              color="primary" 
              icon={<SportsSoccerIcon />}
              sx={{ mr: 1, mb: 1 }}
            />
            <Chip 
              label={`Level: ${match.skill_level}`} 
              size="small" 
              color="secondary"
              sx={{ mr: 1, mb: 1 }}
            />
            <Chip 
              label={spotsRemaining > 0 ? `${spotsRemaining} spots left` : 'Full'} 
              size="small" 
              color={spotsRemaining > 0 ? "success" : "error"}
              icon={<PersonIcon />}
              sx={{ mb: 1 }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar src={match.host?.avatar_url}>
              {match.host?.full_name?.charAt(0) || 'H'}
            </Avatar>
          </Box>
        </Box>
        
        <Divider sx={{ my: 1 }} />
        
        <Grid container spacing={1} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <EventIcon fontSize="small" color="action" sx={{ mr: 1 }} />
              <Typography variant="body2">{formattedDate}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AccessTimeIcon fontSize="small" color="action" sx={{ mr: 1 }} />
              <Typography variant="body2">{formattedTime}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOnIcon fontSize="small" color="action" sx={{ mr: 1 }} />
              <Typography variant="body2" noWrap>
                {match.location?.name || 'Location'}, {match.location?.campus || ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PersonIcon fontSize="small" color="action" sx={{ mr: 1 }} />
              <Typography variant="body2">
                Hosted by {match.host?.full_name || 'Unknown'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => navigate(`/match/${match.id}`)}
          >
            View Details
          </Button>
          
          <Button 
            variant="contained" 
            size="small"
            color={hasJoined ? "secondary" : "primary"}
            disabled={hasJoined || spotsRemaining === 0}
            onClick={() => !hasJoined && onJoin(match.id)}
          >
            {hasJoined ? 'Joined' : (spotsRemaining === 0 ? 'Full' : 'Join Match')}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribeToAllMatches, subscribeToUserMatches } = useRealtime();
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [joinedMatchIds, setJoinedMatchIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingJoin, setLoadingJoin] = useState(false);
  
  // Mock data for popular sports (will be replaced with real data from Supabase)
  const [popularSports, setPopularSports] = useState([
    { id: 1, name: 'Football', count: 0 },
    { id: 2, name: 'Basketball', count: 0 },
    { id: 3, name: 'Badminton', count: 0 },
    { id: 4, name: 'Futsal', count: 0 }
  ]);

  // Fetch upcoming matches
  const fetchUpcomingMatches = useCallback(async () => {
    try {
      setLoading(true);
      const matches = await matchService.searchMatches({});
      setUpcomingMatches(matches);
      
      // Update sport counts with direct query to get accurate counts
      try {
        // Direct query to get sport counts
        const { data: sportCountData, error: sportCountError } = await supabase
          .from('matches')
          .select(`
            sport_id,
            sports!inner(id, name)
          `)
          .not('status', 'eq', 'cancelled')
          .not('status', 'eq', 'completed');
        
        if (!sportCountError && sportCountData) {
          // Count occurrences of each sport
          const sportCounts = {};
          sportCountData.forEach(item => {
            const sportId = item.sports?.id;
            if (sportId) {
              sportCounts[sportId] = (sportCounts[sportId] || 0) + 1;
            }
          });
          
          // Get the sport names and create count objects
          const sportNamesAndCounts = sportCountData.reduce((acc, item) => {
            const sportId = item.sports?.id;
            const sportName = item.sports?.name;
            
            if (sportId && sportName && !acc.some(s => s.id === sportId)) {
              acc.push({
                id: sportId,
                name: sportName,
                count: sportCounts[sportId] || 0
              });
            }
            
            return acc;
          }, []);
          
          // Sort by count (descending) and take top 4
          const topSports = sportNamesAndCounts
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);
          
          console.log('Updated sport counts:', topSports);
          setPopularSports(topSports);
        }
      } catch (sportCountErr) {
        console.error('Error fetching sport counts:', sportCountErr);
        // Fall back to the original counting method if direct query fails
        const sportCounts = {};
        matches.forEach(match => {
          if (match.sport?.id) {
            sportCounts[match.sport.id] = (sportCounts[match.sport.id] || 0) + 1;
          }
        });
        
        // Update popular sports with fallback counts
        setPopularSports(prev => prev.map(sport => ({
          ...sport,
          count: sportCounts[sport.id] || 0
        })));
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to load matches. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user's joined matches
  const fetchJoinedMatches = useCallback(async () => {
    try {
      if (!user) return;
      const joined = await matchService.getJoinedMatches(user.id);
      setJoinedMatchIds(joined.map(match => match.id));
    } catch (err) {
      console.error('Error fetching joined matches:', err);
    }
  }, [user]);

  // Handle real-time match updates
  const handleMatchUpdate = useCallback((update) => {
    if (update.type === 'match_update') {
      if (update.eventType === 'INSERT') {
        setUpcomingMatches(prev => [update.data, ...prev]);
        
        // Update sport count
        if (update.data.sport?.id) {
          setPopularSports(prev => prev.map(sport => 
            sport.id === update.data.sport.id 
              ? { ...sport, count: sport.count + 1 } 
              : sport
          ));
        }
      } else if (update.eventType === 'UPDATE') {
        setUpcomingMatches(prev => 
          prev.map(match => match.id === update.data.id ? { ...match, ...update.data } : match)
        );
      } else if (update.eventType === 'DELETE') {
        setUpcomingMatches(prev => 
          prev.filter(match => match.id !== update.oldData.id)
        );
        
        // Update sport count
        if (update.oldData.sport?.id) {
          setPopularSports(prev => prev.map(sport => 
            sport.id === update.oldData.sport.id 
              ? { ...sport, count: Math.max(0, sport.count - 1) } 
              : sport
          ));
        }
      }
    }
  }, []);

  // Handle real-time participation updates
  const handleParticipationUpdate = useCallback((update) => {
    if (update.type === 'participation_update') {
      fetchJoinedMatches();
    }
  }, [fetchJoinedMatches]);

  // Join a match
  const handleJoinMatch = async (matchId) => {
    try {
      setLoadingJoin(true);
      await participantService.joinMatch(matchId, user.id);
      setJoinedMatchIds(prev => [...prev, matchId]);
    } catch (err) {
      console.error('Error joining match:', err);
      alert('Failed to join match. Please try again.');
    } finally {
      setLoadingJoin(false);
    }
  };

  // Initial data loading
  useEffect(() => {
    fetchUpcomingMatches();
    fetchJoinedMatches();
  }, [fetchUpcomingMatches, fetchJoinedMatches]);

  // Set up real-time subscriptions
  useEffect(() => {
    const matchSub = subscribeToAllMatches(handleMatchUpdate);
    const userSub = subscribeToUserMatches(handleParticipationUpdate);
    
    return () => {
      // Cleanup is handled by the useRealtime hook
    };
  }, [subscribeToAllMatches, subscribeToUserMatches, handleMatchUpdate, handleParticipationUpdate]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h1" component="h1" gutterBottom>
            Welcome, {user?.user_metadata?.full_name || 'Athlete'}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Find matches, join games, and connect with fellow UiTM students.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton color="primary" onClick={fetchUpcomingMatches} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Button 
            variant="contained" 
            fullWidth 
            size="large"
            sx={{ height: '80px', fontSize: '1.2rem' }}
            onClick={() => navigate('/find')}
          >
            Find Games
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Button 
            variant="outlined" 
            fullWidth 
            size="large"
            sx={{ height: '80px', fontSize: '1.2rem' }}
            onClick={() => navigate('/host')}
          >
            Host a Match
          </Button>
        </Grid>
      </Grid>
      
      {/* Live match board with real-time updates */}
      <Box sx={{ mb: 4 }}>
        <LiveMatchBoard />
        
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/find')}
          >
            View All Matches
          </Button>
        </Box>
      </Box>
      
      {/* Personalized match recommendations */}
      <RecommendationsList 
        limit={3}
        onError={(err) => console.error('Recommendation error:', err)}
      />
      
      {/* Popular sports section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h2" gutterBottom>
          Popular Sports
        </Typography>
        <Grid container spacing={2}>
          {popularSports.map((sport) => (
            <Grid item xs={12} sm={6} md={3} key={sport.id}>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  borderRadius: 3,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  },
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/find?sport=${sport.id}`)}
              >
                <Typography variant="h3">{sport.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {sport.count} active matches
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default Home;
