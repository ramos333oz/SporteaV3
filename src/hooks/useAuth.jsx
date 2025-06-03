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
      
      // Validate email domain
      if (!email.endsWith('@student.uitm.edu.my')) {
        const error = new Error('Only @student.uitm.edu.my email addresses are allowed');
        setError(error.message);
        return { data: null, error };
      }

      console.log('Signing up user with email:', email);
      
      // First check if user already exists in auth
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle();
        
      if (existingUser) {
        const error = new Error('User with this email already exists');
        setError(error.message);
        return { data: null, error };
      }
      
      // Create auth user
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
        setError(authError.message);
        return { data: null, error: authError };
      }
      
      console.log('Auth signup successful:', authData);
      
      // Create user profile in users table
      if (authData?.user) {
        console.log('Creating user profile for:', authData.user.email);
        
        // Create a clean user data object with all required fields
        const userProfile = {
          id: authData.user.id,
          email: authData.user.email,
          username: userData.username || email.split('@')[0], // Fallback to email prefix if no username
          full_name: userData.full_name || '',
          student_id: userData.student_id || '',
          faculty: userData.faculty || '',
          campus: userData.campus || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // First attempt with service role client (bypasses RLS)
        try {
          // Using custom endpoint approach
          await fetch(`${window.location.origin}/api/create-user-profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userProfile),
          }).then(response => {
            if (!response.ok) {
              throw new Error(`API response: ${response.status}`);
            }
            return response.json();
          });
          
          console.log('User profile created successfully via API endpoint');
        } catch (apiError) {
          console.error('Error creating user profile via API endpoint:', apiError);
          
          // Fallback to direct insert (will likely fail due to RLS)
          console.log('Attempting direct insert as fallback');
          const { error: profileError } = await supabase
            .from('users')
            .insert(userProfile);
          
          if (profileError) {
            console.error('Error creating user profile:', profileError);
            
            // Try upsert as a last resort
            console.log('Attempting upsert as last resort');
            const { error: upsertError } = await supabase
              .from('users')
              .upsert(userProfile);
              
            if (upsertError) {
              console.error('Error upserting user profile:', upsertError);
              // Note: We don't throw here because the auth user was created successfully
              // Instead, we'll alert the user about the partial success
              return { 
                data: authData, 
                error: { 
                  message: 'Account created but profile setup failed. Please logout and login again to activate your account.', 
                  originalError: upsertError 
                } 
              };
            } else {
              console.log('User profile created successfully via upsert');
            }
          } else {
            console.log('User profile created successfully via direct insert');
          }
        }
        
        // Double-check that the profile was actually created
        const { data: checkProfile } = await supabase
          .from('users')
          .select('id, email, username')
          .eq('id', authData.user.id)
          .maybeSingle();
          
        if (!checkProfile) {
          console.warn('User profile creation verification failed - profile may not exist');
          return { 
            data: authData, 
            warning: 'Your account was created but the profile setup may not be complete. Please contact support if you encounter issues.'
          };
        }
        
        console.log('User profile verified:', checkProfile);
      } else {
        console.warn('Auth succeeded but no user data returned');
      }
      
      // Set a specific message for email verification
      if (authData?.user && !authData.user.email_confirmed_at) {
        return { 
          data: authData, 
          message: 'Please check your email to verify your account before logging in.' 
        };
      }
      
      return { data: authData, error: null };
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
      
      // If profile doesn't exist, create one with basic info
      if (!profileData && !profileError) {
        console.log('Creating user profile for:', data.user.email);
        
        // Attempt insert first
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username: data.user.email.split('@')[0], // Basic username from email
            created_at: new Date().toISOString()
          });
          
        if (insertError) {
          console.error('Error creating user profile:', insertError);
          
          // If insert fails, try upsert as a fallback
          console.log('Attempting upsert as fallback for profile creation');
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: data.user.id,
              email: data.user.email,
              username: data.user.email.split('@')[0], // Basic username from email
              created_at: new Date().toISOString()
            });
            
          if (upsertError) {
            console.error('Error upserting user profile:', upsertError);
            // Continue anyway since auth was successful
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
      
      // Validate email domain
      if (!email.endsWith('@student.uitm.edu.my')) {
        throw new Error('Only @student.uitm.edu.my email addresses are allowed');
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
