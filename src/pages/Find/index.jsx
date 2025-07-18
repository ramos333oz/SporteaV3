import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';
import { SporteaTabs, SporteaTab, SporteaTabPanel } from '../../components/common/SporteaTabs';
import { SporteaCard } from '../../components/common/SporteaCard';
import { SporteaButton } from '../../components/common/SporteaButton';
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
  const [activeTab, setActiveTab] = useState(0);
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
  
  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData, activeTab]);
  
  // Handle real-time match updates
  const handleMatchUpdate = useCallback((update) => {
    if (activeTab !== 0) return; // Only process updates when on Games tab
    
    if (update.type === 'match_update') {
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
    } else if (update.type === 'participant_update') {
      // Handle participant updates to update participant count in real-time
      const matchId = update.data?.match_id || update.oldData?.match_id;
      if (matchId) {
        console.log('Real-time: Participant update for match', matchId, update.eventType);
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

      return () => {
        window.removeEventListener('sportea:match-update', handleMatchUpdate);
      };
    }
  }, [handleMatchUpdate, activeTab]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Find {activeTab === 0 ? 'Games' : 'Players'}
        </h1>

        {activeTab === 0 && (
          <div className="flex items-center gap-3">
            {newMatchCount > 0 && (
              <button
                onClick={applyNewMatches}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                  "bg-brand-primary text-white hover:bg-brand-primary/90",
                  "transition-colors duration-200"
                )}
              >
                <RefreshCw className="w-4 h-4" />
                {newMatchCount} new match{newMatchCount > 1 ? 'es' : ''}
              </button>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className={cn(
                "p-2 rounded-md transition-all",
                "hover:bg-gray-100 text-gray-500 hover:text-brand-primary",
                "focus:outline-none focus:ring-2 focus:ring-brand-primary/50",
                loading && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Refresh matches"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
          </div>
        )}
      </div>

      {/* Search bar */}
      <SporteaCard variant="default" className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center p-2"
        >
          <input
            type="text"
            placeholder={`Search for ${activeTab === 0 ? 'games' : 'players'}...`}
            value={searchQuery}
            onChange={handleSearchChange}
            className="flex-1 px-3 py-2 border-0 bg-transparent focus:outline-none text-gray-900 placeholder-gray-500"
          />
          <button
            type="submit"
            className={cn(
              "p-2 rounded-md transition-all",
              "hover:bg-gray-100 text-gray-500 hover:text-brand-primary",
              "focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
            )}
            aria-label="search"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>
      </SporteaCard>

      {/* Tabs */}
      <div className="mb-6">
        <SporteaTabs variant="elevated">
          <SporteaTab
            active={activeTab === 0}
            onClick={() => handleTabChange(null, 0)}
            className="flex-1 text-center"
          >
            Games
          </SporteaTab>
          <SporteaTab
            active={activeTab === 1}
            onClick={() => handleTabChange(null, 1)}
            className="flex-1 text-center"
          >
            Players
          </SporteaTab>
        </SporteaTabs>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div>
          {activeTab === 0 && !loading && matches.length > 0 && (
            <p className="text-sm text-gray-500 mb-4">
              Last updated: {lastRefreshed.toLocaleTimeString()} • {matches.length} matches found
            </p>
          )}

          {/* Content based on active tab */}
          <SporteaTabPanel active={activeTab === 0}>
            <FindGames matches={matches} sports={sports} />
          </SporteaTabPanel>

          <SporteaTabPanel active={activeTab === 1}>
            <FindPlayers players={players} />
          </SporteaTabPanel>
        </div>
      )}
    </div>
  );
};

export default Find;
