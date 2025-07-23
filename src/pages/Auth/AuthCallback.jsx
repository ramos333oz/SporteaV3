import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Container,
  Paper,
  Alert,
  Button
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

/**
 * Auth Callback page - handles redirects from email confirmations
 * This component processes email verification tokens and error states
 */
const AuthCallback = () => {
  const { supabase } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);

        // Parse URL parameters (both query and hash)
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        // Check for error parameters first
        const error = urlParams.get('error') || hashParams.get('error');
        const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

        if (error) {
          let errorMessage = 'Email verification failed';

          if (errorCode === 'otp_expired') {
            errorMessage = 'The verification link has expired. Please request a new verification email.';
          } else if (error === 'access_denied') {
            errorMessage = 'Email verification was denied or the link is invalid.';
          } else if (errorDescription) {
            errorMessage = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
          }

          throw new Error(errorMessage);
        }

        // Check for email verification parameters
        const tokenHash = urlParams.get('token_hash') || hashParams.get('token_hash');
        const type = urlParams.get('type') || hashParams.get('type');

        if (tokenHash && type) {
          // For email verification, we want to confirm the email without creating a session
          // This allows users to manually log in after verification
          if (type === 'email' || type === 'signup') {
            try {
              // Verify the token to confirm the email address
              const { data, error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: type
              });

              if (verifyError) {
                throw verifyError;
              }

              // Email verification successful - ensure profile completion before signing out
              if (data?.session) {
                console.log('🎯 Email verification successful, ensuring profile completion');
                console.log('📧 User ID:', data.user.id);
                console.log('📧 User Email:', data.user.email);

                // Attempt to ensure profile is complete with registration data
                let profileCreated = false;
                try {
                  console.log('🔧 Calling create_user_profile_from_auth function...');
                  const { data: profileResult, error: profileError } = await supabase
                    .rpc('create_user_profile_from_auth', { user_id: data.user.id });

                  if (profileError) {
                    console.error('❌ Profile completion failed during email verification:', profileError);
                    console.error('❌ Profile error details:', JSON.stringify(profileError, null, 2));
                  } else if (profileResult) {
                    console.log('✅ Profile completion successful during email verification');
                    profileCreated = true;
                  } else {
                    console.warn('⚠️ Profile function returned false - profile creation may have failed');
                  }
                } catch (profileErr) {
                  console.error('💥 Exception during profile completion:', profileErr);
                  console.error('💥 Profile exception details:', JSON.stringify(profileErr, null, 2));
                  // Continue with verification even if profile completion fails
                }

                // Verify profile was actually created by checking the database
                try {
                  console.log('🔍 Verifying profile exists in database...');
                  const { data: profileCheck, error: checkError } = await supabase
                    .from('users')
                    .select('id, full_name, student_id, faculty, sport_preferences')
                    .eq('id', data.user.id)
                    .single();

                  if (checkError) {
                    console.error('❌ Profile verification failed:', checkError);
                  } else if (profileCheck) {
                    console.log('✅ Profile verified in database:', {
                      id: profileCheck.id,
                      full_name: profileCheck.full_name,
                      student_id: profileCheck.student_id,
                      faculty: profileCheck.faculty,
                      has_sports: profileCheck.sport_preferences?.length > 0
                    });
                    profileCreated = true;
                  } else {
                    console.error('❌ No profile found in database after creation attempt');
                  }
                } catch (verifyErr) {
                  console.error('💥 Exception during profile verification:', verifyErr);
                }

                // Log final profile creation status
                if (profileCreated) {
                  console.log('🎉 Profile creation and verification completed successfully');
                } else {
                  console.error('🚨 Profile creation failed - user may experience issues after login');
                }

                // Now sign out to require manual login
                console.log('🚪 Signing out to require manual login');
                await supabase.auth.signOut();
                console.log('✅ Sign out completed');
              }

              setSuccess(true);
              console.log('🎉 Email verification process completed successfully');

              // Wait a moment to show success message, then redirect to login
              setTimeout(() => {
                console.log('🔄 Redirecting to login page...');
                navigate('/login', {
                  replace: true,
                  state: {
                    message: 'Email verified successfully! Your profile has been created. You can now log in.',
                    type: 'success'
                  }
                });
              }, 2000);
              return;

            } catch (err) {
              console.error('Email verification error:', err);
              throw err;
            }
          } else {
            // For other types (like password reset), use normal flow
            const { data, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type
            });

            if (verifyError) {
              throw verifyError;
            }

            if (data?.session) {
              console.log('OTP verification successful, session created');
              setSuccess(true);

              // For non-email verification, redirect to home
              setTimeout(() => {
                navigate('/home', { replace: true });
              }, 2000);
              return;
            }
          }
        }

        // Fallback: Check for legacy hash-based tokens (OAuth flow)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Handle OAuth callback with access tokens
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            throw sessionError;
          }

          console.log('OAuth session created successfully');
          navigate('/home', { replace: true });
          return;
        }

        // If no valid parameters found
        throw new Error('No valid verification parameters found in URL. Please check your email and click the verification link again.');

      } catch (err) {
        console.error('Error processing auth callback:', err);
        setError(err.message || 'An unexpected error occurred during verification.');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, supabase.auth]);
  
  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  const handleResendVerification = () => {
    navigate('/register', {
      replace: true,
      state: { resendVerification: true }
    });
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper
        elevation={3}
        sx={{
          marginTop: 8,
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
            <CircularProgress color="primary" sx={{ mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>
              Verifying your email...
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
              Please wait while we verify your email address.
            </Typography>
          </Box>
        ) : success ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
            <Box sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2
            }}>
              <Typography variant="h4" color="white">✓</Typography>
            </Box>
            <Typography variant="h5" sx={{ mb: 2, textAlign: 'center', color: 'success.main' }}>
              Email Verified Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
              Your email has been verified. Redirecting you to the login page...
            </Typography>
            <CircularProgress size={24} color="success" />
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
            <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Verification Failed
              </Typography>
              {error}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleRetry}
                sx={{ minWidth: 120 }}
              >
                Go to Login
              </Button>

              {error.includes('expired') && (
                <Button
                  variant="outlined"
                  onClick={handleResendVerification}
                  sx={{ minWidth: 120 }}
                >
                  Resend Email
                </Button>
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              Need help? Contact support or try registering again.
            </Typography>
          </Box>
        ) : null}
      </Paper>
    </Container>
  );
};

export default AuthCallback;
