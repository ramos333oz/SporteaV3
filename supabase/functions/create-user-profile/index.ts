import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, parseRequestBody, errorResponse, successResponse } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // Parse request body
    const userProfile = await parseRequestBody(req)
    
    console.log('Creating user profile:', userProfile)

    // Validate required fields
    if (!userProfile.id || !userProfile.email) {
      return errorResponse('Missing required fields: id and email')
    }

    // Create user profile in the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userProfile.id,
        email: userProfile.email,
        username: userProfile.username || userProfile.email.split('@')[0],
        full_name: userProfile.full_name || '',
        student_id: userProfile.student_id || '',
        faculty: userProfile.faculty || '',
        campus: userProfile.campus || '',
        gender: userProfile.gender || '',
        play_style: userProfile.play_style || 'casual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user profile:', userError)
      return errorResponse(`Failed to create user profile: ${userError.message}`, 500)
    }

    console.log('User profile created successfully:', userData)

    // Create user preferences if provided
    if (userProfile.sports_preferences || userProfile.skill_levels || userProfile.preferred_locations) {
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userProfile.id,
          sports_preferences: userProfile.sports_preferences || [],
          skill_levels: userProfile.skill_levels || {},
          preferred_locations: userProfile.preferred_locations || [],
          preferred_times: userProfile.preferred_times || [],
          age_preference_min: userProfile.age_preference_min || 18,
          age_preference_max: userProfile.age_preference_max || 50,
          duration_preference_min: userProfile.duration_preference_min || 30,
          duration_preference_max: userProfile.duration_preference_max || 180,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (preferencesError) {
        console.warn('Error creating user preferences:', preferencesError)
        // Don't fail the entire operation if preferences creation fails
      } else {
        console.log('User preferences created successfully')
      }
    }

    // Verify that the gamification record was created by the trigger
    const { data: gamificationData } = await supabase
      .from('user_gamification')
      .select('*')
      .eq('user_id', userProfile.id)
      .single()

    if (!gamificationData) {
      console.warn('Gamification record not found, trigger may have failed')
    } else {
      console.log('Gamification record verified:', gamificationData)
    }

    return successResponse({
      message: 'User profile created successfully',
      user: userData,
      gamification: gamificationData
    })

  } catch (error) {
    console.error('Error in create-user-profile function:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})
