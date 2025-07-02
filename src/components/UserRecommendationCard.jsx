import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Divider,
  Stack
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  SportsSoccer as SportsIcon,
  School as SchoolIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserAvatarWithLevel } from './achievements';

/**
 * Instagram-style user recommendation card component
 * Displays user profile information, similarity score, and common interests
 */
const UserRecommendationCard = ({ 
  user, 
  onConnect, 
  onDismiss, 
  onViewProfile,
  compact = false 
}) => {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect?.(user.id);
    } catch (error) {
      console.error('Error connecting to user:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.(user.id);
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(user.id);
    } else {
      navigate(`/profile/${user.id}`);
    }
  };

  const getSimilarityColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'info';
  };

  const getSimilarityLabel = (score) => {
    if (score >= 0.8) return 'Excellent Match';
    if (score >= 0.6) return 'Good Match';
    return 'Potential Match';
  };

  const formatReasonCodes = (reasons) => {
    const reasonMap = {
      'similar_preferences': 'Similar Sports',
      'skill_match': 'Skill Level',
      'same_location': 'Same Campus',
      'similar_schedule': 'Similar Schedule',
      'same_play_style': 'Play Style',
      'same_campus': 'Same Campus',
      'general_compatibility': 'Compatible'
    };

    return reasons?.map(reason => reasonMap[reason] || reason) || ['Compatible'];
  };

  const commonSports = user.sport_preferences?.slice(0, 3) || [];

  return (
    <Card
      sx={{
        width: compact ? 280 : 320,
        height: compact ? 320 : 380,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 3,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }
      }}
    >
      {/* Dismiss button */}
      <IconButton
        size="small"
        onClick={handleDismiss}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          bgcolor: 'rgba(255,255,255,0.9)',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,1)',
          }
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* User Avatar and Basic Info */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <UserAvatarWithLevel
            user={user}
            size={compact ? 64 : 80}
            badgeSize={compact ? 'small' : 'medium'}
            onClick={handleViewProfile}
            sx={{
              mb: 1,
              border: '3px solid',
              borderColor: 'primary.light'
            }}
          />
          
          <Typography 
            variant={compact ? "subtitle1" : "h6"} 
            fontWeight="bold" 
            textAlign="center"
            sx={{ cursor: 'pointer' }}
            onClick={handleViewProfile}
          >
            {user.full_name || user.username}
          </Typography>
          
          {user.username && user.full_name && (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              @{user.username}
            </Typography>
          )}
        </Box>

        {/* Similarity Score */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Chip
            icon={<InfoIcon />}
            label={`${Math.round(user.similarity_score * 100)}% ${getSimilarityLabel(user.similarity_score)}`}
            color={getSimilarityColor(user.similarity_score)}
            variant="outlined"
            size="small"
          />
        </Box>

        {/* User Details */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          {user.faculty && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.faculty}
              </Typography>
            </Box>
          )}
          
          {user.campus && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" noWrap>
                {user.campus}
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Common Sports */}
        {commonSports.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <SportsIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Sports
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {commonSports.map((sport, index) => (
                <Chip
                  key={index}
                  label={sport.name || sport}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Similarity Reasons */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Why you might connect:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {formatReasonCodes(user.reason_codes).slice(0, 3).map((reason, index) => (
              <Chip
                key={index}
                label={reason}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </Box>
      </CardContent>

      <Divider />

      {/* Action Buttons */}
      <CardActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleViewProfile}
          sx={{ flex: 1, mr: 1 }}
        >
          View Profile
        </Button>
        
        <Button
          variant="contained"
          size="small"
          startIcon={<PersonAddIcon />}
          onClick={handleConnect}
          disabled={isConnecting}
          sx={{ flex: 1 }}
        >
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default UserRecommendationCard;
