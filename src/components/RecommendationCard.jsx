import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Button, 
  IconButton, 
  Tooltip, 
  Divider,
  ButtonGroup,
  Collapse,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  LinearProgress
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
  AccessTime,
  CalendarMonth,
  LocationOn,
  School,
  EmojiPeople,
  SportsScore,
  CheckCircle,
  Group,
  TrendingUp,
  Sports,
  Schedule,
  Star,
  Person,
  Info
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

// Sport icon mapping
const sportIcons = {
  football: <SportsSoccer />,
  rugby: <SportsRugby />,
  basketball: <SportsBasketball />,
  futsal: <SportsSoccer />,
  volley: <SportsVolleyball />,
  frisbee: <SportsHockey sx={{ transform: 'rotate(90deg)' }} />,
  hockey: <SportsHockey />,
  badminton: <SportsTennis />
};

/**
 * Card component for displaying a match recommendation with explanation and feedback options
 */
const RecommendationCard = memo(({
  recommendation,
  isFallback = false,
  metrics = null,
  recommendationType = 'standard',
  onFeedback = () => {}
}) => {
  // Extract data from recommendation object
  const {
    match,
    score,
    explanation,
    vector_similarity,
    sport_preference_match,
    preference_scores,
    match_score,
    breakdown,
    // New combined system fields
    final_score,
    direct_preference,
    collaborative_filtering,
    activity_based,
    score_breakdown,
    // Simplified vector system fields
    similarity_score,
    similarity_percentage,
    mathematical_breakdown,
    // Simple explainable system fields
    algorithm_breakdown,
    source
  } = recommendation || {};

  // Determine which score to display (prioritize simplified vector system)
  // Memoize expensive calculations
  const displayScore = useMemo(() => {
    return similarity_score !== undefined ? similarity_score :
           final_score !== undefined ? final_score :
           match_score !== undefined ? match_score : score;
  }, [similarity_score, final_score, match_score, score]);

  const [feedback, setFeedback] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Memoize date formatting functions
  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }, []);

  const formatTime = useCallback((dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }, []);

  const handleFeedback = useCallback(async (type) => {
    // If already selected, allow toggling off
    if (feedback === type) {
      setFeedback(null);
      onFeedback(null, match.id);
      return;
    }

    // Set the new feedback type
    setFeedback(type);
    setFeedbackSent(true);

    // Send feedback to backend
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
        } else {
          console.log('Feedback sent successfully:', data);
        }
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
    }

    if (onFeedback) {
      onFeedback(type, match.id);
    }
  }, [feedback, match.id, onFeedback, recommendation, score_breakdown, displayScore, explanation]);

  // Memoize sport mappings to prevent recreation
  const sportIdMapping = useMemo(() => ({
    1: 'football',
    2: 'rugby',
    3: 'basketball',
    4: 'futsal',
    5: 'volley',
    6: 'frisbee',
    7: 'hockey',
    8: 'badminton'
  }), []);

  const sportNameMapping = useMemo(() => ({
    1: 'Football',
    2: 'Rugby',
    3: 'Basketball',
    4: 'Futsal',
    5: 'Volleyball',
    6: 'Frisbee',
    7: 'Hockey',
    8: 'Badminton'
  }), []);

  const getSportIcon = useCallback((sportId) => {
    const sportName = sportIdMapping[sportId] || 'football';
    return sportIcons[sportName] || <SportsSoccer />;
  }, [sportIdMapping]);

  const getSportName = useCallback((sportId) => {
    return sportNameMapping[sportId] || 'Unknown';
  }, [sportNameMapping]);

  // Extract preference factors from explanation or from match_score components
  const extractPreferenceFactors = () => {
    const preferenceFactors = [];

    // For the enhanced weighted cosine similarity system (academic demonstration)
    if (source === 'enhanced-weighted-cosine-similarity' && mathematical_breakdown) {
      preferenceFactors.push({
        icon: <SportsScore color="primary" />,
        label: 'Enhanced Vector Similarity',
        description: `${similarity_percentage}% enhanced weighted cosine similarity targeting 90-100% accuracy`,
        score: similarity_score || 0,
        weight: '100%',
        system: 'Enhanced Weighted Cosine Similarity v3',
        systemColor: '#1976d2',
        mathematical: {
          formula: 'enhanced_weighted_cosine_similarity with attribute-specific weights',
          userVectorDims: mathematical_breakdown.user_vector_dimensions,
          matchVectorDims: mathematical_breakdown.match_vector_dimensions,
          enhancedWeightedSimilarity: mathematical_breakdown.enhanced_weighted_cosine_similarity,
          calculationMethod: mathematical_breakdown.calculation_method,
          optimizationLevel: mathematical_breakdown.optimization_level,
          attributeContributions: mathematical_breakdown.attribute_contributions,
          perfectMatchIndicators: mathematical_breakdown.perfect_match_indicators
        }
      });

      return preferenceFactors;
    }

    // For the simple explainable recommendation system
    if (algorithm_breakdown && algorithm_breakdown.algorithm_type === 'Simple Explainable Scoring') {
      const components = algorithm_breakdown.components || {};

      // Sport Match Component (50%)
      if (components.sport_match) {
        preferenceFactors.push({
          icon: <Sports color="primary" />,
          label: 'Sport Match',
          description: components.sport_match.reason,
          score: components.sport_match.score,
          maxScore: components.sport_match.max_possible,
          weight: components.sport_match.weight,
          system: 'Direct Sport Matching',
          systemColor: '#1976d2'
        });
      }

      // Skill Level Component (20%)
      if (components.skill_level) {
        preferenceFactors.push({
          icon: <TrendingUp color="success" />,
          label: 'Skill Level',
          description: components.skill_level.reason,
          score: components.skill_level.score,
          maxScore: components.skill_level.max_possible,
          weight: components.skill_level.weight,
          system: 'Skill Compatibility',
          systemColor: '#4caf50'
        });
      }

      // Faculty Match Component (15%)
      if (components.faculty_match) {
        preferenceFactors.push({
          icon: <School color="info" />,
          label: 'Faculty Match',
          description: components.faculty_match.reason,
          score: components.faculty_match.score,
          maxScore: components.faculty_match.max_possible,
          weight: components.faculty_match.weight,
          system: 'Social Compatibility',
          systemColor: '#2196f3'
        });
      }

      // Schedule Match Component (10%)
      if (components.schedule_match) {
        preferenceFactors.push({
          icon: <Schedule color="warning" />,
          label: 'Schedule Match',
          description: components.schedule_match.reason,
          score: components.schedule_match.score,
          maxScore: components.schedule_match.max_possible,
          weight: components.schedule_match.weight,
          system: 'Time Compatibility',
          systemColor: '#ff9800'
        });
      }

      // Location Preference Component (5%)
      if (components.location_preference) {
        preferenceFactors.push({
          icon: <LocationOn color="secondary" />,
          label: 'Location Preference',
          description: components.location_preference.reason,
          score: components.location_preference.score,
          maxScore: components.location_preference.max_possible,
          weight: components.location_preference.weight,
          system: 'Location Preference',
          systemColor: '#9c27b0'
        });
      }
    }
    // For the simplified vector-based recommendation system (academic demonstration)
    else if (source === 'simplified-vector-similarity' && mathematical_breakdown) {
      preferenceFactors.push({
        icon: <SportsScore color="primary" />,
        label: 'Vector Similarity',
        description: `${similarity_percentage}% cosine similarity between your preferences and this match`,
        score: similarity_score || 0,
        weight: '100%',
        system: 'Pure Vector Similarity',
        systemColor: '#1976d2',
        mathematical: {
          formula: 'cosine_similarity = (A·B) / (||A|| × ||B||)',
          userVectorDims: mathematical_breakdown.user_vector_dimensions,
          matchVectorDims: mathematical_breakdown.match_vector_dimensions,
          cosineSimilarity: mathematical_breakdown.cosine_similarity,
          calculationMethod: mathematical_breakdown.calculation_method
        }
      });

      return preferenceFactors;
    }

    // For the new complete combined recommendation system (100% coverage)
    if (score_breakdown && (direct_preference || collaborative_filtering || activity_based)) {
      // Direct Preference System (35% total weight)
      if (direct_preference) {
        preferenceFactors.push({
          icon: <SportsSoccer color="primary" />,
          label: 'Direct Preferences',
          description: 'Based on your sport, venue, and schedule preferences',
          score: direct_preference.score || 0,
          weight: '35%',
          system: 'Direct Matching',
          systemColor: '#1976d2'
        });
      }

      // Collaborative Filtering System (45% total weight)
      if (collaborative_filtering) {
        preferenceFactors.push({
          icon: <Group color="secondary" />,
          label: 'Community Similarity',
          description: 'Based on users with similar preferences to you',
          score: collaborative_filtering.score || 0,
          weight: '45%',
          system: 'Collaborative Filtering',
          systemColor: '#9c27b0'
        });
      }

      // Activity-Based System (20% total weight)
      if (activity_based) {
        preferenceFactors.push({
          icon: <TrendingUp color="info" />,
          label: 'Activity Patterns',
          description: 'Based on match popularity and your activity history',
          score: activity_based.score || 0,
          weight: '20%',
          system: 'Activity Analysis',
          systemColor: '#0288d1'
        });
      }

      return preferenceFactors;
    }

    // For the legacy direct preference matching system with breakdown
    if (breakdown) {
      // Sports matching factor (35% of total - simplified legacy display)
      preferenceFactors.push({
        icon: <SportsSoccer color="primary" />,
        label: 'Sports Matching',
        description: 'Match based on your favorite sports and skill level',
        score: breakdown.sports_score || 0,
        weight: '35%'
      });

      // Venue matching factor (25% of total)
      preferenceFactors.push({
        icon: <LocationOn color="primary" />,
        label: 'Venue Matching',
        description: 'Match based on your preferred facilities',
        score: breakdown.venue_score || 0,
        weight: '25%'
      });

      // Schedule matching factor (25% of total)
      preferenceFactors.push({
        icon: <CalendarMonth color="primary" />,
        label: 'Schedule Matching',
        description: 'Match based on your availability',
        score: breakdown.schedule_score || 0,
        weight: '25%'
      });

      // Other preferences factor (15% of total)
      preferenceFactors.push({
        icon: <EmojiPeople color="primary" />,
        label: 'Other Preferences',
        description: 'Play style, age, and duration compatibility',
        score: breakdown.other_score || 0,
        weight: '15%'
      });

      return preferenceFactors;
    }

    // For the legacy lightweight recommendation system
    if (match_score !== undefined) {
      // Always add sport preference factor for lightweight recommendations
      preferenceFactors.push({
        icon: <SportsSoccer color="primary" />,
        label: 'Sport Preference',
        description: 'Match based on your favorite sports',
        score: recommendation.sport_match_score || 0.5,
      });

      // Add venue preference factor
      preferenceFactors.push({
        icon: <LocationOn color="primary" />,
        label: 'Venue Preference',
        description: 'Match based on your preferred venues',
        score: recommendation.venue_match_score || 0.3,
      });

      // Add schedule preference factor
      preferenceFactors.push({
        icon: <CalendarMonth color="primary" />,
        label: 'Schedule Match',
        description: 'Match based on your availability',
        score: recommendation.schedule_match_score || 0.5,
      });

      // Add other preferences factor
      preferenceFactors.push({
        icon: <EmojiPeople color="primary" />,
        label: 'Other Preferences',
        description: 'Match based on group size and skill level',
        score: recommendation.other_prefs_match_score || 0.5,
      });

      return preferenceFactors;
    }
    
    // Legacy recommendation system
    if (!explanation) return null;
    
    // Check for sport preference match
    if (explanation.toLowerCase().includes('sport preference')) {
      preferenceFactors.push({
        icon: <SportsScore color="primary" />,
        label: 'Sport Preference',
        description: 'One of your preferred sports',
        score: sport_preference_match || (preference_scores?.sport_match || 0),
      });
    }
    
    // Check for skill level match
    if (preference_scores?.skill_match > 0.5) {
      preferenceFactors.push({
        icon: <SportsScore color="primary" />,
        label: 'Skill Level',
        description: 'Matches your skill level',
        score: preference_scores.skill_match,
      });
    }

    // Check for availability factors
    if (explanation.toLowerCase().includes('availability') || preference_scores?.days_match > 0.5) {
      preferenceFactors.push({
        icon: <CalendarMonth color="primary" />,
        label: 'Schedule Match',
        description: 'Matches your available days/times',
        score: preference_scores?.days_match || 0.8,
      });
    }
    
    // Check for location factors
    if (explanation.toLowerCase().includes('location') || explanation.toLowerCase().includes('facility') || preference_scores?.location_match > 0.5) {
      preferenceFactors.push({
        icon: <LocationOn color="primary" />,
        label: 'Location',
        description: 'Near your preferred location',
        score: preference_scores?.location_match || 0.8,
      });
    }
    
    // Check for faculty factors
    if (explanation.toLowerCase().includes('faculty') || preference_scores?.faculty_match > 0.5) {
      preferenceFactors.push({
        icon: <School color="primary" />,
        label: 'Faculty',
        description: 'Relevant to your faculty/campus',
        score: preference_scores?.faculty_match || 0.8,
      });
    }
    
    // Check for play style factors
    if (explanation.toLowerCase().includes('play style') || preference_scores?.style_match > 0.5) {
      preferenceFactors.push({
        icon: <EmojiPeople color="primary" />,
        label: 'Play Style',
        description: 'Matches your preferred play style',
        score: preference_scores?.style_match || 0.8,
      });
    }
    
    return preferenceFactors.length > 0 ? preferenceFactors : null;
  };
  
  const preferenceFactors = extractPreferenceFactors();

  // Format score as percentage
  const formatScore = (scoreValue) => {
    if (scoreValue === undefined || scoreValue === null) {
      return '0%';
    }
    if (typeof scoreValue === 'number') {
      return `${Math.round(scoreValue * 100)}%`;
    }
    if (typeof scoreValue === 'string' && scoreValue.endsWith('%')) {
      return scoreValue;
    }
    return `${scoreValue}%`;
  };

  if (!match) return null;

  return (
    <Card elevation={1} sx={{ 
      borderRadius: 2,
      position: 'relative',
      overflow: 'visible',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: (theme) => theme.shadows[3],
      },
      border: (theme) => 
        feedback === 'liked' 
          ? `1px solid ${theme.palette.success.main}` 
          : feedback === 'disliked' 
            ? `1px solid ${theme.palette.error.main}`
            : 'none'
    }}>
      {/* Match recommendation score indicator */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: -10, 
          right: 16,
          backgroundColor: displayScore >= 0.7 ? '#388e3c' : displayScore >= 0.4 ? '#8A1538' : '#f57c00',
          color: 'white',
          borderRadius: '12px',
          px: 1.5,
          py: 0.5,
          fontWeight: 'bold',
          fontSize: '0.75rem',
          zIndex: 1
        }}
      >
        {formatScore(displayScore)} Match
      </Box>

      <CardContent sx={{ pt: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {match.sport ? 
            (match.sport.icon ? match.sport.icon : getSportIcon(match.sport_id)) : 
            getSportIcon(match.sport_id)
          }
          <Typography variant="h6" component="div">
            {match.title || (match.sport ? match.sport.name : getSportName(match.sport_id))}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip 
            label={`${formatDate(match.start_time)} · ${formatTime(match.start_time)}`} 
            size="small" 
            color="primary" 
            variant="outlined" 
            icon={<AccessTime fontSize="small" />}
          />
          
          {match.location && (
            <Chip 
              label={match.location.name} 
              size="small"
              variant="outlined"
              icon={<LocationOn fontSize="small" />}
            />
          )}
          
          {match.participants && (
          <Chip 
              label={`${match.participants.count || 0}/${match.max_participants || '∞'} players`} 
            size="small" 
            variant="outlined" 
              icon={<EmojiPeople fontSize="small" />}
            />
          )}
          
          {/* Enhanced recommendation indicator */}
          {recommendationType === 'enhanced-content-based' && (
            <Tooltip title="Enhanced recommendation based on your preferences">
              <Chip 
                label="Enhanced" 
                size="small"
                color="success"
                icon={<CheckCircle fontSize="small" />}
              />
            </Tooltip>
          )}
        </Box>

        {/* Explanation */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {explanation || "Recommended based on your preferences"}
        </Typography>
        
        {/* Preference factors */}
        {preferenceFactors && preferenceFactors.length > 0 && (
          <Collapse in={expanded}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Match Factors
            </Typography>
            <List dense disablePadding>
              {preferenceFactors.map((factor, index) => (
                <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {factor.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {factor.label}
                        </Typography>
                        {factor.weight && (
                          <Chip
                            label={factor.weight}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                        {factor.system && (
                          <Chip
                            label={factor.system}
                            size="small"
                            color={factor.systemColor || 'default'}
                            variant="filled"
                            sx={{
                              height: 18,
                              fontSize: '0.6rem',
                              fontWeight: 'bold',
                              opacity: 0.8
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {factor.description}
                        </Typography>
                        {/* Mathematical breakdown for simplified vector system */}
                        {factor.mathematical && (
                          <Box sx={{
                            mt: 1,
                            p: 1,
                            backgroundColor: 'primary.light',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'primary.main',
                            opacity: 0.9
                          }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.dark', display: 'block', mb: 0.5 }}>
                              📊 Mathematical Calculation:
                            </Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mb: 0.5, color: 'primary.dark' }}>
                              {factor.mathematical.formula}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              • User vector: {factor.mathematical.userVectorDims} dimensions<br/>
                              • Match vector: {factor.mathematical.matchVectorDims} dimensions<br/>
                              • Cosine similarity: {factor.mathematical.cosineSimilarity?.toFixed(4)}<br/>
                              • Result: {Math.round(factor.mathematical.cosineSimilarity * 100)}% similarity
                            </Typography>
                          </Box>
                        )}
                        {/* Score breakdown for simple explainable system */}
                        {factor.score !== undefined && factor.maxScore && (
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Score: {factor.score}/{factor.maxScore}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({Math.round((factor.score / factor.maxScore) * 100)}%)
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={(factor.score / factor.maxScore) * 100}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: factor.systemColor || 'primary.main'
                                }
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  {factor.score !== undefined && (
                    <Box sx={{ width: 60, ml: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={factor.score * 100}
            sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: factor.score > 0.7 ? '#4caf50' :
                                            factor.score > 0.4 ? '#ff9800' : '#f44336'
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                        {Math.round(factor.score * 100)}%
          </Typography>
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          </Collapse>
        )}
        
        {/* Vector similarity metrics in dev mode */}
        {import.meta.env.DEV && vector_similarity && (
          <Collapse in={expanded}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" gutterBottom>
              Technical Details
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip 
                label={`Vector Similarity: ${Math.round(vector_similarity * 100)}%`} 
                size="small" 
                variant="outlined"
              />
              {sport_preference_match !== undefined && (
                <Chip
                  label={`Sport Match: ${Math.round(sport_preference_match * 100)}%`} 
                  size="small"
                  variant="outlined"
                />
              )}
          </Box>
          </Collapse>
        )}

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            component={Link} 
            to={`/match/${match.id}`} 
            size="small" 
            variant="contained"
            sx={{ borderRadius: 4 }}
          >
            View Details
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Feedback buttons */}
            <ButtonGroup size="small" sx={{ mr: 1 }}>
              <Tooltip title="This recommendation is helpful">
                <IconButton 
                  onClick={() => handleFeedback('liked')} 
                  color={feedback === 'liked' ? 'success' : 'default'}
                  size="small"
                >
                  {feedback === 'liked' ? <ThumbUp fontSize="small" /> : <ThumbUpOutlined fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="This recommendation is not relevant">
              <IconButton 
                  onClick={() => handleFeedback('disliked')} 
                  color={feedback === 'disliked' ? 'error' : 'default'}
                size="small" 
              >
                  {feedback === 'disliked' ? <ThumbDown fontSize="small" /> : <ThumbDownOutlined fontSize="small" />}
              </IconButton>
            </Tooltip>
            </ButtonGroup>
            
            {/* Expand/collapse button */}
            {preferenceFactors && preferenceFactors.length > 0 && (
              <IconButton 
                size="small" 
                onClick={() => setExpanded(!expanded)}
                sx={{ ml: 0.5 }}
              >
                {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

});

export default RecommendationCard;
