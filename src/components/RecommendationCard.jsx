import { useState } from 'react';
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
  Collapse
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
  SportsHockey
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
const RecommendationCard = ({ match, score, explanation, onFeedback, isMockData = false }) => {
  const [feedback, setFeedback] = useState(null);
  const [expanded, setExpanded] = useState(false);

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
    setFeedback(type);
    if (onFeedback) {
      onFeedback(type);
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

  return (
    <Card elevation={1} sx={{ 
      borderRadius: 2,
      position: 'relative',
      overflow: 'visible',
      transition: 'transform 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
      },
      // Apply a subtle background color for mock data
      ...(isMockData && {
        backgroundColor: 'rgba(245, 245, 245, 0.7)',
        border: '1px dashed rgba(0, 0, 0, 0.12)'
      })
    }}>
      {/* Match recommendation score indicator */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: -10, 
          right: 16,
          backgroundColor: isMockData ? '#9e9e9e' : '#8A1538',
          color: 'white',
          borderRadius: '12px',
          px: 1.5,
          py: 0.5,
          fontWeight: 'bold',
          fontSize: '0.75rem',
          zIndex: 1
        }}
      >
        {isMockData ? 'Sample' : `${score}% Match`}
      </Box>

      <CardContent sx={{ pt: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {getSportIcon(match.sport_id)}
          <Typography variant="h6" component="div">
            {match.title || getSportName(match.sport_id)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip 
            label={`${formatDate(match.start_time)} · ${formatTime(match.start_time)}`} 
            size="small" 
            color="primary" 
            variant="outlined" 
          />
          <Chip 
            label={match.skill_level} 
            size="small" 
            color="secondary" 
            variant="outlined" 
          />
        </Box>

        {explanation && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontStyle: 'italic', 
              mb: 1.5,
              ...(isMockData && {
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              })
            }}
          >
            {isMockData && (
              <Chip 
                label="Demo" 
                size="small" 
                color="default" 
                sx={{ height: 16, fontSize: '0.6rem' }}
              />
            )}
            {explanation}
          </Typography>
        )}

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            component={Link}
            to={isMockData ? '#' : `/match/${match.id}`}
            variant="contained"
            size="small"
            disabled={isMockData}
            sx={{
              backgroundColor: isMockData ? '#9e9e9e' : '#8A1538',
              '&:hover': {
                backgroundColor: isMockData ? '#9e9e9e' : '#6A1028',
              }
            }}
          >
            {isMockData ? 'Sample Match' : 'View Match'}
          </Button>

          <Box>
            <Tooltip title="This recommendation is helpful">
              <IconButton 
                size="small" 
                onClick={() => handleFeedback('liked')}
                color={feedback === 'liked' ? 'primary' : 'default'}
                disabled={isMockData}
                sx={isMockData ? { color: 'rgba(0, 0, 0, 0.26)' } : {}}
              >
                {feedback === 'liked' ? <ThumbUp /> : <ThumbUpOutlined />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="This recommendation is not relevant">
              <IconButton 
                size="small" 
                onClick={() => handleFeedback('disliked')}
                color={feedback === 'disliked' ? 'error' : 'default'}
                disabled={isMockData}
                sx={isMockData ? { color: 'rgba(0, 0, 0, 0.26)' } : {}}
              >
                {feedback === 'disliked' ? <ThumbDown /> : <ThumbDownOutlined />}
              </IconButton>
            </Tooltip>

            <Tooltip title={expanded ? "Show less" : "Show more details"}>
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2, pt: 1, borderTop: '1px dashed rgba(0,0,0,0.12)' }}>
            {match.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {match.description}
              </Typography>
            )}
            
            <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
              Location: {match.location_id || 'Not specified'}
            </Typography>
            
            {match.price_per_person > 0 && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Price: RM{match.price_per_person.toFixed(2)} per person
              </Typography>
            )}
            
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Skill level: {match.skill_level}
            </Typography>
            
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Max participants: {match.max_participants}
            </Typography>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default RecommendationCard;
