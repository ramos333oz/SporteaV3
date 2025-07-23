import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Avatar,
  Stack,
  Collapse,
  Divider,
  Card,
  CardContent,
  CardMedia,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  PersonAdd,
  Close,
  LocationOn,
  School,
  AccessTime,
  EmojiEvents,
  ChevronLeft,
  ChevronRight,
  Favorite,
  Message,
  ExpandMore,
  ExpandLess,
  Sports,
  SportsSoccer,
  Group,
  Star
} from '@mui/icons-material';


/**
 * User Recommendation Card - Consistent with Home page recommendation cards
 *
 * Uses the same UnifiedCard system and Material-UI components as EnhancedRecommendationCard
 * for consistent styling and behavior across the application
 */

const UserRecommendationCard = ({
  user,
  onConnect,
  onDismiss,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!user) return null;

  // Extract user information
  const {
    id,
    full_name,
    username,
    avatar_url,
    faculty,
    campus,
    sport_preferences = [],
    knn_user_similarity_score,
    similarity_explanation,
    available_hours,
    play_style
  } = user;

  const similarityPercentage = Math.round((knn_user_similarity_score || 0) * 100);

  // Get common sports
  const getCommonSports = () => {
    if (!sport_preferences || !Array.isArray(sport_preferences)) return [];
    return sport_preferences.slice(0, 3).map(sport => sport.name || sport);
  };

  const commonSports = getCommonSports();

  // Get availability summary
  const getAvailabilitySummary = () => {
    if (!available_hours || typeof available_hours !== 'object') return 'Not specified';

    const days = Object.keys(available_hours).length;
    if (days === 0) return 'Not specified';
    if (days <= 2) return `${days} day${days > 1 ? 's' : ''} available`;
    if (days <= 4) return `${days} days available`;
    return 'Very flexible schedule';
  };

  return (
    <Card
      sx={{
        maxWidth: 320,
        mx: 'auto',
        position: 'relative',
        borderRadius: 4,
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(139, 0, 0, 0.1)',
        overflow: 'hidden'
      }}
    >
      {/* Navigation arrows */}
      {canGoPrevious && (
        <IconButton
          onClick={onPrevious}
          sx={{
            position: 'absolute',
            left: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': { bgcolor: 'background.paper', boxShadow: 4 }
          }}
        >
          <ChevronLeft />
        </IconButton>
      )}

      {canGoNext && (
        <IconButton
          onClick={onNext}
          sx={{
            position: 'absolute',
            right: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': { bgcolor: 'background.paper', boxShadow: 4 }
          }}
        >
          <ChevronRight />
        </IconButton>
      )}

      <CardContent sx={{ p: 0 }}>
        {/* Header with similarity and close button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            pb: 1,
            backgroundColor: 'rgba(139, 0, 0, 0.02)'
          }}
        >
        <Chip
          label={`${similarityPercentage}% match`}
          size="small"
          sx={{
            backgroundColor: 'rgba(139, 0, 0, 0.1)',
            color: 'rgba(139, 0, 0, 0.9)',
            fontWeight: 600,
            fontSize: '0.75rem'
          }}
        />
        <IconButton
          onClick={onDismiss}
          size="small"
          sx={{
            color: 'rgba(139, 0, 0, 0.6)',
            '&:hover': {
              backgroundColor: 'rgba(139, 0, 0, 0.1)',
              color: 'rgba(139, 0, 0, 0.8)'
            }
          }}
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Profile Section */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          pt: 1
        }}
      >
        <Avatar
          src={avatar_url}
          sx={{
            width: 60,
            height: 60,
            mr: 2,
            bgcolor: 'rgba(139, 0, 0, 0.1)',
            color: '#8B0000',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}
        >
          {!avatar_url && ((username || full_name)?.charAt(0)?.toUpperCase() || '?')}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: '#8B0000',
              fontSize: '1.1rem',
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {username || full_name}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {faculty && (
              <Chip
                icon={<School />}
                label={faculty}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  height: 20,
                  borderColor: 'rgba(139, 0, 0, 0.3)',
                  color: 'rgba(139, 0, 0, 0.8)',
                  '& .MuiChip-icon': { fontSize: '0.8rem' }
                }}
              />
            )}
            {campus && (
              <Chip
                icon={<LocationOn />}
                label={campus}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  height: 20,
                  borderColor: 'rgba(139, 0, 0, 0.3)',
                  color: 'rgba(139, 0, 0, 0.8)',
                  '& .MuiChip-icon': { fontSize: '0.8rem' }
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Common Sports Section */}
      {commonSports.length > 0 && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Sports sx={{ fontSize: '1rem', color: 'rgba(139, 0, 0, 0.7)', mr: 0.5 }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: 'rgba(139, 0, 0, 0.8)',
                fontSize: '0.8rem'
              }}
            >
              Common Sports
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {commonSports.slice(0, 3).map((sport, index) => (
              <Chip
                key={index}
                label={sport}
                size="small"
                sx={{
                  fontSize: '0.7rem',
                  height: 20,
                  backgroundColor: 'rgba(139, 0, 0, 0.1)',
                  color: 'rgba(139, 0, 0, 0.8)',
                  fontWeight: 500
                }}
              />
            ))}
            {commonSports.length > 3 && (
              <Chip
                label={`+${commonSports.length - 3} more`}
                size="small"
                sx={{
                  fontSize: '0.7rem',
                  height: 20,
                  backgroundColor: 'rgba(139, 0, 0, 0.05)',
                  color: 'rgba(139, 0, 0, 0.6)',
                  fontWeight: 500
                }}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ p: 2, pt: 0 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={onDismiss}
            variant="outlined"
            startIcon={<Close />}
            size="small"
            sx={{
              flex: 1,
              py: 1,
              borderColor: 'rgba(139, 0, 0, 0.3)',
              color: 'rgba(139, 0, 0, 0.8)',
              fontSize: '0.8rem',
              '&:hover': {
                borderColor: 'rgba(139, 0, 0, 0.5)',
                backgroundColor: 'rgba(139, 0, 0, 0.05)'
              }
            }}
          >
            Pass
          </Button>

          <Button
            onClick={onConnect}
            variant="contained"
            startIcon={<PersonAdd />}
            size="small"
            sx={{
              flex: 1,
              py: 1,
              backgroundColor: '#8B0000',
              fontSize: '0.8rem',
              '&:hover': {
                backgroundColor: '#A52A2A'
              }
            }}
          >
            Connect
          </Button>
        </Box>

        {/* Show More Details Button */}
        <Button
          onClick={() => setShowDetails(!showDetails)}
          startIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
          size="small"
          fullWidth
          sx={{
            mt: 1,
            py: 0.5,
            fontSize: '0.75rem',
            color: 'rgba(139, 0, 0, 0.7)',
            '&:hover': {
              backgroundColor: 'rgba(139, 0, 0, 0.05)'
            }
          }}
        >
          {showDetails ? 'Show Less' : 'Show More Details'}
        </Button>
      </Box>

      {/* Expanded Details */}
      <Collapse in={showDetails}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Box sx={{
            p: 1.5,
            backgroundColor: 'rgba(139, 0, 0, 0.02)',
            borderRadius: 2,
            border: '1px solid rgba(139, 0, 0, 0.1)'
          }}>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(139, 0, 0, 0.8)',
                fontSize: '0.8rem',
                lineHeight: 1.4,
                mb: 1
              }}
            >
              {username || full_name} shares {similarityPercentage}% similarity with your sports preferences and profile.
            </Typography>

            {play_style && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <EmojiEvents sx={{ fontSize: '0.9rem', color: 'rgba(139, 0, 0, 0.6)' }} />
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(139, 0, 0, 0.7)' }}>
                  Prefers <strong>{play_style}</strong> games
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTime sx={{ fontSize: '0.9rem', color: 'rgba(139, 0, 0, 0.6)' }} />
              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'rgba(139, 0, 0, 0.7)' }}>
                {getAvailabilitySummary()}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Collapse>
      </CardContent>
    </Card>
  );
};

export default UserRecommendationCard;
