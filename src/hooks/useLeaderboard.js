import { useState, useEffect, useCallback } from 'react';
import achievementService from '../services/achievementService';

/**
 * useLeaderboard Hook
 * Manages leaderboard data fetching and state management
 * Following SporteaV3's patterns and best practices
 */
export const useLeaderboard = (userId = null, isOwnProfile = false) => {
  // State management
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRanking, setUserRanking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [friendsCount, setFriendsCount] = useState(0);

  // Leaderboard configuration
  const [type, setType] = useState('xp');
  const [timeframe, setTimeframe] = useState('all');
  const [groupType, setGroupType] = useState('global');

  // Fetch leaderboard data
  const fetchLeaderboardData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch friends count for friend-based leaderboards
      if (isOwnProfile) {
        const friends = await achievementService.getUserFriends(userId);
        setFriendsCount(friends.length);
      }

      // Fetch leaderboard data
      const leaderboard = await achievementService.getLeaderboard(
        type,
        timeframe,
        50, // Limit to top 50
        groupType,
        userId
      );
      setLeaderboardData(leaderboard);

      // Fetch user's ranking if viewing own profile
      if (isOwnProfile) {
        const ranking = await achievementService.getUserRanking(
          userId,
          type,
          timeframe,
          groupType
        );
        setUserRanking(ranking);
      }

    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      setError(err.message || 'Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  }, [userId, type, timeframe, groupType, isOwnProfile]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  // Refresh leaderboard data
  const refreshLeaderboard = useCallback(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  // Update leaderboard type
  const updateType = useCallback((newType) => {
    setType(newType);
  }, []);

  // Update timeframe
  const updateTimeframe = useCallback((newTimeframe) => {
    setTimeframe(newTimeframe);
  }, []);

  // Update group type
  const updateGroupType = useCallback((newGroupType) => {
    setGroupType(newGroupType);
  }, []);

  // Get leaderboard statistics
  const getLeaderboardStats = useCallback(() => {
    if (!leaderboardData.length) return null;

    const totalParticipants = leaderboardData.length;
    const topScore = leaderboardData[0]?.score || 0;
    const averageScore = leaderboardData.reduce((sum, entry) => sum + entry.score, 0) / totalParticipants;

    return {
      totalParticipants,
      topScore,
      averageScore: Math.round(averageScore * 100) / 100
    };
  }, [leaderboardData]);

  // Check if user is in top positions
  const isUserInTop = useCallback((position = 10) => {
    return userRanking && userRanking.rank <= position;
  }, [userRanking]);

  // Get user's percentile
  const getUserPercentile = useCallback(() => {
    if (!userRanking) return null;
    
    const { rank, totalParticipants } = userRanking;
    return Math.round(((totalParticipants - rank + 1) / totalParticipants) * 100);
  }, [userRanking]);

  return {
    // Data
    leaderboardData,
    userRanking,
    friendsCount,
    
    // State
    loading,
    error,
    
    // Configuration
    type,
    timeframe,
    groupType,
    
    // Actions
    updateType,
    updateTimeframe,
    updateGroupType,
    refreshLeaderboard,
    
    // Computed values
    stats: getLeaderboardStats(),
    isUserInTop,
    userPercentile: getUserPercentile()
  };
};

export default useLeaderboard;
