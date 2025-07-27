import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  WorkspacePremium as MedalIcon,
  MilitaryTech as BadgeIcon,
  TrendingUp as XPIcon
} from '@mui/icons-material';
import { calculateLevel, getLevelColor, formatXP } from '../../utils/levelCalculation';
import { achievementService } from '../../services/achievementService';

/**
 * SimpleLeaderboard Component
 * 
 * Simplified leaderboard focusing on XP-only ranking with performance optimization.
 * Follows the simplified gamification system design principles:
 * - Single Experience leaderboard
 * - Client-side level calculations
 * - Performance-first approach
 * - Clear, predictable progression display
 */
const SimpleLeaderboard = ({ 
  currentUserId = null,
  showUserHighlight = true,
  maxEntries = 50 
}) => {
  // State management
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('all'); // all, weekly, monthly
  const [groupType, setGroupType] = useState('global'); // global, friends, faculty

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use simplified leaderboard query focusing on XP only
      const data = await achievementService.getSimpleLeaderboard({
        timeframe,
        groupType,
        limit: maxEntries,
        userId: currentUserId
      });

      setLeaderboardData(data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  }, [timeframe, groupType, maxEntries, currentUserId]);

  // Initial load and refresh on dependency changes
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Get rank icon based on position
  const getRankIcon = useCallback((rank) => {
    const iconProps = { fontSize: '1.5rem' };

    switch (rank) {
      case 1:
        return <TrophyIcon sx={{ color: 'var(--chart-4)', ...iconProps }} />; // Gold
      case 2:
        return <MedalIcon sx={{ color: 'var(--muted-foreground)', ...iconProps }} />; // Silver
      case 3:
        return <BadgeIcon sx={{ color: 'var(--chart-5)', ...iconProps }} />; // Bronze
      default:
        return (
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: 'var(--muted-foreground)'
            }}
          >
            {rank}
          </Box>
        );
    }
  }, []);

  // Memoized leaderboard entries for performance
  const leaderboardEntries = useMemo(() => {
    return leaderboardData.map((entry, index) => {
      const rank = index + 1;
      const level = calculateLevel(entry.total_xp);
      const levelColor = getLevelColor(level);
      const isCurrentUser = currentUserId && entry.user_id === currentUserId;

      return {
        ...entry,
        rank,
        level,
        levelColor,
        isCurrentUser,
        formattedXP: formatXP(entry.total_xp)
      };
    });
  }, [leaderboardData, currentUserId]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((event, newValue) => {
    setTimeframe(newValue);
  }, []);

  // Handle group type change
  const handleGroupTypeChange = useCallback((event) => {
    setGroupType(event.target.value);
  }, []);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <XPIcon color="primary" />
          Experience Leaderboard
        </Typography>

        {/* Controls */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          {/* Timeframe Tabs */}
          <Tabs value={timeframe} onChange={handleTimeframeChange} size="small">
            <Tab label="All Time" value="all" />
            <Tab label="This Week" value="weekly" />
            <Tab label="This Month" value="monthly" />
          </Tabs>

          {/* Group Type Selector */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Group</InputLabel>
            <Select value={groupType} onChange={handleGroupTypeChange} label="Group">
              <MenuItem value="global">Global</MenuItem>
              <MenuItem value="friends">Friends</MenuItem>
              <MenuItem value="faculty">Faculty</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Leaderboard List */}
      {leaderboardEntries.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No leaderboard data available
          </Typography>
        </Box>
      ) : (
        <List sx={{ p: 0 }}>
          {leaderboardEntries.map((entry) => (
            <ListItem
              key={entry.user_id}
              sx={{
                py: 2,
                px: 2,
                mb: 1,
                borderRadius: 1,
                bgcolor: entry.isCurrentUser ? 'primary.50' : 'transparent',
                border: entry.isCurrentUser ? '2px solid' : '1px solid',
                borderColor: entry.isCurrentUser ? 'primary.main' : 'divider',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: entry.isCurrentUser ? 'primary.100' : 'grey.50',
                  transform: 'translateY(-1px)',
                  boxShadow: 1
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                {/* Rank Icon */}
                <Box sx={{ minWidth: 32, display: 'flex', justifyContent: 'center' }}>
                  {getRankIcon(entry.rank)}
                </Box>

                {/* User Avatar */}
                <Avatar
                  src={entry.avatar_url}
                  alt={entry.full_name}
                  sx={{ 
                    width: 48, 
                    height: 48,
                    border: `2px solid ${entry.levelColor}`,
                    boxShadow: 1
                  }}
                >
                  {entry.full_name?.charAt(0)?.toUpperCase()}
                </Avatar>

                {/* User Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {entry.full_name || 'Anonymous User'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`Level ${entry.level}`}
                      size="small"
                      sx={{
                        bgcolor: entry.levelColor,
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                    {entry.faculty && (
                      <Chip
                        label={entry.faculty}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>

                {/* XP Display */}
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {entry.formattedXP}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    XP
                  </Typography>
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>
      )}

      {/* Footer Stats */}
      {leaderboardEntries.length > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
            Showing top {leaderboardEntries.length} players • Updated in real-time
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default SimpleLeaderboard;
