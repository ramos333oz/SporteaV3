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
import { useOptimizedRealtime } from '../hooks/useOptimizedRealtime';
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
import EnhancedMatchCard from '../components/EnhancedMatchCard';
import SportCard from '../components/SportCard';
import { supabase } from '../services/supabase';

// Using the new EnhancedMatchCard component for consistency

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribeToMatchUpdates, subscribeToUserParticipation } = useOptimizedRealtime();
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [joinedMatchIds, setJoinedMatchIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Popular sports data - will be populated from database
  const [popularSports, setPopularSports] = useState([]);

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
          
          // Sort by count (descending) and take top 8 to show all sports
          const topSports = sportNamesAndCounts
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

          console.log('Updated sport counts:', topSports);
          console.log('Sport IDs and names from database:', topSports.map(s => `${s.id}: ${s.name}`));
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

  // Note: Join functionality is now handled in MatchDetail page with proper request system

  // Initial data loading
  useEffect(() => {
    fetchUpcomingMatches();
    fetchJoinedMatches();
  }, [fetchUpcomingMatches, fetchJoinedMatches]);

  // Set up optimized real-time subscriptions (no duplicates)
  useEffect(() => {
    // Note: These subscriptions are now shared with LiveMatchBoard through the optimized service
    // No need to create duplicate subscriptions - the optimized service handles this centrally
    console.log('[Home] Optimized real-time subscriptions are managed centrally');

    // The data will be received through the optimized service automatically
    // when LiveMatchBoard or other components are active

    return () => {
      // Cleanup is handled by the useOptimizedRealtime hook
    };
  }, []);

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
      <Box sx={{ mb: 4, mt: 6 }}>
        <Typography variant="h2" gutterBottom>
          Popular Sports
        </Typography>
        <Grid container spacing={3}>
          {popularSports.map((sport) => (
            <Grid item xs={12} sm={6} md={3} key={sport.id}>
              <SportCard
                sport={sport}
                stats={{
                  activeMatches: sport.count,
                  totalPlayers: sport.count * 8, // Estimate
                  upcomingMatches: sport.count,
                  popularityScore: sport.count / Math.max(...popularSports.map(s => s.count), 1)
                }}
                onClick={() => navigate(`/find?sport=${sport.id}`)}
                variant="default"
                compact={false}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default Home;
