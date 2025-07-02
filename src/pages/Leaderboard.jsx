import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Card,
  CardContent,
  Chip,
  Avatar,
  Grid,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import {
  LeaderboardList,
  LeaderboardTypeSelector,
  UserRankingCard
} from '../components/leaderboard';
import { useLeaderboard } from '../hooks/useLeaderboard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import WhatshotIcon from '@mui/icons-material/Whatshot';

// Tier configuration with visual styling
const TIER_CONFIG = {
  bronze: {
    name: 'Bronze Tier',
    subtitle: 'Beginner League',
    levels: '1-10',
    color: '#CD7F32',
    bgColor: '#FFF8DC',
    icon: '🥉',
    description: 'New players learning the basics'
  },
  silver: {
    name: 'Silver Tier',
    subtitle: 'Intermediate League', 
    levels: '11-25',
    color: '#C0C0C0',
    bgColor: '#F8F8FF',
    icon: '🥈',
    description: 'Regular participants building skills'
  },
  gold: {
    name: 'Gold Tier',
    subtitle: 'Advanced League',
    levels: '26-50', 
    color: '#FFD700',
    bgColor: '#FFFACD',
    icon: '🥇',
    description: 'Active community members and skilled players'
  },
  platinum: {
    name: 'Platinum Tier',
    subtitle: 'Expert League',
    levels: '51-75',
    color: '#E5E4E2',
    bgColor: '#F5F5F5',
    icon: '💎',
    description: 'Experienced players and community leaders'
  },
  diamond: {
    name: 'Diamond Tier',
    subtitle: 'Master League',
    levels: '76-100',
    color: '#B9F2FF',
    bgColor: '#F0F8FF',
    icon: '💠',
    description: 'Elite players and top community builders'
  }
};

// Function to determine user tier based on level
const getUserTier = (level) => {
  if (level >= 1 && level <= 10) return 'bronze';
  if (level >= 11 && level <= 25) return 'silver';
  if (level >= 26 && level <= 50) return 'gold';
  if (level >= 51 && level <= 75) return 'platinum';
  if (level >= 76 && level <= 100) return 'diamond';
  return 'bronze'; // Default fallback
};

// User Tier Display Component
const UserTierCard = ({ user, gamificationData }) => {
  if (!user || !gamificationData) return null;

  const userLevel = gamificationData.current_level || 1;
  const tierKey = getUserTier(userLevel);
  const tier = TIER_CONFIG[tierKey];

  return (
    <Card 
      sx={{ 
        mb: 3, 
        background: `linear-gradient(135deg, ${tier.bgColor} 0%, ${tier.color}20 100%)`,
        border: `2px solid ${tier.color}40`
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h2" sx={{ fontSize: '2rem' }}>
            {tier.icon}
          </Typography>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: tier.color, fontWeight: 'bold' }}>
              {tier.name} - {tier.subtitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tier.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Chip 
                label={`Level ${userLevel}`} 
                size="small" 
                sx={{ backgroundColor: tier.color, color: 'white' }}
              />
              <Chip 
                label={`Levels ${tier.levels}`} 
                size="small" 
                variant="outlined"
                sx={{ borderColor: tier.color, color: tier.color }}
              />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const Leaderboard = () => {
  const { user } = useAuth();
  const [gamificationData, setGamificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use leaderboard hook for state management
  const leaderboard = useLeaderboard(user?.id, true);

  // Fetch user's gamification data for tier display
  useEffect(() => {
    const fetchGamificationData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        // Import achievement service dynamically to avoid circular imports
        const { default: achievementService } = await import('../services/achievementService');
        const data = await achievementService.getUserGamification(user.id);
        setGamificationData(data);
      } catch (error) {
        console.error('Error fetching gamification data:', error);
        setError('Failed to load user tier information');
      } finally {
        setLoading(false);
      }
    };

    fetchGamificationData();
  }, [user?.id]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading leaderboards...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h1" gutterBottom sx={{ 
          fontSize: { xs: '2rem', md: '2.5rem' },
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #FFD700, #FF6B35)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🏆 Leaderboards & Rankings
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Compete with fellow athletes, climb the ranks, and showcase your achievements! 
          Progress through tiers from Bronze to Diamond as you level up.
        </Typography>
      </Box>

      {/* User's Current Tier Display */}
      <UserTierCard user={user} gamificationData={gamificationData} />

      {/* Leaderboard Controls and Display */}
      <Paper sx={{ p: 3 }}>
        {/* Leaderboard Type Selection */}
        <LeaderboardTypeSelector
          selectedType={leaderboard.type}
          selectedTimeframe={leaderboard.timeframe}
          selectedGroup={leaderboard.groupType}
          onTypeChange={leaderboard.updateType}
          onTimeframeChange={leaderboard.updateTimeframe}
          onGroupChange={leaderboard.updateGroupType}
          friendsCount={leaderboard.friendsCount || 0}
        />

        {/* User's Current Ranking */}
        <UserRankingCard
          userRanking={leaderboard.userRanking}
          loading={leaderboard.loading}
          type={leaderboard.type}
          timeframe={leaderboard.timeframe}
          groupType={leaderboard.groupType}
        />

        {/* Main Leaderboard Display */}
        <LeaderboardList
          data={leaderboard.leaderboardData}
          loading={leaderboard.loading}
          type={leaderboard.type}
          showUserHighlight={true}
          currentUserId={user?.id}
          tierConfig={TIER_CONFIG}
          getUserTier={getUserTier}
        />
      </Paper>

      {/* Tier Information Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
          🎯 Tier System Overview
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(TIER_CONFIG).map(([key, tier]) => (
            <Grid item xs={12} sm={6} md={4} lg={2.4} key={key}>
              <Card sx={{ 
                height: '100%',
                background: `linear-gradient(135deg, ${tier.bgColor} 0%, ${tier.color}20 100%)`,
                border: `1px solid ${tier.color}40`,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" sx={{ mb: 1 }}>
                    {tier.icon}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ 
                    color: tier.color, 
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}>
                    {tier.name}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                    Levels {tier.levels}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {tier.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default Leaderboard;
