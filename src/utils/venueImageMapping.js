/**
 * Venue Image Mapping Utility
 * Maps venue names to their corresponding image files in the venuespic directory
 */

// Venue image paths (using public directory paths)
const courtTennis = '/venuespic/courttennis.jpeg';
const courtPerinduFutsal = '/venuespic/courtperindufutsal.PNG';
const padangPusatSukan = '/venuespic/padangpusatsukan.jpeg';
const padangHockey = '/venuespic/padanghockey.jpeg';
const courtPerinduVolley = '/venuespic/courtperinduvolley.PNG';
const courtVolleyPusatSukan = '/venuespic/courtvolleypusatsukan.jpeg';
const courtBadmintonPusatSukan = '/venuespic/courtbadmintonpusatsukan.PNG';
const courtFutsalPerindu1 = '/venuespic/courtfutsalperindu1.PNG';

// Missing venue images that are now available
const courtBasketPusatSukan = '/venuespic/Court Pusat Sukan A (Basketball).jpeg';
const courtFutsalPusatSukan = '/venuespic/Court Pusat Sukan A (Futsal).jpeg';

/**
 * Venue image mapping based on venue names
 * Maps venue names (case-insensitive) to their corresponding image imports
 */
export const VENUE_IMAGE_MAPPING = {
  // Tennis Courts
  'court pusat sukan tennis a': courtTennis,
  'court pusat sukan tennis b': courtTennis,
  'court pusat sukan tennis c': courtTennis,
  'court pusat sukan tennis d': courtTennis,
  'court pusat sukan tennis a-d': courtTennis,
  
  // Futsal Courts - Perindu
  'court perindu c': courtPerinduFutsal,
  'court perindu b': courtPerinduFutsal,
  'court perindu c-b': courtPerinduFutsal,
  'court perindu a (futsal)': courtFutsalPerindu1,
  'court perindu a': courtFutsalPerindu1,

  // Futsal Courts - Pusat Sukan
  'court pusat sukan a (futsal)': courtFutsalPusatSukan,
  'court pusat sukan b (futsal)': courtFutsalPusatSukan,
  'court pusat sukan futsal': courtFutsalPusatSukan,

  // Basketball Courts - Pusat Sukan
  'court pusat sukan a (basketball)': courtBasketPusatSukan,
  'court pusat sukan b (basketball)': courtBasketPusatSukan,
  'court pusat sukan basketball': courtBasketPusatSukan,
  
  // Main Fields
  'padang pusat sukan uitm': padangPusatSukan,
  'padang pusat sukan': padangPusatSukan,
  'padang hoki pusat sukan': padangHockey,
  'padang hockey pusat sukan': padangHockey,
  
  // Volleyball Courts
  'court perindu a-b (volleyball)': courtPerinduVolley,
  'court perindu a (volleyball)': courtPerinduVolley,
  'court perindu b (volleyball)': courtPerinduVolley,
  'court pusat sukan a-b (volleyball)': courtVolleyPusatSukan,
  'court pusat sukan a (volleyball)': courtVolleyPusatSukan,
  'court pusat sukan b (volleyball)': courtVolleyPusatSukan,
  
  // Badminton/Indoor Courts
  'dewan pusat sukan': courtBadmintonPusatSukan,
  'dewan badminton pusat sukan': courtBadmintonPusatSukan,
};

/**
 * Get venue image by venue name
 * @param {string} venueName - The name of the venue
 * @returns {string|null} - The image import or null if not found
 */
export const getVenueImage = (venueName) => {
  if (!venueName || typeof venueName !== 'string') {
    return null;
  }

  // Normalize the venue name for matching
  const normalizedName = venueName.toLowerCase().trim();
  
  // Direct match first
  if (VENUE_IMAGE_MAPPING[normalizedName]) {
    return VENUE_IMAGE_MAPPING[normalizedName];
  }
  
  // Fuzzy matching for partial matches
  const mappingKeys = Object.keys(VENUE_IMAGE_MAPPING);
  
  // Try to find a key that contains the venue name or vice versa
  for (const key of mappingKeys) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return VENUE_IMAGE_MAPPING[key];
    }
  }
  
  // Try more specific matching patterns
  if (normalizedName.includes('tennis')) {
    return courtTennis;
  } else if (normalizedName.includes('basketball') && normalizedName.includes('pusat sukan')) {
    return courtBasketPusatSukan;
  } else if (normalizedName.includes('futsal') && normalizedName.includes('pusat sukan')) {
    return courtFutsalPusatSukan;
  } else if (normalizedName.includes('futsal') && normalizedName.includes('perindu')) {
    if (normalizedName.includes('a')) {
      return courtFutsalPerindu1;
    }
    return courtPerinduFutsal;
  } else if (normalizedName.includes('volleyball') && normalizedName.includes('perindu')) {
    return courtPerinduVolley;
  } else if (normalizedName.includes('volleyball') && normalizedName.includes('pusat sukan')) {
    return courtVolleyPusatSukan;
  } else if (normalizedName.includes('badminton') || normalizedName.includes('dewan')) {
    return courtBadmintonPusatSukan;
  } else if (normalizedName.includes('hockey') || normalizedName.includes('hoki')) {
    return padangHockey;
  } else if (normalizedName.includes('padang')) {
    return padangPusatSukan;
  }
  
  return null;
};

/**
 * Get venue image with fallback
 * @param {string} venueName - The name of the venue
 * @param {string} fallbackImage - Fallback image if no match found
 * @returns {string} - The image import or fallback
 */
export const getVenueImageWithFallback = (venueName, fallbackImage = null) => {
  const image = getVenueImage(venueName);
  return image || fallbackImage;
};

/**
 * Check if venue has an associated image
 * @param {string} venueName - The name of the venue
 * @returns {boolean} - True if venue has an image
 */
export const hasVenueImage = (venueName) => {
  return getVenueImage(venueName) !== null;
};

/**
 * Get all available venue images
 * @returns {Object} - Object containing all venue image mappings
 */
export const getAllVenueImages = () => {
  return { ...VENUE_IMAGE_MAPPING };
};

/**
 * Get venue image alt text
 * @param {string} venueName - The name of the venue
 * @returns {string} - Alt text for the venue image
 */
export const getVenueImageAlt = (venueName) => {
  if (!venueName) return 'Venue Image';
  return `${venueName} - Sports Venue`;
};
