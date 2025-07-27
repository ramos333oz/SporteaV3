/**
 * Generates beautiful tier card images using Canvas API
 * Integrates with the Elegant Luxury theme and design system
 */

/**
 * Generate a tier card image as a data URL
 * @param {Object} tier - Tier configuration object
 * @param {number} width - Canvas width (default: 500)
 * @param {number} height - Canvas height (default: 400)
 * @returns {string} Data URL of the generated image
 */
export function generateTierCardImage(tier, width = 500, height = 400) {
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
  
  // Draw tier icon (large and centered)
  ctx.font = 'bold 120px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = tier.color;
  
  // Add shadow to icon
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  ctx.fillText(tier.icon, width / 2, height / 2 - 40);
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw tier name (using Libre Baskerville style)
  ctx.font = 'bold 32px serif';
  ctx.fillStyle = tier.color;
  ctx.fillText(tier.name, width / 2, height / 2 + 60);
  
  // Draw level range (using Poppins style)
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#666666';
  ctx.fillText(`Levels ${tier.levels}`, width / 2, height / 2 + 95);
  
  // Draw description (smaller text)
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#888888';
  
  // Word wrap for description
  const words = tier.description.split(' ');
  const maxWidth = width - 40;
  let line = '';
  let y = height / 2 + 125;
  
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, width / 2, y);
      line = words[n] + ' ';
      y += 20;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, width / 2, y);
  
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
 * @returns {Array} Array of tier items with generated images
 */
export function generateAllTierCards(tierConfig) {
  return Object.entries(tierConfig).map(([key, tier]) => ({
    image: generateTierCardImage(tier),
    text: tier.name,
    tierKey: key,
    tier: tier
  }));
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
