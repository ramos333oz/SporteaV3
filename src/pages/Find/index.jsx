import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  InputBase,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Badge,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useSearchParams } from 'react-router-dom';
import FindGames from './FindGames';
import FindPlayers from './FindPlayers';
import { supabase, sportService, matchService } from '../../services/supabase';
import blockingService from '../../services/blockingService';
import { useProductionRealtime } from '../../hooks/useProductionRealtime';
import { useAuth } from '../../hooks/useAuth';

// Custom debounce hook for performance optimization
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const Find = () => {
  const { user } = useAuth();
  const { connectionState } = useProductionRealtime();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize activeTab based on URL parameter
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'players' ? 1 : 0;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [sports, setSports] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMatchCount, setNewMatchCount] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Debounced search query for performance optimization
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch sports
      const sportsData = await sportService.getAllSports();
      setSports(sportsData);
      
      // Fetch matches based on active tab
      if (activeTab === 0) {
        const matchesData = await matchService.searchMatches({});
        setMatches(matchesData);
        // Reset the new match counter when manually refreshing
        setNewMatchCount(0);
        setLastRefreshed(new Date());
      }
      
      // For players tab, we would fetch users with similar interests
      if (activeTab === 1) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .limit(10);
          
        if (error) throw error;
        setPlayers(data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);
  
  // Sync tab state with URL parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const newTab = tabParam === 'players' ? 1 : 0;
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [searchParams]);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData, activeTab]);
  
  // Handle real-time match updates and participation events
  const handleMatchUpdate = useCallback((event) => {
    if (activeTab !== 0) return; // Only process updates when on Games tab

    // Handle different event types
    if (event.type === 'match_update') {
      const update = event;
      if (update.eventType === 'INSERT') {
        console.log('Real-time: New match created', update.data);
        // Increment the new matches counter
        setNewMatchCount(prev => prev + 1);

        // If we want to automatically add it to the list:
        // setMatches(prev => [update.data, ...prev]);
      } else if (update.eventType === 'UPDATE') {
        console.log('Real-time: Match updated', update.data);
        // Update the match in our list
        setMatches(prev =>
          prev.map(match => match.id === update.data.id ? { ...match, ...update.data } : match)
        );
      } else if (update.eventType === 'DELETE') {
        console.log('Real-time: Match deleted', update.oldData);
        // Remove the match from our list
        setMatches(prev =>
          prev.filter(match => match.id !== update.oldData.id)
        );
      }
    } else if (event.type === 'participant_update') {
      // Handle participant updates to update participant count in real-time
      const matchId = event.data?.match_id || event.oldData?.match_id;
      if (matchId) {
        console.log('Real-time: Participant update for match', matchId, event.eventType);
        // Fetch current participant count for the match
        fetchParticipantCount(matchId);
      }
    } else if (event.detail) {
      // Handle sportea:participation events from custom dispatches
      const { matchId, action } = event.detail;
      if (matchId) {
        console.log('Real-time: Participation event for match', matchId, action);
        // Fetch current participant count for the match
        fetchParticipantCount(matchId);
      }
    }
  }, [activeTab]);

  // Function to fetch updated participant count for a match
  const fetchParticipantCount = useCallback(async (matchId) => {
    try {
      // Count confirmed participants for this match
      const { count, error } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('status', 'confirmed');
      
      if (error) throw error;
      
      console.log(`Updated participant count for match ${matchId}:`, count);
      
      // Update the match in our list with the new participant count
      setMatches(prev => prev.map(match => {
        if (match.id === matchId) {
          return { 
            ...match, 
            current_participants: count,
            isUpdated: true // Flag for visual indication
          };
        }
        return match;
      }));
    } catch (err) {
      console.error('Error fetching participant count:', err);
    }
  }, []);
  
  // Set up real-time subscriptions
  useEffect(() => {
    if (activeTab === 0) { // Only subscribe when on Games tab
      // Subscribe to production-optimized match events
      window.addEventListener('sportea:match-update', handleMatchUpdate);
      // Subscribe to participation events for real-time participant count updates
      window.addEventListener('sportea:participation', handleMatchUpdate);

      return () => {
        window.removeEventListener('sportea:match-update', handleMatchUpdate);
        window.removeEventListener('sportea:participation', handleMatchUpdate);
      };
    }
  }, [handleMatchUpdate, activeTab]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Update URL parameter
    const newSearchParams = new URLSearchParams(searchParams);
    if (newValue === 1) {
      newSearchParams.set('tab', 'players');
    } else {
      newSearchParams.delete('tab');
    }
    setSearchParams(newSearchParams);
  };
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  // Optimized search function with debouncing
  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      // Reset to original data when search is cleared
      fetchData();
      return;
    }
    
    try {
      setLoading(true);
      
      if (activeTab === 0) {
        // Search matches
        const { data, error } = await supabase
          .from('matches')
          .select(`
            *,
            sport:sports(*),
            host:users!host_id(*),
            location:locations(*)
          `)
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('status', 'upcoming')
          .in('moderation_status', ['approved', 'auto_approved']) // CRITICAL FIX: Hide pending/flagged matches
          .order('start_time', { ascending: true });
          
        if (error) throw error;
        setMatches(data || []);
      } else {
        // Search players
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
          .neq('id', user.id) // Exclude current user
          .limit(50); // Increase limit to account for filtering

        if (error) throw error;

        // Filter out blocked users
        let filteredPlayers = data || [];
        filteredPlayers = await blockingService.filterBlockedUsers(filteredPlayers, user.id);

        // Limit to 10 after filtering
        setPlayers(filteredPlayers.slice(0, 10));
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user, fetchData]);

  // Manual search function (for search button)
  const handleSearch = () => {
    performSearch(searchQuery);
  };

  // Automatic search with debouncing
  useEffect(() => {
    performSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, performSearch]);

  // Apply new matches when user clicks on notification
  const applyNewMatches = () => {
    fetchData();
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Find {activeTab === 0 ? 'Games' : 'Players'}
        </Typography>
        
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {newMatchCount > 0 && (
              <Chip 
                color="primary" 
                label={`${newMatchCount} new match${newMatchCount > 1 ? 'es' : ''}`}
                onClick={applyNewMatches}
                icon={<RefreshIcon />}
              />
            )}
            <IconButton 
              color="primary" 
              onClick={fetchData} 
              disabled={loading}
              aria-label="Refresh matches"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        )}
      </Box>
      
      {/* Search bar */}
      <Paper
        component="form"
        sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', mb: 3 }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder={`Search for ${activeTab === 0 ? 'games' : 'players'}...`}
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <IconButton type="submit" sx={{ p: '10px' }} aria-label="search">
          <SearchIcon />
        </IconButton>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2, p: 1, bgcolor: 'grey.50' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="find tabs"
          variant="fullWidth"
          sx={{
            minHeight: 'auto',
            '& .MuiTabs-indicator': {
              display: 'none', // Remove default indicator
            },
            '& .MuiTab-root': {
              minHeight: 'auto',
              py: 1.5,
              px: 3,
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: 'text.secondary',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
              '&.Mui-selected': {
                bgcolor: 'background.paper',
                color: 'primary.main',
                fontWeight: 600,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              },
            },
          }}
        >
          <Tab label="Games" />
          <Tab label="Players" />
        </Tabs>
      </Paper>
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {activeTab === 0 && !loading && matches.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Last updated: {lastRefreshed.toLocaleTimeString()} • {matches.length} matches found
            </Typography>
          )}
          
          {/* Content based on active tab */}
          {activeTab === 0 ? (
            <FindGames matches={matches} sports={sports} />
          ) : (
            <FindPlayers players={players} />
          )}
        </Box>
      )}
    </Container>
  );
};

export default Find;
