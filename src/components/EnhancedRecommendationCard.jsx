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
  const [feedback, setFeedback] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  
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
  
  // Get venue image
  const venueImage = match.location?.image || match.locations?.image || defaultVenueImages[sportId];
  
  // Calculate spots remaining
  const spotsRemaining = match.max_participants - (match.participants?.count || 0);
  
  const handleFeedback = async (type) => {
    if (feedback === type) {
      setFeedback(null);
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
      if (direct_preference?.breakdown) {
        factors.push({
          icon: <SportsSoccer color="primary" />,
          label: 'Sports Match',
          score: direct_preference.breakdown.sports_score || 0,
          weight: '30%',
          color: 'primary'
        });
        
        factors.push({
          icon: <LocationOn color="primary" />,
          label: 'Venue Match',
          score: direct_preference.breakdown.venue_score || 0,
          weight: '12%',
          color: 'primary'
        });
        
        factors.push({
          icon: <CalendarMonth color="primary" />,
          label: 'Schedule Match',
          score: direct_preference.breakdown.schedule_score || 0,
          weight: '9%',
          color: 'primary'
        });
      }
      
      if (collaborative_filtering) {
        factors.push({
          icon: <Group color="secondary" />,
          label: 'Community Match',
          score: collaborative_filtering.score || 0,
          weight: '30%',
          color: 'secondary'
        });
      }
      
      if (activity_based) {
        factors.push({
          icon: <TrendingUp color="info" />,
          label: 'Activity Pattern',
          score: activity_based.score || 0,
          weight: '10%',
          color: 'info'
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
          {match.participants?.count || 0}/{match.max_participants} players • {spotsRemaining} spots left
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
            <List dense sx={{ mt: 1 }}>
              {preferenceFactors.map((factor, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {factor.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption">{factor.label}</Typography>
                        <Chip label={factor.weight} size="small" variant="outlined" />
                      </Box>
                    }
                    secondary={
                      <LinearProgress 
                        variant="determinate" 
                        value={factor.score * 100}
                        color={factor.color}
                        sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>
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
          <Tooltip title="Like this recommendation">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback('liked');
              }}
              color={feedback === 'liked' ? 'success' : 'default'}
              sx={{
                borderRadius: 2,
                border: '1.5px solid',
                borderColor: feedback === 'liked' ? 'success.main' : 'divider',
                backgroundColor: feedback === 'liked' ? 'success.light' : 'transparent',
                '&:hover': {
                  backgroundColor: feedback === 'liked' ? 'success.light' : 'success.lighter',
                  borderColor: 'success.main',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              {feedback === 'liked' ? <ThumbUp /> : <ThumbUpOutlined />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Dislike this recommendation">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleFeedback('disliked');
              }}
              color={feedback === 'disliked' ? 'error' : 'default'}
              sx={{
                borderRadius: 2,
                border: '1.5px solid',
                borderColor: feedback === 'disliked' ? 'error.main' : 'divider',
                backgroundColor: feedback === 'disliked' ? 'error.light' : 'transparent',
                '&:hover': {
                  backgroundColor: feedback === 'disliked' ? 'error.light' : 'error.lighter',
                  borderColor: 'error.main',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              {feedback === 'disliked' ? <ThumbDown /> : <ThumbDownOutlined />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Feedback confirmation */}
      {feedbackSent && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center', display: 'block' }}>
          Thanks for your feedback!
        </Typography>
      )}
    </UnifiedCard>
  );
};

export default EnhancedRecommendationCard;
