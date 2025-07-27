/**
 * Image Loading Utilities
 * Provides functions for preloading images and handling image loading in canvas contexts
 */

/**
 * Preload a single image
 * @param {string} src - Image source URL
 * @returns {Promise<HTMLImageElement>} Promise that resolves with loaded image
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Handle CORS if needed
    
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(new Error(`Failed to load image: ${src}`));
    
    img.src = src;
  });
};

/**
 * Preload multiple images
 * @param {string[]} sources - Array of image source URLs
 * @returns {Promise<HTMLImageElement[]>} Promise that resolves with array of loaded images
 */
export const preloadImages = (sources) => {
  return Promise.all(sources.map(src => preloadImage(src)));
};

/**
 * Cache for loaded images to avoid reloading
 */
const imageCache = new Map();

/**
 * Get cached image or load and cache it
 * @param {string} src - Image source URL
 * @returns {Promise<HTMLImageElement>} Promise that resolves with loaded image
 */
export const getCachedImage = async (src) => {
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }
  
  try {
    const image = await preloadImage(src);
    imageCache.set(src, image);
    return image;
  } catch (error) {
    console.warn(`Failed to load image ${src}:`, error);
    throw error;
  }
};

/**
 * Clear image cache
 */
export const clearImageCache = () => {
  imageCache.clear();
};

/**
 * Get cache size
 * @returns {number} Number of cached images
 */
export const getCacheSize = () => {
  return imageCache.size;
};
