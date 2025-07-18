import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProductionRealtime } from '../hooks/useProductionRealtime';
import { SporteaButton, HostMatchButton } from '../components/common/SporteaButton';
import { SporteaCard } from '../components/common/SporteaCard';
import { matchService, participantService } from '../services/supabase';
import { format } from 'date-fns';
import LiveMatchBoard from '../components/LiveMatchBoard';
import RecommendationsList from '../components/RecommendationsList';
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
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'Athlete'}!
          </h1>
          <p className="text-gray-600">
            Find matches, join games, and connect with fellow UiTM students.
          </p>
        </div>
        <button
          className={cn(
            "p-2 rounded-md transition-all",
            "hover:bg-gray-100 text-gray-500 hover:text-brand-primary",
            "focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
          )}
          onClick={fetchUpcomingMatches}
          disabled={loading}
          aria-label="Refresh"
        >
          <RefreshCw className={cn(
            "w-5 h-5",
            loading && "animate-spin"
          )} />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <SporteaButton
          variant="athletic"
          intensity="bold"
          size="lg"
          className="w-full h-20 text-xl"
          onClick={() => navigate('/find')}
        >
          Find Games
        </SporteaButton>
        <HostMatchButton
          className="w-full h-20 text-xl"
          variant="outline"
          onClick={() => navigate('/host')}
        />
      </div>

      {/* Live match board with real-time updates */}
      <div className="mb-8">
        <LiveMatchBoard />

        <div className="text-center mt-4">
          <SporteaButton
            variant="outline"
            onClick={() => navigate('/find')}
          >
            View All Matches
          </SporteaButton>
        </div>
      </div>

      {/* Personalized match recommendations */}
      <RecommendationsList
        limit={3}
        onError={(err) => console.error('Recommendation error:', err)}
      />

      {/* Popular sports section */}
      <div className="mb-8 mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Popular Sports
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {popularSports.map((sport) => (
            <SporteaCard
              key={sport.id}
              variant="sport"
              className="h-full"
              onClick={() => navigate(`/find?sport=${sport.id}`)}
            >
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-1">{sport.name}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {sport.activeCount} active • {sport.totalCount} total matches
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-brand-primary font-medium">{sport.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h6 className="font-medium text-gray-900">{sport.name}</h6>
                    <span className="text-xs text-gray-500">Popular sport</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 mb-1">
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                      <p className="text-xs text-gray-600">Active Matches</p>
                    </div>
                    <span className="font-semibold">{sport.activeCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 mb-1">
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                      <p className="text-xs text-gray-600">Total Matches</p>
                    </div>
                    <span className="font-semibold">{sport.totalCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 mb-1">
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                      <p className="text-xs text-gray-600">Players</p>
                    </div>
                    <span className="font-semibold">{sport.totalCount * 8}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 mb-1">
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                      <p className="text-xs text-gray-600">Trending</p>
                    </div>
                    <span className="font-semibold">
                      {Math.round((sport.totalCount / Math.max(...popularSports.map(s => s.totalCount), 1)) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="text-center text-sm text-brand-primary font-medium hover:underline">
                  View Active Matches
                </div>
              </div>
            </SporteaCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
