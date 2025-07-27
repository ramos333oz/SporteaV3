import React from 'react';
import { Box } from '@mui/material';
import TiltedCard from '../animations/TiltedCard';

/**
 * Animated User Tier Card Component
 * Renders tier symbol, level, and tier name directly onto high-quality canvas background
 * Single TiltedCard with no overlay content - everything rendered on background image
 */
const AnimatedUserTierCard = ({ user, gamificationData, tierConfig, getUserTier }) => {
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
  const generateTierCardImage = () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return createSVGFallback();
      }

      // High DPI scaling for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      const size = 400;

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

      // Render tier symbol (emoji) - large and prominent
      ctx.font = `bold ${100}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif`;
      ctx.fillStyle = '#000';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillText(tier.icon, size/2, size/2 - 50);

      // Reset shadow for text
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Render level text with white outline for contrast
      ctx.font = `bold ${42}px "Libre Baskerville", Georgia, serif`;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeText(`Level ${userLevel}`, size/2, size/2 + 25);
      ctx.fillStyle = tier.color;
      ctx.fillText(`Level ${userLevel}`, size/2, size/2 + 25);

      // Render tier name with white outline
      ctx.font = `600 ${24}px "Poppins", "Helvetica Neue", Arial, sans-serif`;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeText(tier.name.toUpperCase(), size/2, size/2 + 70);
      ctx.fillStyle = tier.color;
      ctx.fillText(tier.name.toUpperCase(), size/2, size/2 + 70);

      return canvas.toDataURL('image/png', 1.0);

    } catch (error) {
      console.warn('Canvas generation failed, using SVG fallback:', error);
      return createSVGFallback();
    }
  };

  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <TiltedCard
        imageSrc={generateTierCardImage()}
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
