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
import { useProductionRealtime } from '../hooks/useProductionRealtime';
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
import UserRecommendationSection from '../components/UserRecommendationSection';

import EnhancedMatchCard from '../components/EnhancedMatchCard';
import SportCard from '../components/SportCard';
import { supabase } from '../services/supabase';

// Using the new EnhancedMatchCard component for consistency

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Production realtime is handled in the useEffect below
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
        // Query for active matches (not cancelled, not completed)
        const { data: activeMatchData, error: activeMatchError } = await supabase
          .from('matches')
          .select(`
            sport_id,
            sports!inner(id, name)
          `)
          .not('status', 'eq', 'cancelled')
          .not('status', 'eq', 'completed');

        // Query for total matches (excluding only cancelled)
        const { data: totalMatchData, error: totalMatchError } = await supabase
          .from('matches')
          .select(`
            sport_id,
            sports!inner(id, name)
          `)
          .not('status', 'eq', 'cancelled');

        if (!activeMatchError && !totalMatchError && activeMatchData && totalMatchData) {
          // Count active matches by sport
          const activeSportCounts = {};
          activeMatchData.forEach(item => {
            const sportId = item.sports?.id;
            if (sportId) {
              activeSportCounts[sportId] = (activeSportCounts[sportId] || 0) + 1;
            }
          });

          // Count total matches by sport
          const totalSportCounts = {};
          totalMatchData.forEach(item => {
            const sportId = item.sports?.id;
            if (sportId) {
              totalSportCounts[sportId] = (totalSportCounts[sportId] || 0) + 1;
            }
          });

          // Get the sport names and create count objects with both active and total counts
          const sportNamesAndCounts = totalMatchData.reduce((acc, item) => {
            const sportId = item.sports?.id;
            const sportName = item.sports?.name;

            if (sportId && sportName && !acc.some(s => s.id === sportId)) {
              acc.push({
                id: sportId,
                name: sportName,
                activeCount: activeSportCounts[sportId] || 0,
                totalCount: totalSportCounts[sportId] || 0
              });
            }

            return acc;
          }, []);

          // Sort by total count (descending) and take top 8 to show all sports
          const topSports = sportNamesAndCounts
            .sort((a, b) => b.totalCount - a.totalCount)
            .slice(0, 8);

          console.log('Updated sport counts:', topSports);
          console.log('Sport IDs and names from database:', topSports.map(s => `${s.id}: ${s.name} (Active: ${s.activeCount}, Total: ${s.totalCount})`));
          setPopularSports(topSports);
        }
      } catch (sportCountErr) {
        console.error('Error fetching sport counts:', sportCountErr);
        // Fall back to the original counting method if direct query fails
        const activeSportCounts = {};
        const totalSportCounts = {};

        matches.forEach(match => {
          if (match.sport?.id) {
            // Count as active if not cancelled and not completed
            if (match.status !== 'cancelled' && match.status !== 'completed') {
              activeSportCounts[match.sport.id] = (activeSportCounts[match.sport.id] || 0) + 1;
            }
            // Count as total if not cancelled
            if (match.status !== 'cancelled') {
              totalSportCounts[match.sport.id] = (totalSportCounts[match.sport.id] || 0) + 1;
            }
          }
        });

        // Update popular sports with fallback counts
        setPopularSports(prev => prev.map(sport => ({
          ...sport,
          activeCount: activeSportCounts[sport.id] || 0,
          totalCount: totalSportCounts[sport.id] || 0
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
              ? {
                  ...sport,
                  activeCount: sport.activeCount + 1,
                  totalCount: sport.totalCount + 1
                }
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
              ? {
                  ...sport,
                  activeCount: Math.max(0, sport.activeCount - 1),
                  totalCount: Math.max(0, sport.totalCount - 1)
                }
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

  // Production-optimized real-time subscriptions
  const { connectionState } = useProductionRealtime();

  useEffect(() => {
    // Real-time subscriptions are now managed centrally by the production service
    // No need for component-specific subscriptions - events are handled globally
    console.log('[Home] Production real-time service active:', connectionState.isConnected);

    return () => {
      // Cleanup is handled by the useProductionRealtime hook
    };
  }, [connectionState.isConnected]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h1" component="h1" gutterBottom>
            Welcome, {user?.user_metadata?.username || user?.user_metadata?.full_name || 'Athlete'}!
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

      {/* User recommendations section */}
      <Box sx={{ mb: 4, mt: 6 }}>
        <UserRecommendationSection
          title="Connect with Fellow Athletes"
          showRefresh={true}
          maxUsers={10}
        />
      </Box>

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
                  activeMatches: sport.activeCount,
                  totalMatches: sport.totalCount,
                  totalPlayers: sport.totalCount * 8, // Estimate
                  upcomingMatches: sport.activeCount,
                  popularityScore: sport.totalCount / Math.max(...popularSports.map(s => s.totalCount), 1)
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
