import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../services/supabase';

// Create auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    console.log('AuthProvider useEffect - Initializing');

    // Simple function to fetch the current user
    const getCurrentUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting current user:', error);
          return null;
        }
        return data.user;
      } catch (e) {
        console.error('Exception getting current user:', e);
        return null;
      }
    };

    // Initialize auth state
    const initializeAuth = async () => {
      setLoading(true);
      try {
        // First check if we have a session
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Initial session check:', sessionData?.session ? 'Has session' : 'No session');
        
        // If we have a session, get the user
        if (sessionData?.session) {
          const currentUser = await getCurrentUser();
          if (currentUser) {
            console.log('User found:', currentUser.email);
            setUser(currentUser);
          } else {
            console.log('No user found despite having a session');
            setUser(null);
          }
        } else {
          console.log('No active session');
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setAuthInitialized(true); // Mark auth as initialized
      }
    };

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth state changed: ${event}`, session ? 'Has session' : 'No session');
      
      if (event === 'SIGNED_IN') {
        // When signed in, get and set the user
        getCurrentUser().then(user => {
          if (user) {
            console.log('User signed in:', user.email);
            setUser(user);
          }
          setLoading(false);
        });
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setLoading(false);
      } else if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        // Update user data
        getCurrentUser().then(user => {
          if (user) {
            console.log('User data updated:', user.email);
            setUser(user);
          }
          setLoading(false);
        });
      }
    });

    // Initialize right away
    initializeAuth();

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading safety timeout reached, forcing loading state to false');
        setLoading(false);
      }
    }, 3000); // 3 second timeout

    // Cleanup on unmount
    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Sign up with email and password
  const signUp = async (email, password, userData) => {
    try {
      setLoading(true);
      setError(null); // Reset any previous errors

      console.log('Signing up user with email:', email);

      // Check if this is a test domain that needs custom handling
      const isTestDomain = email.includes('@mailhog.example') ||
                          email.includes('@example.com') ||
                          email.includes('@test.local');

      if (isTestDomain) {
        // Use custom signup function for test domains
        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/custom-signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`,
          },
          body: JSON.stringify({
            email,
            password,
            userData
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Custom signup failed');
        }

        // For test domains, the user is automatically confirmed
        // We need to sign them in immediately
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          throw signInError;
        }

        return { data: signInData, error: null };
      } else {
        // Create auth user - let Supabase handle duplicate email detection
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: userData,
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (authError) {
          console.error('Auth signup error:', authError);

          // Handle specific error cases
          let errorMessage = authError.message;

          if (authError.message?.includes('User already registered') ||
              authError.message?.includes('already exists') ||
              authError.message?.includes('already been registered')) {
            errorMessage = 'This email address is already registered. Please try logging in instead.';
          }

          setError(errorMessage);
          return { data: null, error: { ...authError, message: errorMessage } };
        }

        console.log('Auth signup successful:', authData);
        console.log('Database trigger will automatically create user profile');

        // Return success - database trigger will handle profile creation
        return { data: authData, error: null };
      }
    } catch (error) {
      console.error('Exception during signup:', error);
      setError(error.message);
      return { data: null, error: { message: error.message } };
    } finally {
      setLoading(false);
    }
  };

// Sign in with email and password
const signIn = async (email, password) => {
  console.log('Signing in user:', email);
  setLoading(true);
  setError(null); // Reset any previous errors
  
  try {
    // First attempt direct sign in which is the most common case
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('Sign in error:', error);
      
      // If the error is invalid credentials, check if it might be due to missing profile
      if (error.message?.includes('Invalid login credentials')) {
        // Unfortunately we can't check auth.users directly from client code
        // But we can check if the error is specifically about missing profile vs wrong password
        console.log('Invalid credentials error - could be missing profile or wrong password');
      }
      
      setError(error);
      return { error };
    }
    
    // On successful login, ensure user exists in users table
    if (data?.user) {
      console.log('Sign in successful, checking user profile:', data.user.email);
      
      // Check if user profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error checking user profile:', profileError);
      }
      
      // If profile doesn't exist, create one with registration data
      if (!profileData && !profileError) {
        console.log('Creating user profile for:', data.user.email);

        // First try to create profile from auth metadata
        const profileResult = await ensureUserProfile(data.user.id, data.user.email);

        if (!profileResult.success) {
          console.error('Failed to create user profile:', profileResult.error);
          // Continue anyway since auth was successful
        } else {
          console.log('User profile created successfully via:', profileResult.method);
        }
      } else if (profileData) {
        // Profile exists, check if it's complete
        const isComplete = await checkProfileCompleteness(profileData);

        if (!isComplete) {
          console.log('Profile exists but incomplete, attempting to complete with metadata');

          // Try to complete the profile with auth metadata
          try {
            const { data: completionResult, error: completionError } = await supabase
              .rpc('create_user_profile_from_auth', { user_id: data.user.id });

            if (completionError) {
              console.warn('Profile completion failed:', completionError);
            } else if (completionResult) {
              console.log('Profile completion successful');
            }
          } catch (completionErr) {
            console.warn('Error during profile completion:', completionErr);
          }
        }
      }
      
      // Set user in state
      setUser(data.user);
      
      // Return success
      return { data, error: null };
    } else {
      console.error('Sign in response has no user data');
      setError('Invalid login response');
      return { data: null, error: { message: 'Invalid login response' } };
    }
  } catch (error) {
    console.error('Exception during sign in:', error);
    setError(error.message);
    return { data: null, error: { message: error.message } };
  } finally {
    setLoading(false);
  }
};

// Sign out
const signOut = async () => {
  try {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    setUser(null);
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error.message };
  } finally {
    setLoading(false);
  }
};

  // Request password reset
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Update user password
  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error updating password:', error);
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Resend confirmation email for unverified accounts
  const resendConfirmationEmail = async (email) => {
    try {
      setLoading(true);
      
      // Validate email domain - allow test domains in development
      const allowedDomains = ['@student.uitm.edu.my', '@example.com', '@test.local', '@mailhog.example', '@gmail.com', '@outlook.com', '@yahoo.com', '@hotmail.com'];
      const isValidDomain = allowedDomains.some(domain => email.endsWith(domain));

      if (!isValidDomain) {
        throw new Error('Only @student.uitm.edu.my email addresses are allowed (test domains: @example.com, @test.local, @mailhog.example, @gmail.com, @outlook.com, @yahoo.com, @hotmail.com)');
      }
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      
      return { error: null, message: 'Confirmation email sent successfully!' };
    } catch (error) {
      console.error('Error resending confirmation email:', error);
      return { error: error.message, message: null };
    } finally {
      setLoading(false);
    }
  };

  // Check if a user profile has complete registration data
  const checkProfileCompleteness = async (profile) => {
    try {
      // Check if essential fields are populated
      const isComplete = (
        profile.full_name && profile.full_name.trim() !== '' &&
        profile.student_id && profile.student_id.trim() !== '' &&
        profile.faculty && profile.faculty.trim() !== '' &&
        profile.sport_preferences &&
        Array.isArray(profile.sport_preferences) &&
        profile.sport_preferences.length > 0
      );

      console.log('Profile completeness check:', {
        userId: profile.id,
        hasFullName: !!(profile.full_name && profile.full_name.trim() !== ''),
        hasStudentId: !!(profile.student_id && profile.student_id.trim() !== ''),
        hasFaculty: !!(profile.faculty && profile.faculty.trim() !== ''),
        hasSportPreferences: !!(profile.sport_preferences && Array.isArray(profile.sport_preferences) && profile.sport_preferences.length > 0),
        isComplete
      });

      return isComplete;
    } catch (error) {
      console.error('Error checking profile completeness:', error);
      return false;
    }
  };

  // Enhanced profile creation with backup mechanism
  const ensureUserProfile = async (userId, email) => {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log('Profile already exists for user:', userId);

        // Check if it's complete
        const isComplete = await checkProfileCompleteness(existingProfile);

        if (isComplete) {
          return { success: true, created: false, complete: true };
        } else {
          console.log('Profile exists but incomplete, attempting to complete');

          // Try to complete with auth metadata
          const { data: completionResult, error: completionError } = await supabase
            .rpc('create_user_profile_from_auth', { user_id: userId });

          if (!completionError && completionResult) {
            return { success: true, created: false, complete: true, method: 'completion' };
          } else {
            console.warn('Profile completion failed:', completionError?.message);
            return { success: true, created: false, complete: false };
          }
        }
      }

      console.log('Profile not found, attempting to create for user:', userId);

      // Try to call the backup function first
      const { data: backupResult, error: backupError } = await supabase
        .rpc('create_user_profile_from_auth', { user_id: userId });

      if (!backupError && backupResult) {
        console.log('Profile created successfully via backup function');
        return { success: true, created: true, method: 'backup_function' };
      }

      console.warn('Backup function failed, creating basic profile:', backupError?.message);

      // Fallback: Create basic profile manually
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          username: email.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Failed to create basic profile:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log('Basic profile created successfully');
      return { success: true, created: true, method: 'manual_fallback' };

    } catch (error) {
      console.error('Error ensuring user profile:', error);
      return { success: false, error: error.message };
    }
  };

  // Provide auth context values
  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    resendConfirmationEmail, // Add the new function
    ensureUserProfile, // Add profile creation safeguard
    checkProfileCompleteness, // Add profile completeness checker
    supabase, // Expose supabase client for other DB operations
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// No default export, we'll use named exports consistently
