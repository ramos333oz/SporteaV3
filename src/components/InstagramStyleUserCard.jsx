import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import { UserPlus, X, MapPin, GraduationCap, Trophy } from 'lucide-react';

/**
 * Instagram-style compact user recommendation card
 * Designed for horizontal scrolling with maximum visual impact in minimal space
 */
const InstagramStyleUserCard = ({ 
  user, 
  onConnect, 
  onDismiss, 
  isConnecting = false,
  className = ""
}) => {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || !user) {
    return null;
  }

  const handleConnect = async () => {
    try {
      await onConnect?.(user.id);
    } catch (error) {
      console.error('Error connecting to user:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.(user.id);
  };

  const handleViewProfile = () => {
    navigate(`/profile/${user.id}`);
  };

  // Extract user information
  const {
    full_name,
    username,
    avatar_url,
    faculty,
    campus,
    sport_preferences = [],
    knn_user_similarity_score,
    level = 1
  } = user;

  const similarityPercentage = Math.round((knn_user_similarity_score || 0) * 100);
  const displayName = full_name || username || 'Unknown User';
  const topSports = sport_preferences.slice(0, 2);

  return (
    <Card
      sx={{
        width: 240,
        height: 320,
        flexShrink: 0,
        background: 'linear-gradient(135deg, #fef2f2 0%, #fef3c7 100%)',
        border: '1px solid #fecaca',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          transform: 'scale(1.02)'
        },

      }}
      className={className}
    >
      <CardContent sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Dismiss Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{
              width: 20,
              height: 20,
              color: '#9ca3af',
              '&:hover': {
                color: '#dc2626',
                backgroundColor: '#fef2f2'
              }
            }}
          >
            <X size={10} />
          </IconButton>
        </Box>

        {/* User Avatar and Basic Info */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ position: 'relative', mb: 1 }}>
            <Avatar
              src={avatar_url}
              onClick={handleViewProfile}
              sx={{
                width: 70,
                height: 70,
                border: '2px solid #fecaca',
                cursor: 'pointer',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                '&:hover': {
                  borderColor: '#fca5a5'
                }
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </Avatar>

            {/* Level Badge */}
            {level > 1 && (
              <Chip
                label={level}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 20,
                  height: 20,
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  '& .MuiChip-label': { px: 0 }
                }}
              />
            )}
          </Box>

          <Typography
            variant="subtitle2"
            onClick={handleViewProfile}
            sx={{
              fontWeight: 600,
              color: '#111827',
              textAlign: 'center',
              fontSize: '0.8rem',
              lineHeight: 1.1,
              mb: 0.3,
              cursor: 'pointer',
              '&:hover': { color: '#dc2626' }
            }}
          >
            {displayName}
          </Typography>

          {username && full_name && (
            <Typography variant="caption" sx={{ color: '#6b7280', mb: 0.5, fontSize: '0.7rem' }}>
              @{username}
            </Typography>
          )}

          {/* Similarity Score */}
          {similarityPercentage > 0 && (
            <Chip
              label={`${similarityPercentage}% match`}
              variant="outlined"
              size="small"
              sx={{
                fontSize: '0.7rem',
                height: '20px',
                borderColor: '#fecaca',
                color: '#b91c1c',
                backgroundColor: '#fef2f2'
              }}
            />
          )}
        </Box>

        {/* User Details */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5, fontSize: '0.7rem' }}>
          {/* Faculty/Campus */}
          {faculty && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#6b7280' }}>
              <GraduationCap size={10} style={{ color: '#dc2626' }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {faculty}
              </Typography>
            </Box>
          )}

          {campus && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#6b7280' }}>
              <MapPin size={10} style={{ color: '#dc2626' }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {campus}
              </Typography>
            </Box>
          )}

          {/* Sports Preferences */}
          {topSports.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#6b7280' }}>
              <Trophy size={10} style={{ color: '#dc2626' }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {topSports.map(sport => sport.name || sport).join(', ')}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            variant="contained"
            size="small"
            startIcon={<UserPlus size={12} />}
            sx={{
              flex: 1,
              backgroundColor: '#dc2626',
              color: 'white',
              fontSize: '0.7rem',
              py: 0.5,
              minHeight: '28px',

              textTransform: 'none',
              '&:hover': { backgroundColor: '#b91c1c' },
              '&:disabled': { backgroundColor: '#9ca3af' }
            }}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>

          <Button
            onClick={handleViewProfile}
            variant="outlined"
            size="small"
            sx={{
              flex: 1,
              borderColor: '#fecaca',
              color: '#b91c1c',
              fontSize: '0.7rem',
              py: 0.5,
              minHeight: '28px',

              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#fef2f2',
                borderColor: '#fca5a5'
              }
            }}
          >
            View Profile
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default InstagramStyleUserCard;
