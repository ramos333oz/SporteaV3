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
import CircularTierGallery from '../components/leaderboard/CircularTierGallery';
import AnimatedLeaderboardList from '../components/leaderboard/AnimatedLeaderboardList';
import LeaderboardHeader from '../components/leaderboard/LeaderboardHeader';
import AnimatedUserTierCard from '../components/leaderboard/AnimatedUserTierCard';
import '../components/leaderboard/LeaderboardHeader.css';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { isWebGLSupported } from '../utils/tierCardGenerator';
import { TIER_CONFIG, getUserTier } from '../utils/tierSystem';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import WhatshotIcon from '@mui/icons-material/Whatshot';

// TIER_CONFIG and getUserTier now imported from shared utilities

// Old UserTierCard component removed - replaced with AnimatedUserTierCard

const Leaderboard = () => {
  const { user } = useAuth();
  const [gamificationData, setGamificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webglSupported, setWebglSupported] = useState(true);

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

  // Check WebGL support
  useEffect(() => {
    setWebglSupported(isWebGLSupported());
  }, []);

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
      {/* Professional Animated Header */}
      <LeaderboardHeader
        totalPlayers={leaderboard.leaderboardData?.length || 0}
        userRank={leaderboard.userRank}
        userScore={leaderboard.userScore}
        leaderboardType={leaderboard.type}
      />

      {/* Animated User Tier Display - Centered */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mb: 4,
          width: '100%'
        }}
      >
        <AnimatedUserTierCard
          user={user}
          gamificationData={gamificationData}
          tierConfig={TIER_CONFIG}
          getUserTier={getUserTier}
        />
      </Box>

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

        {/* Main Leaderboard Display - Enhanced with Animations */}
        <AnimatedLeaderboardList
          data={leaderboard.leaderboardData}
          loading={leaderboard.loading}
          type={leaderboard.type}
          showUserHighlight={true}
          currentUserId={user?.id}
          tierConfig={TIER_CONFIG}
          getUserTier={getUserTier}
          showGradients={true}
          enableArrowNavigation={true}
          displayScrollbar={true}
          maxHeight={600}
        />
      </Paper>

      {/* 3D Tier Gallery Section */}
      {webglSupported ? (
        <CircularTierGallery
          tierConfig={TIER_CONFIG}
          height={500}
          bend={3}
          textColor="var(--primary)"
          borderRadius={0.1}
          scrollSpeed={2}
          scrollEase={0.02}
          currentUserTier={gamificationData ? getUserTier(gamificationData.current_level || 1) : null}
          gamificationData={gamificationData}
        />
      ) : (
        /* Fallback: Original Grid Layout */
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
                  transition: 'all 0.3s ease',
                  boxShadow: 'var(--shadow-md)',
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: 'var(--shadow-xl)'
                  }
                }}>
                  <CardContent sx={{ textAlign: 'center', p: 2 }}>
                    <Box sx={{
                      mb: 1,
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={tier.iconImage}
                        alt={`${tier.name} rank symbol`}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                        }}
                        onError={(e) => {
                          // Fallback to emoji if image fails to load
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <Typography
                        variant="h4"
                        sx={{
                          fontSize: '3rem',
                          display: 'none' // Hidden by default, shown on image error
                        }}
                      >
                        {tier.icon}
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{
                      color: tier.color,
                      fontWeight: 'bold',
                      fontFamily: 'var(--font-serif)',
                      mb: 1
                    }}>
                      {tier.name}
                    </Typography>
                    <Typography variant="body2" display="block" sx={{
                      mb: 1,
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 500
                    }}>
                      Levels {tier.levels}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-sans)'
                    }}>
                      {tier.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default Leaderboard;
