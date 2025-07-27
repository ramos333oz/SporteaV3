/**
 * Tier System Utilities
 * Shared configuration and functions for the gamification tier system
 * Used across Leaderboard, Profile, and other components
 */

// Tier configuration with visual styling
export const TIER_CONFIG = {
  bronze: {
    name: 'Bronze Tier',
    subtitle: 'Beginner League',
    levels: '1-10',
    color: '#CD7F32',
    bgColor: '#FFF8DC',
    icon: '🥉', // Fallback emoji
    iconImage: '/images/ranks/bronze.png',
    description: 'New players learning the basics',
    minLevel: 1,
    maxLevel: 10
  },
  silver: {
    name: 'Silver Tier',
    subtitle: 'Intermediate League',
    levels: '11-25',
    color: '#C0C0C0',
    bgColor: '#F8F8FF',
    icon: '🥈', // Fallback emoji
    iconImage: '/images/ranks/silver.png',
    description: 'Regular participants building skills',
    minLevel: 11,
    maxLevel: 25
  },
  gold: {
    name: 'Gold Tier',
    subtitle: 'Advanced League',
    levels: '26-50',
    color: '#FFD700',
    bgColor: '#FFFACD',
    icon: '🥇', // Fallback emoji
    iconImage: '/images/ranks/gold.png',
    description: 'Active community members and skilled players',
    minLevel: 26,
    maxLevel: 50
  },
  platinum: {
    name: 'Platinum Tier',
    subtitle: 'Expert League',
    levels: '51-75',
    color: '#E5E4E2',
    bgColor: '#F5F5F5',
    icon: '💎', // Fallback emoji
    iconImage: '/images/ranks/platinum.png',
    description: 'Experienced players and community leaders',
    minLevel: 51,
    maxLevel: 75
  },
  diamond: {
    name: 'Diamond Tier',
    subtitle: 'Master League',
    levels: '76-100',
    color: '#B9F2FF',
    bgColor: '#F0F8FF',
    icon: '💠', // Fallback emoji
    iconImage: '/images/ranks/diamond.png',
    description: 'Elite players and top community builders',
    minLevel: 76,
    maxLevel: 100
  }
};

// Function to determine user tier based on level
export const getUserTier = (level) => {
  if (level >= 1 && level <= 10) return 'bronze';
  if (level >= 11 && level <= 25) return 'silver';
  if (level >= 26 && level <= 50) return 'gold';
  if (level >= 51 && level <= 75) return 'platinum';
  if (level >= 76 && level <= 100) return 'diamond';
  return 'bronze'; // Default fallback
};

// Get next tier information
export const getNextTierInfo = (currentLevel) => {
  const currentTierKey = getUserTier(currentLevel);
  const tierKeys = Object.keys(TIER_CONFIG);
  const currentIndex = tierKeys.indexOf(currentTierKey);
  
  if (currentIndex === -1 || currentIndex === tierKeys.length - 1) {
    return null; // Already at highest tier
  }
  
  const nextTierKey = tierKeys[currentIndex + 1];
  const nextTier = TIER_CONFIG[nextTierKey];
  
  return {
    tierKey: nextTierKey,
    tier: nextTier,
    levelsNeeded: nextTier.minLevel - currentLevel,
    xpNeeded: (nextTier.minLevel - currentLevel) * 500 // 500 XP per level
  };
};

// Get progress within current tier
export const getTierProgress = (currentLevel) => {
  const tierKey = getUserTier(currentLevel);
  const tier = TIER_CONFIG[tierKey];
  
  if (!tier) return 0;
  
  const progressInTier = currentLevel - tier.minLevel;
  const tierRange = tier.maxLevel - tier.minLevel;
  
  return Math.min(Math.max(progressInTier / tierRange, 0), 1);
};

// Get all tier keys in order
export const getTierOrder = () => {
  return Object.keys(TIER_CONFIG);
};

// Check if user is at maximum tier
export const isMaxTier = (level) => {
  return getUserTier(level) === 'diamond' && level >= 100;
};

// Get tier by key
export const getTierByKey = (tierKey) => {
  return TIER_CONFIG[tierKey] || null;
};

// Format tier display name
export const formatTierName = (tierKey, includeSubtitle = false) => {
  const tier = TIER_CONFIG[tierKey];
  if (!tier) return 'Unknown Tier';
  
  return includeSubtitle ? `${tier.name} - ${tier.subtitle}` : tier.name;
};

// Export all utilities as a single object for convenience
export const TierSystem = {
  TIER_CONFIG,
  getUserTier,
  getNextTierInfo,
  getTierProgress,
  getTierOrder,
  isMaxTier,
  getTierByKey,
  formatTierName
};

export default TierSystem;
