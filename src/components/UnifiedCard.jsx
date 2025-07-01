import React from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia,
  Box, 
  Typography, 
  Chip,
  IconButton,
  Skeleton
} from '@mui/material';
import { styled } from '@mui/material/styles';

/**
 * Unified Card Component - Base component for all cards in SportEA
 * Provides consistent styling, hover effects, and flexible content areas
 */

// Styled Card with unified design system
const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'isClickable'
})(({ theme, isClickable, variant }) => ({
  borderRadius: 12,
  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  overflow: 'hidden',
  position: 'relative',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: isClickable ? 'pointer' : 'default',
  
  // Variant-specific styling
  ...(variant === 'elevated' && {
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
  }),
  
  ...(variant === 'outlined' && {
    border: `1.5px solid ${theme.palette.primary.lighter}`,
    boxShadow: 'none',
  }),
  
  // Hover effects for clickable cards
  ...(isClickable && {
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0px 8px 24px rgba(138, 21, 56, 0.15)',
      borderColor: theme.palette.primary.light,

      '& .card-image': {
        transform: 'scale(1.05)',
      },

      '& .card-content': {
        '& .primary-text': {
          color: theme.palette.primary.main,
        }
      }
    },

    '&:active': {
      transform: 'translateY(-2px)',
      boxShadow: '0px 4px 16px rgba(138, 21, 56, 0.12)',
    }
  }),
  
  // Focus styles for accessibility
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  }
}));

// Styled Card Media with consistent aspect ratios
const StyledCardMedia = styled(CardMedia)(({ theme }) => ({
  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backgroundColor: theme.palette.background.light,
  position: 'relative',
  
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.1) 100%)',
    pointerEvents: 'none',
  }
}));

// Status indicator component
const StatusIndicator = styled(Box)(({ theme, status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'live': return theme.palette.error.main;
      case 'upcoming': return theme.palette.success.main;
      case 'full': return theme.palette.warning.main;
      case 'recommended': return theme.palette.primary.main;
      default: return theme.palette.text.secondary;
    }
  };
  
  return {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: getStatusColor(),
    color: 'white',
    borderRadius: 16,
    padding: '4px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    zIndex: 2,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
  };
});

const UnifiedCard = ({
  // Content props
  image,
  imageAlt = '',
  imageHeight = 160,
  title,
  subtitle,
  description,
  children,
  
  // Status and indicators
  status,
  statusText,
  score,
  
  // Interaction props
  onClick,
  href,
  clickable = true,
  
  // Styling props
  variant = 'default', // 'default', 'elevated', 'outlined'
  maxWidth,
  height,
  
  // Layout props
  imagePosition = 'top', // 'top', 'left', 'right', 'none'
  contentPadding = 2,
  
  // Accessibility props
  ariaLabel,
  role = 'article',
  
  ...props
}) => {
  const handleClick = (event) => {
    if (onClick) {
      onClick(event);
    } else if (href) {
      window.location.href = href;
    }
  };
  
  const handleKeyDown = (event) => {
    if (clickable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleClick(event);
    }
  };
  
  const isClickable = clickable && (onClick || href);
  
  // Image component with placeholder support
  const ImageComponent = () => {
    if (imagePosition === 'none') return null;
    
    return (
      <Box sx={{ 
        position: 'relative',
        ...(imagePosition === 'top' && { width: '100%' }),
        ...(imagePosition === 'left' && { width: 120, flexShrink: 0 }),
        ...(imagePosition === 'right' && { width: 120, flexShrink: 0 }),
      }}>
        {image ? (
          <StyledCardMedia
            className="card-image"
            component="img"
            height={imageHeight}
            image={image}
            alt={imageAlt}
            sx={{
              objectFit: 'cover',
              width: '100%',
            }}
          />
        ) : (
          <Box
            sx={{
              height: imageHeight,
              backgroundColor: 'background.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption">
              Venue Image
            </Typography>
          </Box>
        )}
        
        {/* Status indicator overlay */}
        {status && (
          <StatusIndicator status={status}>
            {statusText || status}
          </StatusIndicator>
        )}
        
        {/* Score indicator for recommendations */}
        {score !== undefined && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              color: 'primary.main',
              borderRadius: 12,
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              zIndex: 2,
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            {typeof score === 'number' ? `${Math.round(score * 100)}%` : score}
          </Box>
        )}
      </Box>
    );
  };
  
  return (
    <StyledCard
      isClickable={isClickable}
      variant={variant}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      tabIndex={isClickable ? 0 : -1}
      role={role}
      aria-label={ariaLabel}
      sx={{
        maxWidth,
        height,
        ...(imagePosition === 'left' || imagePosition === 'right' ? {
          display: 'flex',
          flexDirection: imagePosition === 'right' ? 'row-reverse' : 'row',
        } : {}),
      }}
      {...props}
    >
      <ImageComponent />
      
      <CardContent 
        className="card-content"
        sx={{ 
          p: contentPadding,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          '&:last-child': { pb: contentPadding }
        }}
      >
        {/* Title and subtitle */}
        {title && (
          <Typography 
            variant="h6" 
            component="h3"
            className="primary-text"
            sx={{ 
              fontWeight: 600,
              mb: subtitle ? 0.5 : 1,
              transition: 'color 0.3s ease',
            }}
          >
            {title}
          </Typography>
        )}
        
        {subtitle && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            {subtitle}
          </Typography>
        )}
        
        {/* Description */}
        {description && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              mb: 2,
              flex: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </Typography>
        )}
        
        {/* Custom content */}
        {children}
      </CardContent>
    </StyledCard>
  );
};

export default UnifiedCard;
