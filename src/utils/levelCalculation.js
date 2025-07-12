/**
 * SporteaV3 Simplified Level Calculation Utilities
 * 
 * This module provides client-side level calculation functions for the simplified
 * gamification system. All calculations use linear progression (500 XP per level)
 * for better performance and maintainability.
 * 
 * Design Philosophy:
 * - Simple, predictable progression
 * - Client-side calculations for instant feedback
 * - Performance-optimized with minimal complexity
 * - Consistent with database calculate_level function
 */

// Constants for the simplified gamification system
export const GAMIFICATION_CONSTANTS = {
  XP_PER_LEVEL: 500,
  MIN_LEVEL: 1,
  MAX_LEVEL: 100, // Practical cap for UI purposes
};

/**
 * Calculate user level from total XP
 * Uses linear progression: 500 XP per level
 * 
 * @param {number} totalXP - Total XP earned by user
 * @returns {number} User level (minimum 1)
 * 
 * Examples:
 * - 0 XP = Level 1
 * - 499 XP = Level 1
 * - 500 XP = Level 2
 * - 1000 XP = Level 3
 */
export const calculateLevel = (totalXP) => {
  if (typeof totalXP !== 'number' || totalXP < 0) {
    return GAMIFICATION_CONSTANTS.MIN_LEVEL;
  }
  
  const level = Math.floor(totalXP / GAMIFICATION_CONSTANTS.XP_PER_LEVEL) + 1;
  return Math.min(Math.max(level, GAMIFICATION_CONSTANTS.MIN_LEVEL), GAMIFICATION_CONSTANTS.MAX_LEVEL);
};

/**
 * Calculate XP needed to reach the next level
 * 
 * @param {number} totalXP - Current total XP
 * @returns {number} XP needed for next level
 */
export const getXPToNextLevel = (totalXP) => {
  const currentLevel = calculateLevel(totalXP);
  const nextLevelXP = currentLevel * GAMIFICATION_CONSTANTS.XP_PER_LEVEL;
  return Math.max(0, nextLevelXP - totalXP);
};

/**
 * Calculate XP required to start a specific level
 * 
 * @param {number} level - Target level
 * @returns {number} XP required to reach that level
 */
export const getXPForLevel = (level) => {
  if (level <= GAMIFICATION_CONSTANTS.MIN_LEVEL) {
    return 0;
  }
  return (level - 1) * GAMIFICATION_CONSTANTS.XP_PER_LEVEL;
};

/**
 * Calculate progress percentage within current level
 * 
 * @param {number} totalXP - Current total XP
 * @returns {number} Progress percentage (0-100)
 */
export const getLevelProgress = (totalXP) => {
  const currentLevel = calculateLevel(totalXP);
  const levelStartXP = getXPForLevel(currentLevel);
  const levelEndXP = getXPForLevel(currentLevel + 1);
  const progressXP = totalXP - levelStartXP;
  const levelXPRange = levelEndXP - levelStartXP;
  
  return Math.min(100, Math.max(0, (progressXP / levelXPRange) * 100));
};

/**
 * Get detailed level information for UI display
 * 
 * @param {number} totalXP - Current total XP
 * @returns {object} Comprehensive level information
 */
export const getLevelInfo = (totalXP) => {
  const level = calculateLevel(totalXP);
  const levelStartXP = getXPForLevel(level);
  const levelEndXP = getXPForLevel(level + 1);
  const progressXP = totalXP - levelStartXP;
  const xpToNext = getXPToNextLevel(totalXP);
  const progressPercentage = getLevelProgress(totalXP);
  
  return {
    level,
    totalXP,
    levelStartXP,
    levelEndXP,
    progressXP,
    xpToNext,
    progressPercentage,
    isMaxLevel: level >= GAMIFICATION_CONSTANTS.MAX_LEVEL
  };
};

/**
 * Calculate XP difference between two levels
 * 
 * @param {number} fromLevel - Starting level
 * @param {number} toLevel - Target level
 * @returns {number} XP difference
 */
export const getXPBetweenLevels = (fromLevel, toLevel) => {
  return getXPForLevel(toLevel) - getXPForLevel(fromLevel);
};

/**
 * Validate if XP amount would cause level up
 * 
 * @param {number} currentXP - Current total XP
 * @param {number} xpToAdd - XP amount to add
 * @returns {object} Level up information
 */
export const checkLevelUp = (currentXP, xpToAdd) => {
  const oldLevel = calculateLevel(currentXP);
  const newLevel = calculateLevel(currentXP + xpToAdd);
  
  return {
    willLevelUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
    levelsGained: newLevel - oldLevel
  };
};

/**
 * Format XP number for display
 * 
 * @param {number} xp - XP amount
 * @returns {string} Formatted XP string
 */
export const formatXP = (xp) => {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
};

/**
 * Get level color based on level ranges
 * Maintains compatibility with existing level color system
 * 
 * @param {number} level - User level
 * @returns {string} Color code for the level
 */
export const getLevelColor = (level) => {
  if (level >= 76) return '#9C27B0'; // Purple for high levels
  if (level >= 51) return '#FF5722'; // Deep Orange for advanced
  if (level >= 26) return '#FF9800'; // Orange for intermediate
  if (level >= 11) return '#4CAF50'; // Green for beginner+
  return '#2196F3'; // Blue for beginners
};

/**
 * Get level tier name for display
 * 
 * @param {number} level - User level
 * @returns {string} Tier name
 */
export const getLevelTier = (level) => {
  if (level >= 76) return 'Master';
  if (level >= 51) return 'Expert';
  if (level >= 26) return 'Advanced';
  if (level >= 11) return 'Intermediate';
  return 'Beginner';
};

// Export all utilities as a single object for convenience
export const LevelUtils = {
  calculateLevel,
  getXPToNextLevel,
  getXPForLevel,
  getLevelProgress,
  getLevelInfo,
  getXPBetweenLevels,
  checkLevelUp,
  formatXP,
  getLevelColor,
  getLevelTier,
  CONSTANTS: GAMIFICATION_CONSTANTS
};

export default LevelUtils;
