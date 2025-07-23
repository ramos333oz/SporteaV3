import { supabase } from '../services/supabase';

/**
 * Check if an email already exists in the auth system
 * @param {string} email - Email address to check
 * @returns {Promise<{exists: boolean, isConfirmed: boolean, error: string|null}>}
 */
export const checkEmailExists = async (email) => {
  try {
    if (!email || !email.trim()) {
      return { exists: false, isConfirmed: false, error: 'Email is required' };
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Check if email exists in the public users table (confirmed accounts)
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('email, created_at')
      .eq('email', trimmedEmail)
      .maybeSingle();

    if (publicError) {
      console.error('Error checking public users table:', publicError);
      return { exists: false, isConfirmed: false, error: 'Unable to validate email' };
    }

    if (publicUser) {
      return {
        exists: true,
        isConfirmed: true,
        error: null,
        accountCreated: publicUser.created_at
      };
    }

    // If not in public users table, the email might be unconfirmed in auth
    // We can't directly query auth.users from client, so we'll rely on signup attempt
    return { exists: false, isConfirmed: false, error: null };

  } catch (error) {
    console.error('Exception in checkEmailExists:', error);
    return { exists: false, isConfirmed: false, error: 'Unable to validate email' };
  }
};

/**
 * Validate email domain according to app requirements
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if domain is allowed
 */
export const isValidEmailDomain = (email) => {
  if (!email || !email.trim()) return false;
  
  const allowedDomains = [
    '@student.uitm.edu.my',
    '@example.com',
    '@test.local',
    '@mailhog.example',
    '@gmail.com',
    '@outlook.com',
    '@yahoo.com',
    '@hotmail.com'
  ];
  
  return allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
};

/**
 * Get user-friendly error message for email validation
 * @param {string} email - Email address
 * @param {Object} checkResult - Result from checkEmailExists
 * @returns {string} - User-friendly error message
 */
export const getEmailErrorMessage = (email, checkResult) => {
  if (!email || !email.trim()) {
    return 'Email address is required';
  }

  if (!isValidEmailDomain(email)) {
    return 'Only @student.uitm.edu.my email addresses are allowed (test domains: @example.com, @test.local, @mailhog.example, @gmail.com, @outlook.com, @yahoo.com, @hotmail.com)';
  }

  if (checkResult.exists && checkResult.isConfirmed) {
    return 'This email address is already registered and confirmed. Please try logging in instead.';
  }

  if (checkResult.error) {
    return checkResult.error;
  }

  return null;
};

/**
 * Get actionable suggestions for email validation errors
 * @param {string} email - Email address
 * @param {Object} checkResult - Result from checkEmailExists
 * @returns {Object} - Suggestions object with actions
 */
export const getEmailSuggestions = (email, checkResult) => {
  if (checkResult.exists && checkResult.isConfirmed) {
    return {
      primaryAction: {
        text: 'Sign In Instead',
        action: 'login',
        url: '/login'
      },
      secondaryAction: {
        text: 'Forgot Password?',
        action: 'reset',
        url: '/forgot-password'
      },
      message: 'This email is already registered. You can sign in or reset your password if needed.'
    };
  }

  if (!isValidEmailDomain(email)) {
    return {
      message: 'Please use a valid UiTM student email address or one of the allowed test domains.',
      primaryAction: null,
      secondaryAction: null
    };
  }

  return {
    message: null,
    primaryAction: null,
    secondaryAction: null
  };
};
