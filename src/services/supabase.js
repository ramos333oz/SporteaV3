import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// User-related queries
export const userService = {
  // Get user profile by id
  getProfile: async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  // Update user profile
  updateProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
    return data;
  },
  
  // Get user's sports preferences
  getSportPreferences: async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('sport_preferences')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data.sport_preferences;
  }
};

// Match-related queries
// Function to check if a user exists in the public.users table
export const checkUserExists = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Check if the user exists in the public users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', userId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking if user exists:', checkError);
      throw checkError;
    }
    
    return existingUser || null;
  } catch (error) {
    console.error('Error in checkUserExists:', error);
    throw error;
  }
};

export const matchService = {
  // Create a new match
  createMatch: async (matchData) => {
    try {
      // Log input data for debugging
      console.log('Creating match with initial data:', matchData);
      
      // Validate required fields
      const requiredFields = ['title', 'sport_id', 'host_id', 'location_id', 'start_time', 'end_time'];
      for (const field of requiredFields) {
        if (!matchData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Get the current authenticated user
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        throw new Error('You must be logged in to create a match');
      }
      
      // Ensure we're using the current authenticated user's ID as host_id
      // This is critical for RLS policies to work properly
      const host_id = authData.user.id;
      
      // If the provided host_id doesn't match the authenticated user, that's a problem
      if (matchData.host_id !== host_id) {
        console.warn(`Provided host_id (${matchData.host_id}) doesn't match authenticated user (${host_id}). Using authenticated user.`);
        matchData.host_id = host_id;
      }
      
      // Check if the user profile exists in the public.users table
      const hostUser = await checkUserExists(host_id);
      if (!hostUser) {
        console.warn(`User profile for ${host_id} not found in users table. Attempting to create profile first...`);
        
        try {
          // Get user data from auth
          const userEmail = authData.user.email;
          const username = userEmail.split('@')[0];
          
          // Create basic profile - this should work due to RLS policy allowing users to create their own profile
          const { error: profileError } = await supabase
            .from('users')
            .upsert({
              id: host_id,
              email: userEmail,
              username: username,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (profileError) {
            console.error('Error creating user profile:', profileError);
            throw new Error('Unable to create user profile. Please try logging out and signing in again.');
          }
          
          console.log('Created user profile successfully');
        } catch (profileError) {
          console.error('Failed to create user profile:', profileError);
          throw new Error('Your user profile could not be created. Please contact support.');
        }
      } else {
        console.log(`Host user ${host_id} found in database:`, hostUser);
      }
      
      // Handle sport_id - convert from string sport name to UUID
      let sport_id = matchData.sport_id;
      if (sport_id && typeof sport_id === 'string' && !sport_id.includes('-')) {
        const { data: sportData } = await supabase
          .from('sports')
          .select('id')
          .ilike('name', sport_id)
          .single();
          
        if (sportData && sportData.id) {
          sport_id = sportData.id;
          console.log(`Mapped sport name "${matchData.sport_id}" to UUID: ${sport_id}`);
        } else {
          // Try an exact match as fallback
          const { data: exactSportData } = await supabase
            .from('sports')
            .select('id')
            .eq('name', sport_id)
            .single();
            
          if (exactSportData && exactSportData.id) {
            sport_id = exactSportData.id;
            console.log(`Mapped sport name "${matchData.sport_id}" to UUID (exact match): ${sport_id}`);
          } else {
            console.error(`Could not find sport with name: ${matchData.sport_id}`);
            throw new Error(`Sport with name '${matchData.sport_id}' not found in database`);
          }
        }
      }
      
      // Handle location_id properly
      // In our application, location_id should be a UUID string
      // If we have a location object with an id property, use that directly
      let location_id = matchData.location_id;
      
      // If we received a location object rather than a direct ID
      if (matchData.location && typeof matchData.location === 'object' && matchData.location.id) {
        location_id = matchData.location.id;
        console.log(`Using location ID from location object: ${location_id}`);
      }
      
      // Verify the location exists in the database
      if (location_id) {
        const { data: locationExists, error: locationError } = await supabase
          .from('locations')
          .select('id')
          .eq('id', location_id)
          .maybeSingle();
        
        if (locationError) {
          console.error('Error checking location:', locationError);
        }
        
        if (!locationExists) {
          console.log('Fetching all locations to find a valid one...');
          // If location doesn't exist, get the first available location
          const { data: anyLocation } = await supabase
            .from('locations')
            .select('id')
            .limit(1)
            .single();
            
          if (anyLocation && anyLocation.id) {
            location_id = anyLocation.id;
            console.log(`Using first available location: ${location_id}`);
          } else {
            console.error('No locations found in database');
            throw new Error('No valid locations found in database. Please add locations first.');
          }
        } else {
          console.log(`Verified location ID exists: ${location_id}`);
        }
      } else {
        console.error('No location_id provided');
        throw new Error('A valid location ID is required to create a match');
      }
      
      // Make sure all fields are of correct type and remove non-existent fields
      const { court_name, duration_minutes, min_participants, ...dataWithoutExtraFields } = matchData;
      
      // If there is a court_name, add it to the description field
      let description = matchData.description || '';
      if (court_name) {
        description = description ? `${description} (${court_name})` : `Court: ${court_name}`;
      }
      
      // Prepare clean data for Supabase
      const cleanedData = {
        ...dataWithoutExtraFields,
        description,
        sport_id,
        location_id,
        max_participants: parseInt(matchData.max_participants, 10) || 10,
        skill_level: matchData.skill_level || 'Intermediate',
        is_private: matchData.is_private === true || matchData.is_private === 'true'
      };
      
      // Make sure dates are in ISO format
      if (cleanedData.start_time && !(cleanedData.start_time instanceof Date) && typeof cleanedData.start_time !== 'string') {
        cleanedData.start_time = new Date(cleanedData.start_time).toISOString();
      } else if (cleanedData.start_time instanceof Date) {
        cleanedData.start_time = cleanedData.start_time.toISOString();
      }
      
      if (cleanedData.end_time && !(cleanedData.end_time instanceof Date) && typeof cleanedData.end_time !== 'string') {
        cleanedData.end_time = new Date(cleanedData.end_time).toISOString();
      } else if (cleanedData.end_time instanceof Date) {
        cleanedData.end_time = cleanedData.end_time.toISOString();
      }
      
      // Log the cleaned data
      console.log('Sending to Supabase (cleaned):', cleanedData);
      
      // Create the match
      const { data, error } = await supabase
        .from('matches')
        .insert([cleanedData])
        .select()
        .single();
        
      if (error) {
        console.error('Supabase error creating match:', error);
        throw error;
      }
      
      console.log('Match created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in createMatch:', error);
      throw error;
    }
  },
  
  // Get match by id
  getMatch: async (matchId) => {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        sport:sports(*),
        host:users!host_id(*),
        location:locations(*),
        participants(*, user:users(*))
      `)
      .eq('id', matchId)
      .single();
    
    if (error) throw error;
    return data;
  },
  
  // Get matches hosted by a user
  getHostedMatches: async (userId, status = null) => {
    let query = supabase
      .from('matches')
      .select(`
        *,
        sport:sports(*),
        location:locations(*),
        participants(count)
      `)
      .eq('host_id', userId)
      .order('start_time', { ascending: true });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },
  
  // Get matches a user is participating in
  getJoinedMatches: async (userId, status = null) => {
    let query = supabase
      .from('participants')
      .select(`
        status,
        match:matches(
          *,
          sport:sports(*),
          host:users!host_id(*),
          location:locations(*)
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'confirmed');
    
    if (status) {
      query = query.eq('match.status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data.map(item => ({
      ...item.match,
      participation_status: item.status
    }));
  },
  
  // Update match details
  updateMatch: async (matchId, updates) => {
    const { data, error } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', matchId)
      .select();
    
    if (error) throw error;
    return data;
  },
  
  // Cancel a match
  cancelMatch: async (matchId) => {
    return await matchService.updateMatch(matchId, { status: 'cancelled' });
  },
  
  // Search for matches
  searchMatches: async (filters) => {
    let query = supabase
      .from('matches')
      .select(`
        *,
        sport:sports(*),
        host:users!host_id(*),
        location:locations(*),
        participants(count)
      `)
      .eq('status', 'upcoming')
      .eq('is_private', false)
      .order('start_time', { ascending: true });
    
    // Apply filters if provided
    if (filters.sportId) {
      query = query.eq('sport_id', filters.sportId);
    }
    
    if (filters.location) {
      query = query.eq('location.campus', filters.location);
    }
    
    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString());
    }
    
    if (filters.skillLevel) {
      query = query.eq('skill_level', filters.skillLevel);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }
};

// Participant-related queries
export const participantService = {
  // Check if a match has available spots
  checkMatchAvailability: async (matchId) => {
    try {
      // Get match details including max participants
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('max_participants, is_private, access_code, status')
        .eq('id', matchId)
        .single();
      
      if (matchError) throw matchError;
      
      // Check if match is cancelled or completed
      if (match.status === 'cancelled' || match.status === 'completed') {
        return { available: false, reason: `Match is ${match.status}` };
      }
      
      // Get current participant count
      const { count, error: countError } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', matchId)
        .eq('status', 'confirmed');
      
      if (countError) throw countError;
      
      // Check if match is full
      if (count >= match.max_participants) {
        return { available: false, reason: 'Match is full' };
      }
      
      // If match is private, we'll need to verify access code later
      const requiresCode = match.is_private;
      
      return { 
        available: true, 
        requiresCode,
        spotsLeft: match.max_participants - count
      };
    } catch (error) {
      console.error('Error checking match availability:', error);
      throw error;
    }
  },
  
  // Check if user is already a participant in a match
  checkParticipationStatus: async (matchId, userId) => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('status')
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      return data ? { isParticipant: true, status: data.status } : { isParticipant: false };
    } catch (error) {
      console.error('Error checking participation status:', error);
      throw error;
    }
  },
  
  // Join a match
  joinMatch: async (matchId, userId, accessCode = null) => {
    try {
      // Check if match is available
      const { available, requiresCode, reason, spotsLeft } = await participantService.checkMatchAvailability(matchId);
      
      if (!available) {
        throw new Error(reason || 'This match is not available for joining');
      }
      
      // If match is private, verify access code
      if (requiresCode) {
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .select('access_code')
          .eq('id', matchId)
          .single();
          
        if (matchError) throw matchError;
        
        if (!accessCode || accessCode !== match.access_code) {
          throw new Error('Invalid access code for private match');
        }
      }
      
      // Check if user is already participating
      const { isParticipant, status } = await participantService.checkParticipationStatus(matchId, userId);
      
      if (isParticipant) {
        if (status === 'confirmed' || status === 'pending') {
          return { alreadyJoined: true, status, message: `You have already ${status === 'confirmed' ? 'joined' : 'requested to join'} this match` };
        } else if (status === 'declined' || status === 'left') {
          // If previously declined or left, update the status instead of creating a new record
          const { data, error } = await supabase
            .from('participants')
            .update({ status: 'pending', joined_at: new Date().toISOString() })
            .eq('match_id', matchId)
            .eq('user_id', userId)
            .select();
            
          if (error) throw error;
          return { success: true, data, message: 'Successfully requested to join match again' };
        }
      }
      
      // Create new participant record
      const { data, error } = await supabase
        .from('participants')
        .insert({
          match_id: matchId,
          user_id: userId,
          status: 'pending',  // Default to pending, requires host approval
          joined_at: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      
      return { success: true, data, message: 'Successfully requested to join match' };
    } catch (error) {
      console.error('Error joining match:', error);
      throw error;
    }
  },
  
  // Leave a match
  leaveMatch: async (matchId, userId) => {
    try {
      // First check if the user is actually in the match
      const { isParticipant } = await participantService.checkParticipationStatus(matchId, userId);
      
      if (!isParticipant) {
        throw new Error('You are not a participant in this match');
      }
      
      // Update participant status to 'left' instead of deleting
      // This keeps participation history for potential analytics
      const { data, error } = await supabase
        .from('participants')
        .update({ status: 'left' })
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .select();
        
      if (error) throw error;
      
      return { success: true, data, message: 'Successfully left the match' };
    } catch (error) {
      console.error('Error leaving match:', error);
      throw error;
    }
  },
  
  // Update participant status
  updateStatus: async (matchId, userId, status) => {
    const { data, error } = await supabase
      .from('participants')
      .update({ status })
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .select();
    
    if (error) throw error;
    return data;
  },
  
  // Get participants for a match
  getParticipants: async (matchId, status = null) => {
    let query = supabase
      .from('participants')
      .select(`
        *,
        user:users(*)
      `)
      .eq('match_id', matchId);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }
};

// Sports-related queries
export const sportService = {
  // Get all sports
  getAllSports: async () => {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },
  
  // Get sport by id
  getSport: async (sportId) => {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .eq('id', sportId)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Location-related queries
export const locationService = {
  // Get all locations
  getAllLocations: async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },
  
  // Get locations by campus
  getLocationsByCampus: async (campus) => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('campus', campus)
      .order('name');
    
    if (error) throw error;
    return data;
  },
  
  // Create a new location (for user-suggested locations)
  createLocation: async (locationData) => {
    const { data, error } = await supabase
      .from('locations')
      .insert(locationData)
      .select();
    
    if (error) throw error;
    return data;
  }
};

export { supabase };
