import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import TiltedCard from '../animations/TiltedCard';
import { getCachedImage } from '../../utils/imageLoader';

/**
 * Animated User Tier Card Component
 * Renders tier symbol, level, and tier name directly onto high-quality canvas background
 * Single TiltedCard with no overlay content - everything rendered on background image
 */
const AnimatedUserTierCard = ({ user, gamificationData, tierConfig, getUserTier }) => {
  const [cardImage, setCardImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!user || !gamificationData || !tierConfig || !getUserTier) return null;

  const userLevel = gamificationData.current_level || 1;
  const tierKey = getUserTier(userLevel);
  const tier = tierConfig[tierKey];

  if (!tier) return null;

  // SVG fallback function
  const createSVGFallback = () => {
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${tier.bgColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${tier.color};stop-opacity:0.4" />
          </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#grad)" stroke="${tier.color}" stroke-width="6"/>
        <text x="200" y="150" text-anchor="middle" font-size="80" fill="black">${tier.icon}</text>
        <text x="200" y="220" text-anchor="middle" font-size="36" font-weight="bold" fill="${tier.color}">Level ${userLevel}</text>
        <text x="200" y="260" text-anchor="middle" font-size="20" font-weight="600" fill="${tier.color}">${tier.name.toUpperCase()}</text>
      </svg>
    `)}`;
  };

  // Generate high-quality tier card with all content rendered directly onto canvas
  const generateTierCardImage = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return createSVGFallback();
      }

      // Load the tier rank image
      let rankImage = null;
      try {
        rankImage = await getCachedImage(tier.iconImage);
      } catch (imageError) {
        console.warn('Failed to load rank image, using emoji fallback:', imageError);
        // Will use emoji fallback below
      }

      // High DPI scaling for crisp rendering - reverted to original size
      const dpr = window.devicePixelRatio || 1;
      const size = 400; // Reverted back to original size

      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';

      // Scale context for high DPI
      ctx.scale(dpr, dpr);

      // Enable crisp rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Create beautiful gradient background
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, tier.bgColor);
      gradient.addColorStop(0.6, tier.color + '40');
      gradient.addColorStop(1, tier.color + '80');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Add subtle pattern overlay
      ctx.fillStyle = tier.color + '15';
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if ((i + j) % 2 === 0) {
            ctx.fillRect(i * 40, j * 40, 40, 40);
          }
        }
      }

      // Draw elegant border
      ctx.strokeStyle = tier.color;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeRect(4, 4, size - 8, size - 8);

      // Set text rendering properties for crisp text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Render tier symbol (image or emoji fallback) - large and prominent
      if (rankImage) {
        // Draw the rank image with shadow effect and proper aspect ratio
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;

        // Calculate proper aspect ratio and sizing
        const maxImageSize = 280; // Doubled from 140px for more prominent display
        const aspectRatio = rankImage.width / rankImage.height;

        let drawWidth, drawHeight;
        if (aspectRatio > 1) {
          // Wider than tall
          drawWidth = maxImageSize;
          drawHeight = maxImageSize / aspectRatio;
        } else {
          // Taller than wide or square
          drawHeight = maxImageSize;
          drawWidth = maxImageSize * aspectRatio;
        }

        const imageX = (size - drawWidth) / 2;
        const imageY = (size / 2) - 70 - (drawHeight / 2); // Moved up slightly for better spacing

        ctx.drawImage(rankImage, imageX, imageY, drawWidth, drawHeight);
      } else {
        // Fallback to emoji if image failed to load
        ctx.font = `bold ${100}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif`;
        ctx.fillStyle = '#000';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillText(tier.icon, size/2, size/2 - 50);
      }

      // Reset shadow for text
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Render level text with white outline for contrast - reduced size for better hierarchy
      ctx.font = `bold ${36}px "Libre Baskerville", Georgia, serif`; // Reduced from 42px
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeText(`Level ${userLevel}`, size/2, size/2 + 40); // Moved down slightly
      ctx.fillStyle = tier.color;
      ctx.fillText(`Level ${userLevel}`, size/2, size/2 + 40);

      // Render tier name with white outline - reduced size for better hierarchy
      ctx.font = `600 ${20}px "Poppins", "Helvetica Neue", Arial, sans-serif`; // Reduced from 24px
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeText(tier.name.toUpperCase(), size/2, size/2 + 80); // Moved down slightly
      ctx.fillStyle = tier.color;
      ctx.fillText(tier.name.toUpperCase(), size/2, size/2 + 80);

      return canvas.toDataURL('image/png', 1.0);

    } catch (error) {
      console.warn('Canvas generation failed, using SVG fallback:', error);
      return createSVGFallback();
    }
  };

  // Generate card image when component mounts or tier changes
  useEffect(() => {
    const generateCard = async () => {
      setLoading(true);
      setError(false);

      try {
        const imageDataUrl = await generateTierCardImage();
        setCardImage(imageDataUrl);
      } catch (err) {
        console.error('Failed to generate tier card:', err);
        setError(true);
        // Use SVG fallback
        setCardImage(createSVGFallback());
      } finally {
        setLoading(false);
      }
    };

    generateCard();
  }, [tierKey, userLevel]); // Regenerate when tier or level changes

  // Show loading state
  if (loading) {
    return (
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '280px' // Reverted to original TiltedCard size
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      <TiltedCard
        imageSrc={cardImage}
        altText={`${tier.name} - Level ${userLevel}`}
        captionText={`${tier.name} - Level ${userLevel}`}
        containerHeight="280px"
        containerWidth="280px"
        imageHeight="280px"
        imageWidth="280px"
        rotateAmplitude={12}
        scaleOnHover={1.15}
        showMobileWarning={false}
        showTooltip={true}
        displayOverlayContent={false}
        overlayContent={null}
      />
    </Box>
  );
};

export default AnimatedUserTierCard;
