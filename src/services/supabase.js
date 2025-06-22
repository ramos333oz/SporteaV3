import { createClient } from '@supabase/supabase-js';
import { notificationService, createNotificationContent } from './notifications';

// Initialize Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Project reference for direct WebSocket connection
const projectRef = 'fcwwuiitsghknsvnsrxp'; // Sporteav2 project reference

// Validate and normalize Supabase URL
let normalizedSupabaseUrl = supabaseUrl;

// Ensure supabaseUrl is properly formatted with https:// prefix
if (normalizedSupabaseUrl && !normalizedSupabaseUrl.startsWith('http')) {
  normalizedSupabaseUrl = `https://${normalizedSupabaseUrl}`;
  console.log('Normalized Supabase URL to:', normalizedSupabaseUrl);
}

// Extract project ref from URL if possible
let extractedProjectRef = null;
try {
  extractedProjectRef = normalizedSupabaseUrl.match(/https:\/\/([^\.]+)\./)?.[1];
  if (extractedProjectRef) {
    console.log('Extracted project ref from URL:', extractedProjectRef);
  }
} catch (error) {
  console.warn('Could not extract project ref from URL', error);
}

// Use extracted project ref or fallback to known ref
const finalProjectRef = extractedProjectRef || projectRef;

// Format WebSocket URLs properly to ensure connection works
// Must include API key and version as query parameters directly in the URL
const wsUrl = `wss://${finalProjectRef}.supabase.co/realtime/v1/websocket?apikey=${supabaseAnonKey}&vsn=1.0.0`;

// Validate environment variables to prevent connection issues
if (!normalizedSupabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Log the WebSocket URL for debugging
console.log('WebSocket URL for realtime connection:', wsUrl);

// Enhanced options for realtime WebSocket connections with more aggressive retry settings
const realtimeOptions = {
  eventsPerSecond: 10,
  db: {
    schema: 'public'
  },
  heartbeatIntervalMs: 60000, // Increased to 60 seconds for better stability
  autoRefreshToken: true,
  persistSession: true,
  retryAfterIntervalMs: 10000,  // Increased to 10 seconds
  maxRetryAttempts: 20,         // Doubled retry attempts
  maxReconnectionAttempts: 30   // Double reconnection attempts
};

// Log realtime options for debugging
console.log('Realtime options:', { 
  wsUrl,
  heartbeat: realtimeOptions.heartbeatIntervalMs,
  retries: realtimeOptions.maxRetryAttempts,
  reconnects: realtimeOptions.maxReconnectionAttempts
});

// Initialize Supabase client with enhanced WebSocket configuration
// Ensure we create a robust instance that can handle network instability
const supabase = createClient(normalizedSupabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Handle redirects with session info automatically
    storageKey: 'sportea_auth' // Use a custom storage key to avoid conflicts
  },
  realtime: {
    // Main realtime config
    heartbeatIntervalMs: realtimeOptions.heartbeatIntervalMs,
    eventsPerSecond: realtimeOptions.eventsPerSecond,
    maxReconnectionAttempts: realtimeOptions.maxReconnectionAttempts,
    retryAfterIntervalMs: realtimeOptions.retryAfterIntervalMs,
    
    // Explicitly configured WebSocket
    websocket: {
      url: wsUrl,
      params: {
        apikey: supabaseAnonKey,
        vsn: '1.0.0', // Add version parameter
      },
      // Add event handlers for WebSocket lifecycle
      connectParams: {
        token: supabaseAnonKey
      },
      heartbeatIntervalMs: realtimeOptions.heartbeatIntervalMs,
      reconnectAfterMs: (tries) => {
        // Exponential backoff with jitter
        return (Math.min(10000, 1000 * Math.pow(2, tries)) + 
                (Math.random() * 1000));
      },
      logger: (kind, msg, data) => {
        console.log(`[Supabase WebSocket] [${kind}] ${msg}`, data);
      }
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'sportea-v3'
    }
  }
});

// Initialize realtime connection on client creation
if (supabase.realtime && typeof supabase.realtime.connect === 'function') {
  // Small delay to ensure proper initialization
  setTimeout(() => {
    try {
      console.log('[Supabase] Connecting to realtime service...');
      supabase.realtime.connect();
      
      // Verify connection after a short delay
      setTimeout(() => {
        const isConnected = verifyRealtimeConnection();
        if (isConnected) {
          console.log('[Supabase] Successfully connected to realtime service');
        } else {
          console.warn('[Supabase] Realtime connection may not be established properly');
        }
      }, 2000);
      
    } catch (error) {
      console.error('[Supabase] Error connecting to realtime:', error);
    }
  }, 500);
} else {
  console.error('[Supabase] Realtime client or connect method not available');
}

// Function to verify and validate realtime WebSocket connection
const verifyRealtimeConnection = () => {
  if (!supabase.realtime) {
    console.error('[Supabase] Realtime client not initialized properly');
    return false;
  }
  
  try {
    // Log current client configuration for debugging
    const opts = supabase.realtime.opts || {};
    console.log('[Supabase] Current realtime configuration:', {
      url: opts.url || wsUrl || 'Not available',
      heartbeat: opts.heartbeatIntervalMs || realtimeOptions.heartbeatIntervalMs || 'Not available',
      timeout: opts.timeout || 'Not available',
      params: opts.params || realtimeOptions.params || '{}'
    });
    
    // Multiple ways to check connection status
    let isConnected = false;
    
    // Method 1: Direct socket check
    if (supabase.realtime.socket) {
      const socketState = supabase.realtime.socket.readyState;
      const stateMap = {
        0: 'CONNECTING',
        1: 'OPEN',
        2: 'CLOSING',
        3: 'CLOSED',
        undefined: 'NOT_AVAILABLE'
      };
      
      console.log(`[Supabase] WebSocket state: ${stateMap[socketState] || 'UNKNOWN'} (${socketState})`);
      isConnected = socketState === 1; // OPEN
    } else {
      console.log('[Supabase] Socket object not available to check readyState');
    }
    
    // Method 2: If socket isn't available, check if we can connect
    if (!isConnected && typeof supabase.realtime.connect === 'function') {
      console.log('[Supabase] Socket not connected, attempting to connect...');
      supabase.realtime.connect();
    }
    
    return isConnected;
  } catch (error) {
    console.error('[Supabase] Error verifying realtime connection:', error);
    return false;
  }
};

// Enhanced logging for connection debugging
console.log('Initializing Supabase with URL:', supabaseUrl);
console.log('Auth configuration enabled with autoRefreshToken');
console.log('WebSocket configuration set with exponential backoff reconnection strategy');
console.log('Supabase client initialized with realtime enabled');

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
  supabase, // Expose supabase client for direct queries in components
  
  // Add leaveMatch function to fix "matchService.leaveMatch is not a function" error
  leaveMatch: async (matchId, userId) => {
    try {
      // Call the participantService.leaveMatch function
      return await participantService.leaveMatch(matchId, userId);
    } catch (error) {
      console.error('Error in matchService.leaveMatch:', error);
      throw error;
    }
  },
  
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
        try {
          // First try to get all sports to log them (for debugging)
          const { data: allSports } = await supabase
            .from('sports')
            .select('id, name');
            
          console.log('Available sports in database:', allSports);
          
          // Try case-insensitive match first
          const { data: sportData, error: sportError } = await supabase
            .from('sports')
            .select('id, name')
            .ilike('name', sport_id)
            .maybeSingle();
          
          if (sportError) {
            console.error('Error looking up sport by name:', sportError);
          }
            
          if (sportData && sportData.id) {
            sport_id = sportData.id;
            console.log(`Mapped sport name "${matchData.sport_id}" to UUID: ${sport_id} (${sportData.name})`);
          } else {
            // Try an exact match as fallback
            const { data: exactSportData } = await supabase
              .from('sports')
              .select('id, name')
              .eq('name', sport_id)
              .maybeSingle();
              
            if (exactSportData && exactSportData.id) {
              sport_id = exactSportData.id;
              console.log(`Mapped sport name "${matchData.sport_id}" to UUID (exact match): ${sport_id} (${exactSportData.name})`);
            } else {
              // If that still doesn't work, try to find by name containing the sport string
              const { data: partialSportData } = await supabase
                .from('sports')
                .select('id, name')
                .ilike('name', `%${sport_id}%`);
                
              if (partialSportData && partialSportData.length > 0) {
                // Use the first match
                sport_id = partialSportData[0].id;
                console.log(`Mapped sport name "${matchData.sport_id}" to UUID (partial match): ${sport_id} (${partialSportData[0].name})`);
              } else {
                console.error(`Could not find sport with name: ${matchData.sport_id}`);
                throw new Error(`Sport with name '${matchData.sport_id}' not found in database. Available sports: ${allSports.map(s => s.name).join(', ')}`);
              }
            }
          }
        } catch (sportError) {
          console.error('Error processing sport:', sportError);
          throw new Error(`Error processing sport: ${sportError.message}`);
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
      const { 
        court_name, 
        duration_minutes, 
        min_participants, 
        sportName, // Remove from Supabase data
        sportIcon, // Remove from Supabase data
        sport, // Remove duplicate field if present
        sport_name, // Remove sport_name - not a column in matches table
        ...dataWithoutExtraFields 
      } = matchData;
      
      // If there is a court_name, add it to the description field
      let description = matchData.description || '';
      if (court_name) {
        description = description ? `${description} (${court_name})` : `Court: ${court_name}`;
      }
      
      // Log the sport information for debugging
      console.log('Sport information being used:', {
        providedSportId: matchData.sport_id,
        providedSportName: sportName,
        resolvedSportId: sport_id
      });
      
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
      // Return in a consistent format that the client expects
      return { data: data, error: null };
    } catch (error) {
      console.error('Error in createMatch:', error);
      // Return a consistent error format that the client can handle
      return { data: null, error: error };
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
    
    // Check for missing host data and log a warning
    if (!data.host || Object.keys(data.host).length === 0) {
      console.warn(`Host data is missing for match ${matchId} (host_id: ${data.host_id})`);
      
      // Add placeholder host data to prevent UI errors
      data.host = {
        id: data.host_id,
        username: 'Unknown',
        full_name: 'Unknown Host',
      };
    }
    
    // Process participants to ensure user data is available
    if (data.participants && Array.isArray(data.participants)) {
      data.participants = data.participants.map(participant => {
        if (!participant.user) {
          console.warn(`User data missing for participant in match ${matchId}`);
          participant.user = {
            id: participant.user_id,
            username: 'Unknown',
            full_name: 'Unknown User'
          };
        }
        return participant;
      });
    }
    
    return data;
  },
  
  // Alias for getMatch to maintain backward compatibility
  getMatchById: async (matchId) => {
    return await matchService.getMatch(matchId);
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
    
    // Process the data to ensure host is never null/undefined
    return data.map(item => {
      // Add placeholder host data if missing
      if (!item.match.host || Object.keys(item.match.host).length === 0) {
        console.warn(`Host data is missing for match ${item.match.id} (host_id: ${item.match.host_id})`);
        
        item.match.host = {
          id: item.match.host_id,
          username: 'Unknown',
          full_name: 'Unknown Host'
        };
      }
      
      return {
        ...item.match,
        participation_status: item.status
      };
    });
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
    try {
      // Check if match exists and get its status
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('status, id, title')
        .eq('id', matchId)
        .single();
      
      if (matchError) {
        console.error('Error checking match before cancellation:', matchError);
        throw new Error(`Match not found or you don't have permission to cancel it.`);
      }
      
      // Check if match is already cancelled
      if (match.status === 'cancelled') {
        console.log(`Match ${matchId} (${match.title}) is already cancelled`);
        return { success: true, message: 'Match is already cancelled' };
      }
      
      // Check if match is in the past
      if (match.status === 'completed') {
        console.error('Attempted to cancel a completed match:', match);
        throw new Error(`Cannot cancel a match that has already been completed.`);
      }
      
      console.log(`Cancelling match ${matchId} (${match.title})`);
      
      // Update the match status to cancelled
      const { data, error } = await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('id', matchId)
        .select();
      
      if (error) {
        console.error('Error cancelling match:', error);
        throw new Error(`Failed to cancel match: ${error.message}`);
      }
      
      console.log(`Successfully cancelled match ${matchId}`);
      return { success: true, data, message: 'Match cancelled successfully' };
    } catch (error) {
      console.error('Error in cancelMatch:', error);
      // Return a structured error object instead of throwing
      return { 
        success: false, 
        error: true, 
        message: error.message || 'An error occurred while cancelling the match'
      };
    }
  },
  
  // Delete a match
  deleteMatch: async (matchId) => {
    try {
      // Check if match exists and get its status
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('status, id, title')
        .eq('id', matchId)
        .single();
      
      if (matchError) {
        console.error('Error checking match before deletion:', matchError);
        throw new Error(`Match not found or you don't have permission to delete it.`);
      }
      
      // Enforce that a match must be cancelled or completed before deletion
      if (match.status !== 'cancelled' && match.status !== 'completed') {
        console.error('Attempted to delete a match that is not cancelled or completed:', match);
        throw new Error(`Match "${match.title}" must be cancelled or completed before it can be deleted.`);
      }
      
      console.log(`Deleting match ${matchId} (${match.title})`);
      
      // Delete participants first to avoid foreign key constraints
      const { error: participantsError } = await supabase
        .from('participants')
        .delete()
        .eq('match_id', matchId);
      
      if (participantsError) {
        console.warn('Error deleting participants, but continuing with match deletion:', participantsError);
        // Continue with match deletion even if participant deletion has an error
      }
      
      // Then delete the match
      const { data, error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);
      
      if (error) {
        console.error('Error deleting match:', error);
        throw new Error(`Failed to delete match: ${error.message}`);
      }
      
      console.log(`Successfully deleted match ${matchId}`);
      return { success: true, message: 'Match deleted successfully' };
    } catch (error) {
      console.error('Error in deleteMatch:', error);
      // Return a structured error object instead of throwing
      return { 
        success: false, 
        error: true, 
        message: error.message || 'An error occurred while deleting the match'
      };
    }
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
    
    // Process each match to ensure it has valid host data
    const processedData = data.map(match => {
      // Add placeholder data if host is missing
      if (!match.host || Object.keys(match.host).length === 0) {
        console.warn(`Host data is missing for match ${match.id} (host_id: ${match.host_id})`);
        
        match.host = {
          id: match.host_id,
          username: 'Unknown',
          full_name: 'Unknown Host'
        };
      }
      
      return match;
    });
    
    return processedData;
  },
  
  // Leave a match - wrapper for participantService.leaveMatch
  leaveMatch: async (matchId, userId) => {
    try {
      // Call the participantService.leaveMatch function
      return await participantService.leaveMatch(matchId, userId);
    } catch (error) {
      console.error('Error in matchService.leaveMatch:', error);
      throw error;
    }
  },
  
  // Restore a cancelled match
  restoreMatch: async (matchId) => {
    try {
      // Check if match exists and is cancelled
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('status, id, title, host_id')
        .eq('id', matchId)
        .single();
      
      if (matchError) {
        console.error('Error checking match before restoration:', matchError);
        throw new Error(`Match not found or you don't have permission to restore it.`);
      }
      
      // Enforce that a match must be cancelled before restoration
      if (match.status !== 'cancelled') {
        console.error('Attempted to restore a match that is not cancelled:', match);
        throw new Error(`Match "${match.title}" is not cancelled and cannot be restored.`);
      }
      
      // Update match status to scheduled
      const { data: updatedMatch, error: updateError } = await supabase
        .from('matches')
        .update({ status: 'scheduled' })
        .eq('id', matchId)
        .select();
      
      if (updateError) {
        console.error('Error restoring match:', updateError);
        throw new Error(`Failed to restore match: ${updateError.message}`);
      }
      
      // Get confirmed participants (to restore only them)
      const { data: confirmedParticipants, error: participantsError } = await supabase
        .from('participants')
        .select('id, user_id, status')
        .eq('match_id', matchId)
        .eq('status', 'confirmed');
      
      if (participantsError) {
        console.error('Error getting confirmed participants:', participantsError);
        // Continue execution, as match status has been updated
      } else if (confirmedParticipants && confirmedParticipants.length > 0) {
        // Restore confirmed participants
        const participantUpdates = confirmedParticipants.map(p => ({
          id: p.id,
          status: 'confirmed'
        }));
        
        const { error: participantUpdateError } = await supabase
          .from('participants')
          .upsert(participantUpdates);
        
        if (participantUpdateError) {
          console.error('Error restoring confirmed participants:', participantUpdateError);
          // Continue execution, as match status has been updated
        }
        
        // Send notifications to confirmed participants
        try {
          for (const participant of confirmedParticipants) {
            // Skip the host, they don't need a notification about their own action
            if (participant.user_id === match.host_id) continue;
            
            // Get match title for notification
            await notificationService.createNotification({
              user_id: participant.user_id,
              type: 'match_updated',
              data: {
                match_id: matchId,
                match_title: match.title,
                message: 'This match has been restored and is now active again'
              },
              read: false
            });
          }
        } catch (notifError) {
          console.error('Non-critical error creating notifications:', notifError);
          // Continue execution
        }
      }
      
      return { success: true, data: updatedMatch };
    } catch (error) {
      console.error('Error in restoreMatch:', error);
      return { success: false, message: error.message || 'Failed to restore match' };
    }
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
  
  // Check rate limiting for join requests
  checkRateLimit: async (matchId, userId) => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Check if user has made requests in the last hour
      const { data, error } = await supabase
        .from('match_join_requests')
        .select('request_count, last_request_at')
        .eq('user_id', userId)
        .eq('match_id', matchId)
        .gte('last_request_at', oneHourAgo)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.request_count >= 3) {
        return { allowed: false, reason: 'Rate limit exceeded. You can only request to join the same match 3 times per hour.' };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true }; // Allow on error to not block users
    }
  },

  // Update request count for rate limiting
  updateRequestCount: async (matchId, userId) => {
    try {
      const { data, error } = await supabase
        .from('match_join_requests')
        .upsert({
          user_id: userId,
          match_id: matchId,
          request_count: 1,
          last_request_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,match_id',
          ignoreDuplicates: false
        })
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating request count:', error);
      // Don't throw error to not block the join process
    }
  },

  // Join a match
  joinMatch: async (matchId, userId) => {
    try {
      // Check rate limiting first
      const { allowed, reason } = await participantService.checkRateLimit(matchId, userId);
      if (!allowed) {
        throw new Error(reason);
      }

      // Check if user is already a participant
      const { isParticipant, status } = await participantService.checkParticipationStatus(matchId, userId);
      
      if (isParticipant) {
        // Handle different participation statuses
        if (status === 'confirmed') {
          return {
            success: false,
            message: 'You have already joined this match',
            status
          };
        }

        if (status === 'pending') {
          return {
            success: false,
            message: 'You have already sent a request to join this match',
            status
          };
        }

        if (status === 'declined') {
          return {
            success: false,
            message: 'Your previous request to join this match was declined. Please contact the host.',
            status
          };
        }

        // If status is 'left', allow user to rejoin by updating status to 'pending'
        const { data, error } = await supabase
          .from('participants')
          .update({ status: 'pending' })
          .eq('match_id', matchId)
          .eq('user_id', userId)
          .select();

        if (error) throw error;

        // Create notification for the match host (same as INSERT path)
        try {
          // Get match data for notification
          const { data: match, error: matchError } = await supabase
            .from('matches')
            .select('*')
            .eq('id', matchId)
            .single();

          if (!matchError) {
            console.log(`[NOTIFICATION DEBUG] Creating rejoin request notification for host ${match.host_id} from user ${userId}`);

            // Get user data for a better notification
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('full_name, username, avatar_url')
              .eq('id', userId)
              .single();

            if (userError) {
              console.error('[NOTIFICATION DEBUG] Error fetching user data:', userError);
            } else {
              console.log('[NOTIFICATION DEBUG] User data fetched:', userData);
            }

            const notificationData = {
              user_id: match.host_id, // Send notification to the host
              type: 'match_join_request',
              title: 'New Join Request',
              content: JSON.stringify({
                message: `${userData?.full_name || userData?.username || 'A user'} wants to join your match "${match.title}"`,
                sender_id: userId
              }),
              match_id: matchId,
              is_read: false
            };

            console.log('[NOTIFICATION DEBUG] Rejoin notification data to insert:', notificationData);

            // Use the direct method to create a notification
            const { data: notificationResult, error: notifError } = await supabase
              .from('notifications')
              .insert([notificationData])
              .select();

            if (notifError) {
              console.error('[NOTIFICATION DEBUG] Error inserting rejoin notification:', notifError);
            } else {
              console.log('[NOTIFICATION DEBUG] Rejoin request notification created successfully:', notificationResult);
            }
          }
        } catch (notifError) {
          console.error('Non-critical error creating rejoin notification:', notifError);
          // Continue execution - this is non-blocking
        }

        return {
          success: true,
          message: 'Successfully requested to rejoin the match',
          status: 'pending',
          data
        };
      }
      
      // Get match data for validation
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
        
      if (matchError) throw matchError;
      
      // Update request count for rate limiting
      await participantService.updateRequestCount(matchId, userId);

      // Insert new participant with 'pending' status
      const { data, error } = await supabase
        .from('participants')
        .insert([{
          match_id: matchId,
          user_id: userId,
          status: 'pending'
        }])
        .select();

      if (error) throw error;
      
      // Create notification for the match host
      try {
        console.log(`[NOTIFICATION DEBUG] Creating join request notification for host ${match.host_id} from user ${userId}`);
        console.log(`[NOTIFICATION DEBUG] Match details:`, { matchId, title: match.title, host_id: match.host_id });

        // Get user data for a better notification
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, username, avatar_url')
          .eq('id', userId)
          .single();

        if (userError) {
          console.error('[NOTIFICATION DEBUG] Error fetching user data:', userError);
        } else {
          console.log('[NOTIFICATION DEBUG] User data fetched:', userData);
        }

        const notificationData = {
          user_id: match.host_id, // Send notification to the host
          type: 'match_join_request',
          title: 'New Join Request',
          content: JSON.stringify({
            message: `${userData?.full_name || userData?.username || 'A user'} wants to join your match "${match.title}"`,
            sender_id: userId
          }),
          match_id: matchId,
          is_read: false
        };

        console.log('[NOTIFICATION DEBUG] Notification data to insert:', notificationData);

        // Use the direct method to create a notification
        const { data: notificationResult, error: notifError } = await supabase
          .from('notifications')
          .insert([notificationData])
          .select();

        if (notifError) {
          console.error('[NOTIFICATION DEBUG] Error inserting notification:', notifError);
          throw notifError;
        }

        console.log('[NOTIFICATION DEBUG] Join request notification created successfully:', notificationResult);
      } catch (notifError) {
        console.error('Non-critical error creating notification:', notifError);
        console.error('Notification error details:', JSON.stringify(notifError));
        // Continue execution - this is non-blocking
      }

      return {
        success: true,
        message: 'Successfully requested to join the match',
        status: 'pending',
        data
      };
    } catch (error) {
      console.error('Error joining match:', error);
      throw error;
    }
  },
  
  // Add a function to accept a join request
  acceptJoinRequest: async (matchId, userId) => {
    try {
      // Update participant status to confirmed
      const { data, error } = await supabase
        .from('participants')
        .update({ status: 'confirmed' })
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .select();
        
      if (error) throw error;
      
      // Get match data for notification
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('title')
        .eq('id', matchId)
        .single();
        
      if (!matchError) {
        // Create notification for the user
        try {
          const notificationData = {
            user_id: userId,
            type: 'join_request_accepted',
            title: 'Join Request Accepted',
            content: `Your request to join "${match.title}" has been accepted`,
            match_id: matchId,
            is_read: false
          };
          
          // Direct insertion for better error reporting
          const { error: notifError } = await supabase
            .from('notifications')
            .insert([notificationData]);
            
          if (notifError) {
            console.error('Notification creation error:', notifError);
          }
        } catch (notifError) {
          console.error('Non-critical error creating notification:', notifError);
          // Continue execution
        }
      }
      
      return { success: true, data, message: 'Participant request accepted' };
    } catch (error) {
      console.error('Error accepting join request:', error);
      throw error;
    }
  },
  
  // Add a function to decline a join request
  declineJoinRequest: async (matchId, userId) => {
    try {
      // Update participant status to declined
      const { data, error } = await supabase
        .from('participants')
        .update({ status: 'declined' })
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .select();
        
      if (error) throw error;
      
      // Get match data for notification
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('title')
        .eq('id', matchId)
        .single();
        
      if (!matchError) {
        // Create notification for the user
        try {
          const notificationData = {
            user_id: userId,
            type: 'join_request_rejected',
            title: 'Join Request Declined',
            content: `Your request to join "${match.title}" has been declined`,
            match_id: matchId,
            is_read: false
          };
          
          // Direct insertion for better error reporting
          const { error: notifError } = await supabase
            .from('notifications')
            .insert([notificationData]);
            
          if (notifError) {
            console.error('Notification creation error:', notifError);
          }
        } catch (notifError) {
          console.error('Non-critical error creating notification:', notifError);
          // Continue execution
        }
      }
      
      return { success: true, data, message: 'Participant request declined' };
    } catch (error) {
      console.error('Error declining join request:', error);
      throw error;
    }
  },
  
  // Leave a match
  leaveMatch: async (matchId, userId) => {
    try {
      // First check if the user is actually in the match and get their current status
      const { data: participantData, error: checkError } = await supabase
        .from('participants')
        .select('status')
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .single();

      if (checkError || !participantData) {
        throw new Error('You are not a participant in this match');
      }

      const currentStatus = participantData.status;

      // Update participant status to 'left' instead of deleting
      // This keeps participation history for potential analytics
      const { data, error } = await supabase
        .from('participants')
        .update({ status: 'left' })
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      // Return different messages based on previous status
      let message;
      if (currentStatus === 'pending') {
        message = 'Request cancelled successfully';
      } else if (currentStatus === 'confirmed') {
        message = 'Successfully left the match';
      } else {
        message = 'Status updated successfully';
      }

      return { success: true, data, message, previousStatus: currentStatus };
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
    try {
      console.log(`Fetching participants for match ID: ${matchId}, status filter: ${status || 'all'}`);
      
      let query = supabase
        .from('participants')
        .select(`
          id,
          match_id,
          user_id,
          status,
          joined_at,
          users:users!user_id(*)
        `)
        .eq('match_id', matchId);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Log raw data to debug missing user issues
      console.log('Raw participants data from Supabase:', JSON.stringify(data));
      
      // Process the nested user data to make it more accessible
      const processedData = data.map(participant => {
        // Extract user from the nested data structure, with null/undefined check
        const userData = participant.users || {}; // Default to empty object if user data is missing
        
        // Log detailed information about each participant for debugging
        console.log(`Processing participant ${participant.id}:`, {
          participant_id: participant.id,
          user_id: participant.user_id,
          status: participant.status,
          has_user_data: !!participant.users,
          user_data_keys: participant.users ? Object.keys(participant.users) : [],
          user_data: participant.users
        });
        
        // Log warning if user data is missing
        if (!participant.users) {
          console.warn(`User data missing for participant (ID: ${participant.id}, user_id: ${participant.user_id})`);
          
          // Try to get basic user data as a fallback
          supabase.from('users')
            .select('id, email, username, full_name, avatar_url')
            .eq('id', participant.user_id)
            .single()
            .then(({ data: fallbackUser, error }) => {
              if (!error && fallbackUser) {
                console.log('Retrieved fallback user data:', fallbackUser);
                // Update this participant in the state (in the component that called this)
                // Note: This won't update the returned data immediately, but will help in subsequent renders
              } else if (error) {
                console.error('Error fetching fallback user data:', error);
              }
            })
            .catch(err => console.error('Error fetching fallback user data:', err));
        }
        
        // Ensure at least username or full_name is available
        const enhancedUserData = {
          ...userData,
          username: userData.username || 'User',
          full_name: userData.full_name || userData.username || 'Unknown'
        };
        
        return {
          ...participant,
          user: enhancedUserData
        };
      });
      
      console.log('Processed participant data:', processedData);
      return processedData;
    } catch (error) {
      console.error('Error fetching participants:', error);
      throw error;
    }
  },
  
  // Get user's participations across all matches
  getUserParticipations: async (userId, status = null) => {
    let query = supabase
      .from('participants')
      .select(`
        *,
        match:matches(*, sport:sports(*), host:users!host_id(*), location:locations(*))
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });
    
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
  
  // Alias for getAllLocations for API consistency
  getLocations: async () => {
    return await locationService.getAllLocations();
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

// Export services
export { notificationService } from './notifications';
export { friendshipService } from './friendship';

export { supabase };
