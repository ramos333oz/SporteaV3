/**
 * Generates beautiful tier card images using Canvas API
 * Integrates with the Elegant Luxury theme and design system
 */

import { getCachedImage } from './imageLoader';

/**
 * Generate a tier card image as a data URL
 * @param {Object} tier - Tier configuration object
 * @param {number} width - Canvas width (default: 500)
 * @param {number} height - Canvas height (default: 400)
 * @returns {Promise<string>} Promise that resolves to data URL of the generated image
 */
export async function generateTierCardImage(tier, width = 500, height = 400) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas dimensions
  canvas.width = width;
  canvas.height = height;
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, tier.bgColor);
  gradient.addColorStop(0.5, tier.bgColor + 'CC'); // Add some transparency
  gradient.addColorStop(1, tier.color + '40'); // More transparent at the end
  
  // Draw background with rounded corners effect
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add subtle border
  ctx.strokeStyle = tier.color + '60';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, width, height);

  // Load and draw tier rank image (large and centered)
  let rankImage = null;
  try {
    rankImage = await getCachedImage(tier.iconImage);
  } catch (imageError) {
    console.warn('Failed to load rank image for CircularTierGallery, using emoji fallback:', imageError);
  }

  if (rankImage) {
    // Draw the rank image with shadow effect and proper aspect ratio
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Calculate proper aspect ratio and sizing for CircularTierGallery - much larger to match TiltedCard
    const maxImageSize = 280; // Increased to match TiltedCard prominence
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

    const imageX = (width - drawWidth) / 2;
    const imageY = (height / 2) - 80 - (drawHeight / 2); // Moved up more for larger image

    ctx.drawImage(rankImage, imageX, imageY, drawWidth, drawHeight);
  } else {
    // Fallback to emoji if image failed to load
    ctx.font = 'bold 140px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = tier.color;

    // Add shadow to icon
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    ctx.fillText(tier.icon, width / 2, height / 2 - 80); // Moved up to match larger image positioning
  }
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Set text alignment for proper centering
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw tier name with white outline (using Libre Baskerville style from UI Style Guide)
  ctx.font = 'bold 32px "Libre Baskerville", Georgia, serif';

  // Add white stroke/outline for better visibility
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeText(tier.name, width / 2, height / 2 + 100);

  // Fill with tier color
  ctx.fillStyle = tier.color;
  ctx.fillText(tier.name, width / 2, height / 2 + 100);

  // Draw level range with white outline (using Poppins style from UI Style Guide)
  ctx.font = '600 20px "Poppins", "Helvetica Neue", Arial, sans-serif';

  // Add white stroke/outline for level text
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeText(`Levels ${tier.levels}`, width / 2, height / 2 + 135);

  // Fill with secondary color
  ctx.fillStyle = '#666666';
  ctx.fillText(`Levels ${tier.levels}`, width / 2, height / 2 + 135);
  
  // Description removed to make cards cleaner and focus on the larger rank images
  
  // Add decorative elements
  drawDecorativeElements(ctx, width, height, tier.color);
  
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Draw decorative elements on the tier card
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} color - Tier color
 */
function drawDecorativeElements(ctx, width, height, color) {
  // Draw corner decorations
  ctx.strokeStyle = color + '40';
  ctx.lineWidth = 2;
  
  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(20, 40);
  ctx.lineTo(20, 20);
  ctx.lineTo(40, 20);
  ctx.stroke();
  
  // Top-right corner
  ctx.beginPath();
  ctx.moveTo(width - 40, 20);
  ctx.lineTo(width - 20, 20);
  ctx.lineTo(width - 20, 40);
  ctx.stroke();
  
  // Bottom-left corner
  ctx.beginPath();
  ctx.moveTo(20, height - 40);
  ctx.lineTo(20, height - 20);
  ctx.lineTo(40, height - 20);
  ctx.stroke();
  
  // Bottom-right corner
  ctx.beginPath();
  ctx.moveTo(width - 40, height - 20);
  ctx.lineTo(width - 20, height - 20);
  ctx.lineTo(width - 20, height - 40);
  ctx.stroke();
}

/**
 * Generate all tier card images from TIER_CONFIG
 * @param {Object} tierConfig - Complete tier configuration object
 * @returns {Promise<Array>} Promise that resolves to array of tier items with generated images
 */
export async function generateAllTierCards(tierConfig) {
  const tierEntries = Object.entries(tierConfig);
  const tierItems = await Promise.all(
    tierEntries.map(async ([key, tier]) => ({
      image: await generateTierCardImage(tier),
      text: tier.name,
      tierKey: key,
      tier: tier
    }))
  );
  return tierItems;
}

/**
 * Check if WebGL is supported in the current browser
 * @returns {boolean} True if WebGL is supported
 */
export function isWebGLSupported() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}
