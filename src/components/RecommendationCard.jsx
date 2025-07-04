import { useState, useEffect } from 'react';
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
  CheckCircle
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
const RecommendationCard = ({ 
  recommendation,
  isFallback = false,
  metrics = null,
  recommendationType = 'standard',
  onFeedback = () => {}
}) => {
  // Extract data from recommendation object
  const { match, score, explanation, vector_similarity, sport_preference_match, preference_scores, match_score } = recommendation || {};
  
  // Use match_score from lightweight recommendations if available, otherwise use the legacy score
  const displayScore = match_score !== undefined ? match_score : score;
  
  const [feedback, setFeedback] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Format date and time
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleFeedback = (type) => {
    // If already selected, allow toggling off
    if (feedback === type) {
      setFeedback(null);
      onFeedback(null, match.id);
      return;
    }
    
    // Set the new feedback type
    setFeedback(type);
    setFeedbackSent(true);
    
    if (onFeedback) {
      onFeedback(type, match.id);
    }
  };

  const getSportIcon = (sportId) => {
    // Convert sport_id to sport name (assuming you have this mapping)
    // This is a placeholder implementation
    const sportMapping = {
      1: 'football',
      2: 'rugby',
      3: 'basketball',
      4: 'futsal',
      5: 'volley',
      6: 'frisbee',
      7: 'hockey',
      8: 'badminton'
    };
    const sportName = sportMapping[sportId] || 'football';
    return sportIcons[sportName] || <SportsSoccer />;
  };

  const getSportName = (sportId) => {
    const sportMapping = {
      1: 'Football',
      2: 'Rugby',
      3: 'Basketball',
      4: 'Futsal',
      5: 'Volleyball',
      6: 'Frisbee',
      7: 'Hockey',
      8: 'Badminton'
    };
    return sportMapping[sportId] || 'Unknown';
  };

  // Extract preference factors from explanation or from match_score components
  const extractPreferenceFactors = () => {
    const preferenceFactors = [];
    
    // For the new lightweight recommendation system
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
                    primary={factor.label} 
                    secondary={factor.description}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
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

export default RecommendationCard;
