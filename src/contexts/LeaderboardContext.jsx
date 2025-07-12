import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import achievementService from '../services/achievementService';

/**
 * LeaderboardContext
 * Provides global leaderboard state management and caching
 * Following SporteaV3's context patterns
 */
const LeaderboardContext = createContext();

export const useLeaderboardContext = () => {
  const context = useContext(LeaderboardContext);
  if (!context) {
    throw new Error('useLeaderboardContext must be used within a LeaderboardProvider');
  }
  return context;
};

export const LeaderboardProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Global leaderboard cache
  const [leaderboardCache, setLeaderboardCache] = useState(new Map());
  const [userRankingCache, setUserRankingCache] = useState(new Map());
  const [lastFetchTime, setLastFetchTime] = useState(new Map());
  
  // Cache duration (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;

  // Generate cache key
  const getCacheKey = (type, timeframe, groupType, userId = null) => {
    return `${type}-${timeframe}-${groupType}-${userId || 'global'}`;
  };

  // Check if cache is valid
  const isCacheValid = (key) => {
    const fetchTime = lastFetchTime.get(key);
    if (!fetchTime) return false;
    return Date.now() - fetchTime < CACHE_DURATION;
  };

  // Get leaderboard data with caching
  const getLeaderboard = async (type = 'xp', timeframe = 'all', groupType = 'global', userId = null) => {
    const cacheKey = getCacheKey(type, timeframe, groupType, userId);
    
    // Return cached data if valid
    if (isCacheValid(cacheKey) && leaderboardCache.has(cacheKey)) {
      return leaderboardCache.get(cacheKey);
    }

    try {
      // Fetch fresh data
      const data = await achievementService.getLeaderboard(
        type,
        timeframe,
        50,
        groupType,
        userId
      );

      // Update cache
      setLeaderboardCache(prev => new Map(prev).set(cacheKey, data));
      setLastFetchTime(prev => new Map(prev).set(cacheKey, Date.now()));

      return data;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  };

  // Get user ranking with caching
  const getUserRanking = async (userId, type = 'xp', timeframe = 'all', groupType = 'global') => {
    if (!userId) return null;

    const cacheKey = getCacheKey(type, timeframe, groupType, `ranking-${userId}`);
    
    // Return cached data if valid
    if (isCacheValid(cacheKey) && userRankingCache.has(cacheKey)) {
      return userRankingCache.get(cacheKey);
    }

    try {
      // Fetch fresh data
      const ranking = await achievementService.getUserRanking(
        userId,
        type,
        timeframe,
        groupType
      );

      // Update cache
      setUserRankingCache(prev => new Map(prev).set(cacheKey, ranking));
      setLastFetchTime(prev => new Map(prev).set(cacheKey, Date.now()));

      return ranking;
    } catch (error) {
      console.error('Error fetching user ranking:', error);
      throw error;
    }
  };

  // Invalidate cache for specific parameters
  const invalidateCache = (type = null, timeframe = null, groupType = null) => {
    if (!type && !timeframe && !groupType) {
      // Clear all cache
      setLeaderboardCache(new Map());
      setUserRankingCache(new Map());
      setLastFetchTime(new Map());
      return;
    }

    // Clear specific cache entries
    const keysToRemove = [];
    
    for (const key of leaderboardCache.keys()) {
      const [keyType, keyTimeframe, keyGroupType] = key.split('-');
      
      if (
        (type && keyType === type) ||
        (timeframe && keyTimeframe === timeframe) ||
        (groupType && keyGroupType === groupType)
      ) {
        keysToRemove.push(key);
      }
    }

    setLeaderboardCache(prev => {
      const newCache = new Map(prev);
      keysToRemove.forEach(key => newCache.delete(key));
      return newCache;
    });

    setUserRankingCache(prev => {
      const newCache = new Map(prev);
      keysToRemove.forEach(key => newCache.delete(key));
      return newCache;
    });

    setLastFetchTime(prev => {
      const newCache = new Map(prev);
      keysToRemove.forEach(key => newCache.delete(key));
      return newCache;
    });
  };

  // Get leaderboard statistics
  const getLeaderboardStats = async (type = 'xp', timeframe = 'all') => {
    try {
      const globalLeaderboard = await getLeaderboard(type, timeframe, 'global');
      
      if (!globalLeaderboard.length) return null;

      const totalParticipants = globalLeaderboard.length;
      const topScore = globalLeaderboard[0]?.score || 0;
      const averageScore = globalLeaderboard.reduce((sum, entry) => sum + entry.score, 0) / totalParticipants;

      return {
        totalParticipants,
        topScore,
        averageScore: Math.round(averageScore * 100) / 100,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error fetching leaderboard stats:', error);
      return null;
    }
  };

  // Auto-refresh cache periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Remove expired cache entries
      const now = Date.now();
      const expiredKeys = [];

      for (const [key, fetchTime] of lastFetchTime.entries()) {
        if (now - fetchTime > CACHE_DURATION) {
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        setLeaderboardCache(prev => {
          const newCache = new Map(prev);
          expiredKeys.forEach(key => newCache.delete(key));
          return newCache;
        });

        setUserRankingCache(prev => {
          const newCache = new Map(prev);
          expiredKeys.forEach(key => newCache.delete(key));
          return newCache;
        });

        setLastFetchTime(prev => {
          const newCache = new Map(prev);
          expiredKeys.forEach(key => newCache.delete(key));
          return newCache;
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const value = {
    // Data fetching
    getLeaderboard,
    getUserRanking,
    getLeaderboardStats,
    
    // Cache management
    invalidateCache,
    
    // Cache info
    cacheSize: leaderboardCache.size + userRankingCache.size,
    isCacheValid
  };

  return (
    <LeaderboardContext.Provider value={value}>
      {children}
    </LeaderboardContext.Provider>
  );
};

export default LeaderboardContext;
