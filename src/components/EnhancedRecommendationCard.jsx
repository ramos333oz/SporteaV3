import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  Button, 
  IconButton,
  Divider,
  Stack,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  ThumbUp,
  ThumbDown,
  ThumbUpOutlined,
  ThumbDownOutlined,
  ExpandMore,
  ExpandLess,
  SportsSoccer,
  SportsBasketball,
  SportsTennis,
  SportsRugby,
  SportsVolleyball,
  SportsHockey,
  SportsScore,
  LocationOn,
  CalendarMonth,
  Group,
  TrendingUp,
  Star,
  AccessTime,
  Analytics,
  Calculate,
  Functions,
  Timeline,
  Place,
  Sports,
  Schedule,
  School,
  EmojiPeople,
  Info
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import UnifiedCard from './UnifiedCard';

/**
 * Enhanced Recommendation Card Component
 * Uses the unified card system while maintaining feedback functionality
 * and detailed recommendation scoring breakdown
 */

// Sport icon mapping using database UUIDs with CSS variable colors
const sportIcons = {
  '4746e9c1-f772-4515-8d08-6c28563fbfc9': <SportsSoccer sx={{ color: 'var(--sport-football)' }} />, // Football
  '13e32815-8a3b-48f7-8cc9-5fdad873b851': <SportsRugby sx={{ color: 'var(--sport-rugby)' }} />, // Rugby
  'dd400853-7ce6-47bc-aee6-2ee241530f79': <SportsBasketball sx={{ color: 'var(--sport-basketball)' }} />, // Basketball
  'd662bc78-9e50-4785-ac71-d1e591e4a9ce': <SportsSoccer sx={{ color: 'var(--sport-futsal)' }} />, // Futsal
  '66e9893a-2be7-47f0-b7d3-d7191901dd77': <SportsVolleyball sx={{ color: 'var(--sport-volleyball)' }} />, // Volleyball
  'dcedf87a-13aa-4c2f-979f-6b71d457f531': <SportsHockey sx={{ color: 'var(--sport-frisbee)', transform: 'rotate(90deg)' }} />, // Frisbee
  '3aba0f36-38bf-4ca2-b713-3dabd9f993f1': <SportsHockey sx={{ color: 'var(--sport-hockey)' }} />, // Hockey
  'fb575fc1-2eac-4142-898a-2f7dae107844': <SportsTennis sx={{ color: 'var(--sport-badminton)' }} />, // Badminton
  '9a304214-6c57-4c33-8c5f-3f1955b63caf': <SportsTennis sx={{ color: 'var(--sport-tennis)' }} />, // Tennis
  '845d3461-42fc-45c2-a403-8efcaf237c17': <SportsTennis sx={{ color: 'var(--sport-basketball)' }} />, // Table Tennis
  '0ec51cfc-f644-4057-99d8-d2c29c1b7dd0': <SportsTennis sx={{ color: 'var(--sport-squash)' }} />, // Squash
};

// Default venue images mapping using database UUIDs (same as LiveMatchBoard)
const defaultVenueImages = {
  '4746e9c1-f772-4515-8d08-6c28563fbfc9': '/images/venues/football-field.jpg', // Football
  '13e32815-8a3b-48f7-8cc9-5fdad873b851': '/images/venues/rugby-field.jpg', // Rugby
  'dd400853-7ce6-47bc-aee6-2ee241530f79': '/images/venues/basketball-court.jpg', // Basketball
  'd662bc78-9e50-4785-ac71-d1e591e4a9ce': '/images/venues/futsal-court.jpg', // Futsal
  '66e9893a-2be7-47f0-b7d3-d7191901dd77': '/images/venues/volleyball-court.jpg', // Volleyball
  'dcedf87a-13aa-4c2f-979f-6b71d457f531': '/images/venues/field.jpg', // Frisbee
  '3aba0f36-38bf-4ca2-b713-3dabd9f993f1': '/images/venues/hockey-field.jpg', // Hockey
  'fb575fc1-2eac-4142-898a-2f7dae107844': '/images/venues/badminton-court.jpg', // Badminton
  '9a304214-6c57-4c33-8c5f-3f1955b63caf': '/images/venues/tennis-court.jpg', // Tennis
  '845d3461-42fc-45c2-a403-8efcaf237c17': '/images/venues/table-tennis-court.jpg', // Table Tennis
  '0ec51cfc-f644-4057-99d8-d2c29c1b7dd0': '/images/venues/squash-court.jpg', // Squash
};

const EnhancedRecommendationCard = React.memo(({
  recommendation,
  isFallback = false,
  metrics = null,
  recommendationType = 'standard',
  onFeedback = () => {}
}) => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(recommendation?.existingFeedback || null);
  const [expanded, setExpanded] = useState(false);
  const [scoreBreakdownExpanded, setScoreBreakdownExpanded] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(!!recommendation?.existingFeedback);

  // Update feedback state when recommendation changes (e.g., after giving feedback)
  React.useEffect(() => {
    setFeedback(recommendation?.existingFeedback || null);
    setFeedbackSent(!!recommendation?.existingFeedback);
  }, [recommendation?.existingFeedback]);

  if (!recommendation?.match) return null;
  
  const {
    match,
    score,
    explanation,
    final_score,
    direct_preference,
    collaborative_filtering,
    activity_based,
    score_breakdown,
    similarity_score,
    similarity_percentage,
    mathematical_breakdown
  } = recommendation;
  
  // Determine which score to display
  const displayScore = final_score !== undefined ? final_score : score;
  
  // Format date and time
  const formattedDate = format(new Date(match.start_time), 'MMM dd');
  const formattedTime = format(new Date(match.start_time), 'h:mm a');
  
  // Get sport info
  const sportId = match.sport_id || match.sport?.id;
  const sportName = match.sport?.name || match.sports?.name || 'Sport';
  const sportIcon = sportIcons[sportId] || <SportsSoccer />;
  
  // Prioritize actual venue image from location, fallback to sport-based default (same as LiveMatchBoard)
  const venueImage = match.location_image_url ||
                     (match.locations?.image_url) ||
                     defaultVenueImages[sportId] ||
                     '/images/venues/default-field.jpg';

  // Calculate spots remaining - use current_participants field like live matches
  const currentParticipants = match.current_participants || 0;
  const spotsRemaining = match.max_participants - currentParticipants;

  // Score breakdown calculation
  const scoreBreakdownData = React.useMemo(() => {
    // Check if we have score_breakdown from the simplified recommendation service
    if (score_breakdown) {
      const weights = {
        sports: 0.40,
        faculty: 0.25,
        skill: 0.20,
        schedule: 0.10,
        location: 0.05
      };

      return {
        factors: [
          {
            label: 'Sports Compatibility',
            icon: <Sports />,
            score: score_breakdown.sports || 0,
            weight: weights.sports,
            weightedScore: (score_breakdown.sports || 0) * weights.sports,
            description: score_breakdown.sports === 1 ?
              'Perfect match - this sport is in your preferences' :
              score_breakdown.sports > 0.7 ?
              'Good match - similar to your preferred sports' :
              score_breakdown.sports > 0.3 ?
              'Moderate match - related sport category' :
              'Different sport - opportunity to try something new'
          },
          {
            label: 'Faculty Similarity',
            icon: <School />,
            score: score_breakdown.faculty || 0,
            weight: weights.faculty,
            weightedScore: (score_breakdown.faculty || 0) * weights.faculty,
            description: score_breakdown.faculty === 1 ?
              'Same faculty - great for building connections' :
              score_breakdown.faculty > 0.5 ?
              'Related faculty - good networking opportunity' :
              'Different faculty - chance to meet diverse students'
          },
          {
            label: 'Skill Level Match',
            icon: <Star />,
            score: score_breakdown.skill || 0,
            weight: weights.skill,
            weightedScore: (score_breakdown.skill || 0) * weights.skill,
            description: score_breakdown.skill === 1 ?
              'Perfect skill match - ideal playing level' :
              score_breakdown.skill > 0.7 ?
              'Good skill match - compatible playing level' :
              'Different skill level - opportunity to learn or teach'
          },
          {
            label: 'Schedule Compatibility',
            icon: <AccessTime />,
            score: score_breakdown.schedule || 0,
            weight: weights.schedule,
            weightedScore: (score_breakdown.schedule || 0) * weights.schedule,
            description: score_breakdown.schedule === 1 ?
              'Perfect timing - matches your availability' :
              score_breakdown.schedule > 0.5 ?
              'Good timing - close to your preferred times' :
              'Different timing - consider adjusting your schedule'
          },
          {
            label: 'Location Proximity',
            icon: <LocationOn />,
            score: score_breakdown.location || 0,
            weight: weights.location,
            weightedScore: (score_breakdown.location || 0) * weights.location,
            description: score_breakdown.location === 1 ?
              'Same campus - very convenient location' :
              score_breakdown.location > 0.5 ?
              'Nearby location - easily accessible' :
              'Different location - consider travel time'
          }
        ],
        totalScore: displayScore,
        methodology: 'Weighted scoring system that evaluates multiple compatibility factors'
      };
    }

    return null;
  }, [score_breakdown, displayScore]);
  
  const handleFeedback = async (type) => {
    // If feedback already exists, don't allow changes (locking mechanism)
    if (feedbackSent && feedback) {
      return;
    }

    if (feedback === type) {
      setFeedback(null);
      setFeedbackSent(false);
      onFeedback(null, match.id);
      return;
    }

    setFeedback(type);
    setFeedbackSent(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const feedbackData = {
          userId: user.id,
          matchId: match.id,
          feedbackType: type,
          recommendationData: recommendation,
          algorithmScores: score_breakdown,
          finalScore: displayScore,
          explanation: explanation
        };

        const { data, error } = await supabase.functions.invoke('recommendation-feedback', {
          body: feedbackData
        });

        if (error) {
          console.error('Error sending feedback:', error);
        }
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
    }

    onFeedback(type, match.id);
  };
  
  const handleCardClick = () => {
    navigate(`/match/${match.id}`);
  };
  
  // Extract preference factors for detailed breakdown
  const getPreferenceFactors = () => {
    const factors = [];

    // KNN User Similarity System (TEMPLATE.md methodology)
    if (recommendation.knn_user_similarity_score !== undefined) {
      const userSimilarityPercentage = Math.round(recommendation.knn_user_similarity_score * 100);
      const creatorName = recommendation.users?.name || 'Another user';

      factors.push({
        icon: <SportsScore color="primary" />,
        label: 'User Similarity Match',
        description: `${creatorName} has ${userSimilarityPercentage}% similar preferences and created this match`,
        score: recommendation.knn_user_similarity_score || 0,
        weight: '100%',
        color: 'primary',
        system: 'K-Nearest Neighbors User Recommendation (TEMPLATE.md)',
        systemColor: '#1976d2',
        mathematical: {
          formula: 'User Euclidean Distance = √[(x₁-y₁)² + (x₂-y₂)² + ... + (x₁₄₂-y₁₄₂)²]',
          vectorDimensions: 142,
          userDistance: recommendation.knn_user_distance?.toFixed(4) || 'N/A',
          userSimilarity: recommendation.knn_user_similarity_score?.toFixed(4) || 'N/A',
          methodology: 'Find similar users, recommend their matches',
          recommendationType: 'User similarity-based recommendation'
        }
      });
    }

    // Enhanced weighted cosine similarity system (academic demonstration)
    if (similarity_score !== undefined && similarity_percentage !== undefined) {
      factors.push({
        icon: <SportsScore color="primary" />,
        label: 'Enhanced Vector Similarity',
        description: `${similarity_percentage}% enhanced weighted cosine similarity targeting 90-100% accuracy`,
        score: similarity_score || 0,
        weight: '100%',
        color: 'primary',
        system: 'Enhanced Weighted Cosine Similarity v3',
        systemColor: '#1976d2',
        mathematical: mathematical_breakdown ? {
          formula: 'enhanced_weighted_cosine_similarity with attribute-specific weights',
          userVectorDims: mathematical_breakdown.user_vector_dimensions,
          matchVectorDims: mathematical_breakdown.match_vector_dimensions,
          enhancedWeightedSimilarity: mathematical_breakdown.enhanced_weighted_cosine_similarity,
          calculationMethod: mathematical_breakdown.calculation_method,
          optimizationLevel: mathematical_breakdown.optimization_level,
          attributeContributions: mathematical_breakdown.attribute_contributions,
          perfectMatchIndicators: mathematical_breakdown.perfect_match_indicators
        } : {
          formula: 'Enhanced weighted cosine similarity v4',
          calculationMethod: 'Enhanced weighted cosine similarity v4',
          similarity: similarity_score,
          percentage: similarity_percentage
        }
      });
      return factors;
    }

    if (score_breakdown && (direct_preference || collaborative_filtering || activity_based)) {
      // Direct Preference System (35% total weight)
      if (direct_preference) {
        factors.push({
          icon: <SportsSoccer color="primary" />,
          label: 'Direct Preferences',
          description: 'Based on your sport, venue, and schedule preferences',
          score: direct_preference.score || 0,
          weight: '35%',
          color: 'primary',
          system: 'Direct Matching',
          systemColor: '#1976d2'
        });
      }

      // Collaborative Filtering System (45% total weight)
      if (collaborative_filtering) {
        factors.push({
          icon: <Group color="secondary" />,
          label: 'Community Similarity',
          description: 'Based on users with similar preferences to you',
          score: collaborative_filtering.score || 0,
          weight: '45%',
          color: 'secondary',
          system: 'Collaborative Filtering',
          systemColor: '#9c27b0'
        });
      }

      // Activity-Based System (20% total weight)
      if (activity_based) {
        factors.push({
          icon: <TrendingUp color="info" />,
          label: 'Activity Patterns',
          description: 'Based on match popularity and your activity history',
          score: activity_based.score || 0,
          weight: '20%',
          color: 'info',
          system: 'Activity Analysis',
          systemColor: '#0288d1'
        });
      }
    }

    return factors;
  };
  
  const preferenceFactors = getPreferenceFactors();
  
  return (
    <UnifiedCard
      image={venueImage}
      imageAlt={`${sportName} at ${match.location?.name || match.locations?.name}`}
      imageHeight={140}
      title={match.title || `${sportName} Match`}
      subtitle={recommendation.why_recommended || 'Recommended for you'}
      score={displayScore}
      onClick={handleCardClick}
      variant={isFallback ? 'outlined' : 'elevated'}
      ariaLabel={`Recommended ${sportName} match`}
      sx={{
        border: feedback === 'liked'
          ? '2px solid var(--chart-1)'
          : feedback === 'disliked'
            ? '2px solid var(--destructive)'
            : undefined
      }}
    >
      {/* Sport and Match Info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {sportIcon}
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
          {sportName}
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <Chip 
            label={`${Math.round(displayScore * 100)}% Match`}
            size="small"
            color={displayScore >= 0.7 ? 'success' : displayScore >= 0.4 ? 'primary' : 'warning'}
            icon={<Star />}
          />
        </Box>
      </Box>
      
      {/* Key Match Details */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label={`${formattedDate} • ${formattedTime}`}
            size="small"
            variant="outlined"
            icon={<AccessTime />}
            sx={{ flexShrink: 0 }}
          />
        </Stack>
        <Chip
          label={match.location?.name || match.locations?.name || 'TBA'}
          size="small"
          variant="outlined"
          icon={<LocationOn />}
          sx={{
            maxWidth: '100%',
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '200px'
            }
          }}
        />
      </Box>
      
      {/* Participants Info */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {currentParticipants}/{match.max_participants} players • {spotsRemaining} spots left
        </Typography>
      </Box>

      {/* Score Breakdown Section */}
      {scoreBreakdownData && (
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              p: 1.5,
              borderRadius: 2,
              backgroundColor: 'rgba(248, 250, 252, 0.8)',
              border: '1px solid rgba(226, 232, 240, 0.6)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(248, 250, 252, 1)',
                border: '1px solid rgba(203, 213, 225, 0.8)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              setScoreBreakdownExpanded(!scoreBreakdownExpanded);
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Info sx={{ color: '#64748b', fontSize: 18 }} />
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Libre Baskerville, serif',
                  fontWeight: 500,
                  color: '#475569',
                  letterSpacing: '0.01em'
                }}
              >
                Similarities Overview
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              >
                {scoreBreakdownExpanded ? 'Hide breakdown' : 'View breakdown'}
              </Typography>
              {scoreBreakdownExpanded ?
                <ExpandLess sx={{ color: '#64748b', fontSize: 18 }} /> :
                <ExpandMore sx={{ color: '#64748b', fontSize: 18 }} />
              }
            </Box>
          </Box>

          <Collapse in={scoreBreakdownExpanded}>
            <Box sx={{
              mt: 1.5,
              p: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: 3,
              border: '1px solid rgba(226, 232, 240, 0.4)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
            }}>
              <Typography
                variant="body2"
                sx={{
                  mb: 3,
                  fontFamily: 'Poppins, sans-serif',
                  color: '#64748b',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  textAlign: 'center',
                  fontWeight: 400
                }}
              >
                {scoreBreakdownData.methodology}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {scoreBreakdownData.factors.map((factor, index) => (
                  <Box key={index} sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    p: 2.5,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 2,
                    border: '1px solid rgba(241, 245, 249, 0.8)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.03)'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 20 }}>
                      {React.cloneElement(factor.icon, {
                        sx: { color: '#64748b', fontSize: 20 }
                      })}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: 'var(--foreground)',
                            fontSize: '0.9rem',
                            letterSpacing: '0.01em'
                          }}
                        >
                          {factor.label}
                        </Typography>
                        <Chip
                          label={`${Math.round(factor.weight * 100)}%`}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            borderColor: 'var(--border)',
                            color: 'var(--muted-foreground)',
                            backgroundColor: 'var(--muted)',
                            '& .MuiChip-label': {
                              px: 1
                            }
                          }}
                        />
                      </Box>

                      <Typography
                        variant="caption"
                        sx={{
                          color: '#64748b',
                          fontFamily: 'Poppins, sans-serif',
                          display: 'block',
                          mb: 1.5,
                          fontSize: '0.8rem',
                          lineHeight: 1.5,
                          fontWeight: 400
                        }}
                      >
                        {factor.description}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={factor.score * 100}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'rgba(226, 232, 240, 0.4)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: factor.score > 0.7 ? 'rgba(34, 197, 94, 0.8)' :
                                              factor.score > 0.4 ? 'rgba(251, 146, 60, 0.8)' :
                                              'rgba(239, 68, 68, 0.8)',
                                borderRadius: 3,
                                transition: 'all 0.3s ease'
                              }
                            }}
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontWeight: 500,
                            minWidth: 90,
                            textAlign: 'right',
                            color: '#475569',
                            fontSize: '0.75rem',
                            letterSpacing: '0.02em'
                          }}
                        >
                          {Math.round(factor.score * 100)}% × {Math.round(factor.weight * 100)}% = {Math.round(factor.weightedScore * 100)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 3, borderColor: 'rgba(226, 232, 240, 0.3)' }} />

              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2.5,
                backgroundColor: 'var(--muted)',
                borderRadius: 'var(--radius)',
                color: 'var(--muted-foreground)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Calculate sx={{ fontSize: 18, opacity: 0.9 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'Libre Baskerville, serif',
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      letterSpacing: '0.01em',
                      opacity: 0.95
                    }}
                  >
                    Overall Compatibility
                  </Typography>
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    letterSpacing: '0.02em'
                  }}
                >
                  {Math.round(scoreBreakdownData.totalScore * 100)}%
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </Box>
      )}
      
      {/* Recommendation Factors (Expandable) */}
      {preferenceFactors.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
            sx={{ p: 0, minWidth: 'auto' }}
          >
            <Typography variant="caption" color="text.secondary">
              Why recommended?
            </Typography>
          </Button>
          
          <Collapse in={expanded}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Recommendation Algorithm Breakdown (Total: 100%)
              </Typography>

              <List dense sx={{ mt: 1 }}>
                {preferenceFactors.map((factor, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {factor.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {factor.label}
                          </Typography>
                          <Chip
                            label={factor.weight}
                            size="small"
                            variant="filled"
                            sx={{
                              bgcolor: factor.systemColor,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.7rem'
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box component="div">
                          <Typography variant="caption" color="text.secondary" component="span" sx={{ mb: 1, display: 'block' }}>
                            {factor.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={factor.score * 100}
                              color={factor.color}
                              sx={{
                                flexGrow: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'grey.200'
                              }}
                            />
                            <Typography variant="caption" component="span" sx={{ minWidth: 35, textAlign: 'right', fontWeight: 500 }}>
                              {Math.round(factor.score * 100)}%
                            </Typography>
                          </Box>
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                ))}
              </List>

              {/* Summary */}
              <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'grey.300' }}>
                <Typography variant="caption" color="text.secondary">
                  Final Score: {Math.round(displayScore * 100)}% match based on all factors
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </Box>
      )}
      
      {/* Actions */}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/match/${match.id}`);
          }}
          sx={{
            flex: 1,
            borderRadius: 2,
            fontWeight: 600,
            textTransform: 'none',
            borderWidth: 1.5,
            '&:hover': {
              borderWidth: 1.5,
              transform: 'translateY(-1px)',
            }
          }}
        >
          View Match
        </Button>
        
        {/* Feedback Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={feedbackSent && feedback ? "Feedback already given" : "Like this recommendation"}>
            <span>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFeedback('liked');
                }}
                disabled={feedbackSent && feedback && feedback !== 'liked'}
                color={feedback === 'liked' ? 'success' : 'default'}
                sx={{
                  borderRadius: 'var(--radius)',
                  border: '1.5px solid',
                  borderColor: feedback === 'liked' ? 'var(--chart-1)' : 'var(--border)',
                  backgroundColor: feedback === 'liked' ? 'var(--accent)' : 'transparent',
                  opacity: feedbackSent && feedback && feedback !== 'liked' ? 0.5 : 1,
                  cursor: feedbackSent && feedback && feedback !== 'liked' ? 'not-allowed' : 'pointer',
                  '&:hover': {
                    backgroundColor: feedbackSent && feedback && feedback !== 'liked'
                      ? 'transparent'
                      : feedback === 'liked' ? 'var(--accent)' : 'var(--accent)',
                    borderColor: feedbackSent && feedback && feedback !== 'liked'
                      ? 'var(--border)'
                      : 'var(--chart-1)',
                    transform: feedbackSent && feedback && feedback !== 'liked'
                      ? 'none'
                      : 'translateY(-1px)',
                  },
                  '&.Mui-disabled': {
                    borderColor: 'divider',
                    color: 'text.disabled'
                  }
                }}
              >
                {feedback === 'liked' ? <ThumbUp /> : <ThumbUpOutlined />}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={feedbackSent && feedback ? "Feedback already given" : "Dislike this recommendation"}>
            <span>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFeedback('disliked');
                }}
                disabled={feedbackSent && feedback && feedback !== 'disliked'}
                color={feedback === 'disliked' ? 'error' : 'default'}
                sx={{
                  borderRadius: 2,
                  border: '1.5px solid',
                  borderColor: feedback === 'disliked' ? 'error.main' : 'divider',
                  backgroundColor: feedback === 'disliked' ? 'error.light' : 'transparent',
                  opacity: feedbackSent && feedback && feedback !== 'disliked' ? 0.5 : 1,
                  cursor: feedbackSent && feedback && feedback !== 'disliked' ? 'not-allowed' : 'pointer',
                  '&:hover': {
                    backgroundColor: feedbackSent && feedback && feedback !== 'disliked'
                      ? 'transparent'
                      : feedback === 'disliked' ? 'error.light' : 'error.lighter',
                    borderColor: feedbackSent && feedback && feedback !== 'disliked'
                      ? 'divider'
                      : 'error.main',
                    transform: feedbackSent && feedback && feedback !== 'disliked'
                      ? 'none'
                      : 'translateY(-1px)',
                  },
                  '&.Mui-disabled': {
                    borderColor: 'divider',
                    color: 'text.disabled'
                  }
                }}
              >
                {feedback === 'disliked' ? <ThumbDown /> : <ThumbDownOutlined />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Feedback confirmation */}
      {feedbackSent && feedback && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center', display: 'block' }}>
          Thanks for your feedback! You {feedback} this recommendation.
        </Typography>
      )}
    </UnifiedCard>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo optimization
  return (
    prevProps.recommendation?.match?.id === nextProps.recommendation?.match?.id &&
    prevProps.recommendation?.score === nextProps.recommendation?.score &&
    prevProps.recommendation?.existingFeedback === nextProps.recommendation?.existingFeedback &&
    prevProps.isFallback === nextProps.isFallback &&
    prevProps.recommendationType === nextProps.recommendationType
  );
});

export default EnhancedRecommendationCard;
