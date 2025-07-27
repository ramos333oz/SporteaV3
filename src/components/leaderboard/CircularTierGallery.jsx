import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import CircularGallery from '../animations/CircularGallery';
import { generateAllTierCards, isWebGLSupported } from '../../utils/tierCardGenerator';

/**
 * CircularTierGallery Component
 * 3D WebGL-powered circular gallery for displaying tier system
 * Integrates with the Elegant Luxury theme and existing TIER_CONFIG
 */
const CircularTierGallery = ({
  tierConfig,
  height = 500,
  bend = 3,
  textColor = 'var(--primary)',
  borderRadius = 0.1,
  scrollSpeed = 2,
  scrollEase = 0.02,
  currentUserTier = null,
  gamificationData = null
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Check WebGL support on mount
  useEffect(() => {
    const supported = isWebGLSupported();
    setWebglSupported(supported);
    
    if (!supported) {
      setError('WebGL is not supported in your browser. Please use a modern browser for the best experience.');
      setLoading(false);
    }
  }, []);

  // State for tier items
  const [tierItems, setTierItems] = useState([]);

  // Generate tier card images
  useEffect(() => {
    if (!tierConfig || !webglSupported) {
      setTierItems([]);
      return;
    }

    const generateCards = async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await generateAllTierCards(tierConfig);
        setTierItems(items);
        setLoading(false);
      } catch (err) {
        console.error('Error generating tier cards:', err);
        setError('Failed to generate tier cards. Please refresh the page.');
        setLoading(false);
        setTierItems([]);
      }
    };

    generateCards();
  }, [tierConfig, webglSupported]);

  // Loading state
  if (loading) {
    return (
      <Box 
        sx={{ 
          height: height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--background) 0%, var(--muted) 100%)',
          borderRadius: 3,
          mb: 4
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress 
            sx={{ 
              color: 'var(--primary)',
              mb: 2 
            }} 
          />
          <Typography variant="body2" color="text.secondary">
            Loading 3D Tier Gallery...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state or WebGL not supported
  if (error || !webglSupported) {
    return (
      <Box sx={{ mb: 4 }}>
        <Alert 
          severity="warning" 
          sx={{ 
            borderRadius: 3,
            backgroundColor: 'var(--muted)',
            color: 'var(--foreground)',
            '& .MuiAlert-icon': {
              color: 'var(--primary)'
            }
          }}
        >
          <Typography variant="body2">
            {error || 'WebGL not supported. Falling back to standard view.'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Main gallery render
  return (
    <Box sx={{ mt: 6, mb: 4 }}>
      {/* Gallery Container */}
      <Box
        sx={{
          height: height,
          position: 'relative',
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--background) 0%, var(--muted) 100%)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
          '&:hover': {
            boxShadow: 'var(--shadow-xl)',
          },
          transition: 'box-shadow 0.3s ease'
        }}
      >
        <CircularGallery
          items={tierItems}
          bend={bend}
          textColor={textColor}
          borderRadius={borderRadius}
          font="bold 24px Libre Baskerville, serif"
          scrollSpeed={scrollSpeed}
          scrollEase={scrollEase}
          currentUserTier={currentUserTier}
          gamificationData={gamificationData}
        />
      </Box>
    </Box>
  );
};

export default CircularTierGallery;
