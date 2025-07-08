/**
 * Date utility functions for birth date and age calculations
 */

import { differenceInYears, isValid, parseISO, format } from 'date-fns';

/**
 * Calculate age from birth date
 * @param {Date|string} birthDate - Birth date as Date object or ISO string
 * @returns {number} Age in years
 */
export const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  
  let date = birthDate;
  if (typeof birthDate === 'string') {
    date = parseISO(birthDate);
  }
  
  if (!isValid(date)) return null;
  
  return differenceInYears(new Date(), date);
};

/**
 * Validate birth date for minimum age requirement
 * @param {Date|string} birthDate - Birth date to validate
 * @param {number} minAge - Minimum required age (default: 18)
 * @returns {object} Validation result with isValid and message
 */
export const validateBirthDate = (birthDate, minAge = 18) => {
  if (!birthDate) {
    return {
      isValid: false,
      message: 'Birth date is required'
    };
  }
  
  let date = birthDate;
  if (typeof birthDate === 'string') {
    date = parseISO(birthDate);
  }
  
  if (!isValid(date)) {
    return {
      isValid: false,
      message: 'Please enter a valid birth date'
    };
  }
  
  const age = calculateAge(date);
  
  if (age < minAge) {
    return {
      isValid: false,
      message: `You must be at least ${minAge} years old to register`
    };
  }
  
  if (age > 100) {
    return {
      isValid: false,
      message: 'Please enter a valid birth date'
    };
  }
  
  return {
    isValid: true,
    message: `Age: ${age} years`
  };
};

/**
 * Format birth date for display
 * @param {Date|string} birthDate - Birth date to format
 * @returns {string} Formatted date string
 */
export const formatBirthDate = (birthDate) => {
  if (!birthDate) return '';
  
  let date = birthDate;
  if (typeof birthDate === 'string') {
    date = parseISO(birthDate);
  }
  
  if (!isValid(date)) return '';
  
  return format(date, 'yyyy-MM-dd');
};

/**
 * Get maximum allowed birth date (for 18+ requirement)
 * @param {number} minAge - Minimum required age (default: 18)
 * @returns {Date} Maximum birth date
 */
export const getMaxBirthDate = (minAge = 18) => {
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
  return maxDate;
};

/**
 * Get minimum allowed birth date (for reasonable age limit)
 * @param {number} maxAge - Maximum reasonable age (default: 100)
 * @returns {Date} Minimum birth date
 */
export const getMinBirthDate = (maxAge = 100) => {
  const today = new Date();
  const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
  return minDate;
};
