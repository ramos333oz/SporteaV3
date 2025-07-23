-- Migration: Fix Profile Creation from Auth Metadata
-- This migration ensures reliable profile creation with registration data

-- Enhanced function to create or update user profiles from auth metadata
CREATE OR REPLACE FUNCTION public.create_user_profile_from_auth(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user RECORD;
    user_metadata jsonb;
    sport_prefs jsonb;
    available_days jsonb;
    available_hours jsonb;
    preferred_facilities jsonb;
    time_prefs jsonb;
    skill_levels jsonb;
    existing_profile RECORD;
    profile_is_complete BOOLEAN := FALSE;
BEGIN
    -- Get auth user data
    SELECT * INTO auth_user FROM auth.users WHERE id = user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auth user not found: %', user_id;
    END IF;
    
    user_metadata := auth_user.raw_user_meta_data;
    
    -- Check if profile exists and if it's complete
    SELECT * INTO existing_profile FROM users WHERE id = user_id;
    
    IF FOUND THEN
        -- Check if profile has complete registration data
        profile_is_complete := (
            existing_profile.full_name IS NOT NULL AND existing_profile.full_name != '' AND
            existing_profile.student_id IS NOT NULL AND existing_profile.student_id != '' AND
            existing_profile.faculty IS NOT NULL AND existing_profile.faculty != '' AND
            existing_profile.sport_preferences IS NOT NULL AND 
            jsonb_array_length(existing_profile.sport_preferences) > 0
        );
        
        IF profile_is_complete THEN
            RAISE NOTICE 'Profile already complete for user %', user_id;
            RETURN TRUE;
        END IF;
        
        RAISE NOTICE 'Profile exists but incomplete for user %, updating with metadata', user_id;
    ELSE
        RAISE NOTICE 'No profile found for user %, creating new profile', user_id;
    END IF;
    
    -- Handle case where no metadata exists
    IF user_metadata IS NULL OR user_metadata = '{}'::jsonb THEN
        RAISE NOTICE 'No metadata found for user %, creating basic profile', user_id;
        
        INSERT INTO users (id, email, username, created_at, updated_at)
        VALUES (
            user_id,
            auth_user.email,
            split_part(auth_user.email, '@', 1),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            username = COALESCE(users.username, EXCLUDED.username),
            updated_at = NOW();
            
        RETURN TRUE;
    END IF;
    
    RAISE NOTICE 'Processing profile for user % with metadata: %', user_id, user_metadata;
    
    -- Parse JSON data safely
    BEGIN
        -- Handle sport_preferences
        IF user_metadata ? 'sport_preferences' THEN
            IF jsonb_typeof(user_metadata->'sport_preferences') = 'string' THEN
                sport_prefs := (user_metadata->>'sport_preferences')::jsonb;
            ELSE
                sport_prefs := user_metadata->'sport_preferences';
            END IF;
        ELSE
            sport_prefs := '[]'::jsonb;
        END IF;
        
        -- Handle available_days
        IF user_metadata ? 'available_days' THEN
            IF jsonb_typeof(user_metadata->'available_days') = 'string' THEN
                available_days := (user_metadata->>'available_days')::jsonb;
            ELSE
                available_days := user_metadata->'available_days';
            END IF;
        ELSE
            available_days := '[]'::jsonb;
        END IF;
        
        -- Handle available_hours
        IF user_metadata ? 'available_hours' THEN
            IF jsonb_typeof(user_metadata->'available_hours') = 'string' THEN
                available_hours := (user_metadata->>'available_hours')::jsonb;
            ELSE
                available_hours := user_metadata->'available_hours';
            END IF;
        ELSE
            available_hours := '{}'::jsonb;
        END IF;
        
        -- Handle preferred_facilities
        IF user_metadata ? 'preferred_facilities' THEN
            IF jsonb_typeof(user_metadata->'preferred_facilities') = 'string' THEN
                preferred_facilities := (user_metadata->>'preferred_facilities')::jsonb;
            ELSE
                preferred_facilities := user_metadata->'preferred_facilities';
            END IF;
        ELSE
            preferred_facilities := '[]'::jsonb;
        END IF;
        
        -- Handle time_preferences
        IF user_metadata ? 'time_preferences' THEN
            IF jsonb_typeof(user_metadata->'time_preferences') = 'string' THEN
                time_prefs := (user_metadata->>'time_preferences')::jsonb;
            ELSE
                time_prefs := user_metadata->'time_preferences';
            END IF;
        ELSE
            time_prefs := '{}'::jsonb;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to parse JSON metadata for user %: %', user_id, SQLERRM;
        sport_prefs := '[]'::jsonb;
        available_days := '[]'::jsonb;
        available_hours := '{}'::jsonb;
        preferred_facilities := '[]'::jsonb;
        time_prefs := '{}'::jsonb;
    END;
    
    -- Create skill levels based on sports preferences
    skill_levels := '{}';
    IF jsonb_array_length(sport_prefs) > 0 THEN
        SELECT jsonb_object_agg(sport, 'beginner')
        INTO skill_levels
        FROM jsonb_array_elements_text(sport_prefs) AS sport;
    END IF;

    -- Insert or update user profile with comprehensive data
    INSERT INTO users (
        id,
        email,
        username,
        full_name,
        student_id,
        faculty,
        campus,
        gender,
        play_style,
        sport_preferences,
        available_days,
        available_hours,
        preferred_facilities,
        time_preferences,
        skill_levels,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        auth_user.email,
        COALESCE(user_metadata->>'username', split_part(auth_user.email, '@', 1)),
        user_metadata->>'full_name',
        user_metadata->>'student_id',
        user_metadata->>'faculty',
        user_metadata->>'campus',
        user_metadata->>'gender',
        COALESCE(user_metadata->>'play_style', 'casual'),
        sport_prefs,
        available_days,
        available_hours,
        preferred_facilities,
        time_prefs,
        skill_levels,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = COALESCE(users.username, EXCLUDED.username),
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        student_id = COALESCE(EXCLUDED.student_id, users.student_id),
        faculty = COALESCE(EXCLUDED.faculty, users.faculty),
        campus = COALESCE(EXCLUDED.campus, users.campus),
        gender = COALESCE(EXCLUDED.gender, users.gender),
        play_style = COALESCE(EXCLUDED.play_style, users.play_style),
        sport_preferences = CASE
            WHEN EXCLUDED.sport_preferences IS NOT NULL AND jsonb_array_length(EXCLUDED.sport_preferences) > 0
            THEN EXCLUDED.sport_preferences
            ELSE users.sport_preferences
        END,
        available_days = CASE
            WHEN EXCLUDED.available_days IS NOT NULL AND jsonb_array_length(EXCLUDED.available_days) > 0
            THEN EXCLUDED.available_days
            ELSE users.available_days
        END,
        available_hours = CASE
            WHEN EXCLUDED.available_hours IS NOT NULL AND EXCLUDED.available_hours != '{}'::jsonb
            THEN EXCLUDED.available_hours
            ELSE users.available_hours
        END,
        preferred_facilities = CASE
            WHEN EXCLUDED.preferred_facilities IS NOT NULL AND jsonb_array_length(EXCLUDED.preferred_facilities) > 0
            THEN EXCLUDED.preferred_facilities
            ELSE users.preferred_facilities
        END,
        time_preferences = CASE
            WHEN EXCLUDED.time_preferences IS NOT NULL AND EXCLUDED.time_preferences != '{}'::jsonb
            THEN EXCLUDED.time_preferences
            ELSE users.time_preferences
        END,
        skill_levels = CASE
            WHEN EXCLUDED.skill_levels IS NOT NULL AND EXCLUDED.skill_levels != '{}'::jsonb
            THEN EXCLUDED.skill_levels
            ELSE users.skill_levels
        END,
        updated_at = NOW();

    RAISE NOTICE 'Successfully created/updated profile for user %', user_id;
    RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create/update profile for user %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to handle email verification and ensure profile completion
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only proceed if email_confirmed_at was just set (changed from NULL to a timestamp)
    IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
        RAISE NOTICE 'Email verified for user %, ensuring profile completion', NEW.id;

        -- Attempt to create/update profile from auth metadata
        PERFORM public.create_user_profile_from_auth(NEW.id);
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for email verification
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
CREATE TRIGGER on_email_verified
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_email_verification();

-- Function to check if a user profile is complete
CREATE OR REPLACE FUNCTION public.is_user_profile_complete(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile RECORD;
BEGIN
    SELECT * INTO profile FROM users WHERE id = user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check if all essential fields are populated
    RETURN (
        profile.full_name IS NOT NULL AND profile.full_name != '' AND
        profile.student_id IS NOT NULL AND profile.student_id != '' AND
        profile.faculty IS NOT NULL AND profile.faculty != '' AND
        profile.sport_preferences IS NOT NULL AND
        jsonb_array_length(profile.sport_preferences) > 0
    );
END;
$$;

-- Function to fix existing incomplete profiles (one-time utility)
CREATE OR REPLACE FUNCTION public.fix_incomplete_profiles()
RETURNS TABLE(user_id UUID, email TEXT, fixed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    incomplete_user RECORD;
    fix_result BOOLEAN;
BEGIN
    -- Find users with incomplete profiles who have auth metadata
    FOR incomplete_user IN
        SELECT
            au.id,
            au.email,
            au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN users u ON au.id = u.id
        WHERE au.email_confirmed_at IS NOT NULL
        AND (
            u.id IS NULL OR
            u.full_name IS NULL OR u.full_name = '' OR
            u.student_id IS NULL OR u.student_id = '' OR
            u.faculty IS NULL OR u.faculty = '' OR
            u.sport_preferences IS NULL OR
            jsonb_array_length(u.sport_preferences) = 0
        )
        AND au.raw_user_meta_data IS NOT NULL
        AND au.raw_user_meta_data != '{}'::jsonb
    LOOP
        -- Attempt to fix the profile
        SELECT public.create_user_profile_from_auth(incomplete_user.id) INTO fix_result;

        -- Return the result
        user_id := incomplete_user.id;
        email := incomplete_user.email;
        fixed := fix_result;
        RETURN NEXT;
    END LOOP;

    RETURN;
END;
$$;
