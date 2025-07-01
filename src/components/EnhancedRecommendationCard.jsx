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
  LocationOn,
  CalendarMonth,
  Group,
  TrendingUp,
  Star,
  AccessTime
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

// Sport icon mapping using database UUIDs (consistent with other components)
const sportIcons = {
  '4746e9c1-f772-4515-8d08-6c28563fbfc9': <SportsSoccer sx={{ color: '#4CAF50' }} />, // Football
  '13e32815-8a3b-48f7-8cc9-5fdad873b851': <SportsRugby sx={{ color: '#FF9800' }} />, // Rugby
  'dd400853-7ce6-47bc-aee6-2ee241530f79': <SportsBasketball sx={{ color: '#FF5722' }} />, // Basketball
  'd662bc78-9e50-4785-ac71-d1e591e4a9ce': <SportsSoccer sx={{ color: '#2196F3' }} />, // Futsal
  '66e9893a-2be7-47f0-b7d3-d7191901dd77': <SportsVolleyball sx={{ color: '#9C27B0' }} />, // Volleyball
  'dcedf87a-13aa-4c2f-979f-6b71d457f531': <SportsHockey sx={{ color: '#607D8B', transform: 'rotate(90deg)' }} />, // Frisbee
  '3aba0f36-38bf-4ca2-b713-3dabd9f993f1': <SportsHockey sx={{ color: '#795548' }} />, // Hockey
  'fb575fc1-2eac-4142-898a-2f7dae107844': <SportsTennis sx={{ color: '#E91E63' }} />, // Badminton
  '9a304214-6c57-4c33-8c5f-3f1955b63caf': <SportsTennis sx={{ color: '#4CAF50' }} />, // Tennis
  '845d3461-42fc-45c2-a403-8efcaf237c17': <SportsTennis sx={{ color: '#FF5722' }} />, // Table Tennis
  '0ec51cfc-f644-4057-99d8-d2c29c1b7dd0': <SportsTennis sx={{ color: '#9C27B0' }} />, // Squash
};

const defaultVenueImages = {
  1: '/images/venues/football-field.jpg',
  2: '/images/venues/rugby-field.jpg', 
  3: '/images/venues/basketball-court.jpg',
  4: '/images/venues/futsal-court.jpg',
  5: '/images/venues/volleyball-court.jpg',
  6: '/images/venues/field.jpg',
  7: '/images/venues/hockey-field.jpg',
  8: '/images/venues/badminton-court.jpg',
};

const EnhancedRecommendationCard = ({
  recommendation,
  isFallback = false,
  metrics = null,
  recommendationType = 'standard',
  onFeedback = () => {}
}) => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(recommendation?.existingFeedback || null);
  const [expanded, setExpanded] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(!!recommendation?.existingFeedback);

  // Update feedback state when recommendation changes (e.g., after giving feedback)
  React.useEffect(() => {
    setFeedback(recommendation?.existingFeedback || null);
    setFeedbackSent(!!recommendation?.existingFeedback);
  }, [recommendation?.existingFeedback]);

  if (!recommendation?.match) return null;
  
  const { match, score, explanation, final_score, direct_preference, collaborative_filtering, activity_based, score_breakdown } = recommendation;
  
  // Determine which score to display
  const displayScore = final_score !== undefined ? final_score : score;
  
  // Format date and time
  const formattedDate = format(new Date(match.start_time), 'MMM dd');
  const formattedTime = format(new Date(match.start_time), 'h:mm a');
  
  // Get sport info
  const sportId = match.sport_id || match.sport?.id;
  const sportName = match.sport?.name || match.sports?.name || 'Sport';
  const sportIcon = sportIcons[sportId] || <SportsSoccer />;
  
  // Get venue image - prioritize actual venue image from location, fallback to sport-based default
  const venueImage = match.locations?.image_url ||
                     match.location?.image_url ||
                     match.location?.image ||
                     match.locations?.image ||
                     defaultVenueImages[sportId] ||
                     '/images/venues/default-field.jpg';

  // Calculate spots remaining - use current_participants field like live matches
  const currentParticipants = match.current_participants || 0;
  const spotsRemaining = match.max_participants - currentParticipants;
  
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
      subtitle={explanation || 'Recommended for you'}
      score={displayScore}
      onClick={handleCardClick}
      variant={isFallback ? 'outlined' : 'elevated'}
      ariaLabel={`Recommended ${sportName} match`}
      sx={{
        border: feedback === 'liked' 
          ? '2px solid #4CAF50' 
          : feedback === 'disliked' 
            ? '2px solid #f44336'
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
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip 
          label={`${formattedDate} • ${formattedTime}`}
          size="small"
          variant="outlined"
          icon={<AccessTime />}
        />
        <Chip 
          label={match.location?.name || match.locations?.name || 'TBA'}
          size="small"
          variant="outlined"
          icon={<LocationOn />}
        />
      </Stack>
      
      {/* Participants Info */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {currentParticipants}/{match.max_participants} players • {spotsRemaining} spots left
        </Typography>
      </Box>
      
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
                  borderRadius: 2,
                  border: '1.5px solid',
                  borderColor: feedback === 'liked' ? 'success.main' : 'divider',
                  backgroundColor: feedback === 'liked' ? 'success.light' : 'transparent',
                  opacity: feedbackSent && feedback && feedback !== 'liked' ? 0.5 : 1,
                  cursor: feedbackSent && feedback && feedback !== 'liked' ? 'not-allowed' : 'pointer',
                  '&:hover': {
                    backgroundColor: feedbackSent && feedback && feedback !== 'liked'
                      ? 'transparent'
                      : feedback === 'liked' ? 'success.light' : 'success.lighter',
                    borderColor: feedbackSent && feedback && feedback !== 'liked'
                      ? 'divider'
                      : 'success.main',
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
};

export default EnhancedRecommendationCard;
