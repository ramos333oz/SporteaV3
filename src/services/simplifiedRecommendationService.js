import { supabase } from './supabase';

/**
 * Simplified Recommendation Service - Direct Preference Matching
 *
 * CONCEPT: Replace vector similarity with logical direct matching
 * - Sports Match (40%): Exact sport preference matching
 * - Faculty Match (25%): Same/different faculty scoring
 * - Skill Match (20%): Skill level compatibility matrix
 * - Schedule Match (10%): Time overlap calculation
 * - Location Match (5%): Venue preference matching
 *
 * BENEFITS:
 * - Explainable: Users see exactly why they got X% match
 * - Accurate: Badminton = Badminton gives 40% (not 25% from vector similarity)
 * - Fast: Direct calculations instead of vector operations
 * - Maintainable: Easy to adjust weights and add criteria
 */

const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const LOG_PREFIX = '[Simplified Recommendation Service]';

// Scoring weights (must total 100%)
const WEIGHTS = {
  SPORTS: 0.40,      // 40% - Most important factor
  FACULTY: 0.25,     // 25% - Encourages community building
  SKILL: 0.20,       // 20% - Ensures compatible gameplay
  SCHEDULE: 0.10,    // 10% - Time availability
  LOCATION: 0.05     // 5% - Venue preference
};

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let recommendationsCache = {
  data: null,
  timestamp: 0,
  userId: null
};

// Helper logging functions
function log(...args) {
  if (DEBUG_MODE) {
    console.log(LOG_PREFIX, ...args);
  }
}

function logError(...args) {
  console.error(LOG_PREFIX, ...args);
}

/**
 * Main recommendation function using direct preference matching
 * Now calls the simplified-recommendations edge function for better performance
 */
async function getRecommendations(userId, options = {}) {
  try {
    const { limit = 10, offset = 0, minScore = 0.15 } = options;

    log(`=== SIMPLIFIED RECOMMENDATIONS START ===`);
    log(`User: ${userId}, Limit: ${limit}, Min Score: ${minScore}`);

    // Check cache first
    if (isCacheValid(userId)) {
      log('Returning cached recommendations');
      return recommendationsCache.data;
    }

    // Try to call the simplified-recommendations edge function first
    try {
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('simplified-recommendations', {
        body: { userId, limit, offset, minScore }
      });

      if (edgeError) {
        log('Edge function error, falling back to local calculation:', edgeError);
        throw edgeError;
      }

      if (edgeResult && edgeResult.recommendations) {
        log(`Edge function returned ${edgeResult.recommendations.length} recommendations`);

        // Format the response to match expected structure
        const formattedResponse = {
          recommendations: edgeResult.recommendations,
          metadata: edgeResult.metadata,
          type: 'simplified_direct_matching'
        };

        // Cache results
        cacheResults(userId, formattedResponse);

        log(`=== SIMPLIFIED RECOMMENDATIONS END (Edge Function) ===`);
        return formattedResponse;
      }
    } catch (edgeError) {
      log('Edge function failed, falling back to local calculation:', edgeError);
    }

    // Fallback to local calculation if edge function fails
    log('Using local calculation fallback');

    // Get user preferences and profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Get available matches (excluding user's own matches)
    const availableMatches = await getAvailableMatches(userId);
    log(`Available matches result:`, availableMatches);
    if (!availableMatches || availableMatches.length === 0) {
      log('No available matches found');
      return {
        recommendations: [],
        metadata: { count: 0, total_available: 0, type: 'simplified_direct_matching_local' },
        type: 'simplified_direct_matching_local'
      };
    }

    log(`Found ${availableMatches.length} available matches`);

    // Calculate match scores using direct preference matching
    const scoredMatches = [];

    for (const match of availableMatches) {
      const matchScore = calculateMatchScore(userProfile, match);

      if (matchScore.totalScore >= minScore) {
        scoredMatches.push({
          ...match,
          similarity_score: matchScore.totalScore,
          score_breakdown: matchScore.breakdown,
          explanation: generateExplanation(matchScore.breakdown)
        });
      }
    }

    // Sort by total score (highest first)
    scoredMatches.sort((a, b) => b.similarity_score - a.similarity_score);

    // Apply limit and offset
    const paginatedResults = scoredMatches.slice(offset, offset + limit);

    log(`Generated ${scoredMatches.length} recommendations, returning ${paginatedResults.length}`);

    const response = {
      recommendations: paginatedResults,
      metadata: {
        count: paginatedResults.length,
        total_available: scoredMatches.length,
        type: 'simplified_direct_matching_local',
        algorithm: 'Direct preference matching with weighted scoring (local fallback)'
      },
      type: 'simplified_direct_matching_local'
    };

    // Cache results
    cacheResults(userId, response);

    log(`=== SIMPLIFIED RECOMMENDATIONS END (Local Fallback) ===`);
    return response;

  } catch (error) {
    logError('Error generating recommendations:', error);
    throw error;
  }
}

/**
 * Calculate match score using direct preference matching
 */
function calculateMatchScore(userProfile, match) {
  const breakdown = {
    sports: calculateSportsScore(userProfile, match),
    faculty: calculateFacultyScore(userProfile, match),
    skill: calculateSkillScore(userProfile, match),
    schedule: calculateScheduleScore(userProfile, match),
    location: calculateLocationScore(userProfile, match)
  };

  console.log('[Simplified Recommendation Service] Score breakdown for match:', match.title);
  console.log('[Simplified Recommendation Service] Individual scores:', breakdown);
  console.log('[Simplified Recommendation Service] User profile:', userProfile);

  // Calculate weighted total score
  const totalScore =
    (breakdown.sports * WEIGHTS.SPORTS) +
    (breakdown.faculty * WEIGHTS.FACULTY) +
    (breakdown.skill * WEIGHTS.SKILL) +
    (breakdown.schedule * WEIGHTS.SCHEDULE) +
    (breakdown.location * WEIGHTS.LOCATION);

  console.log('[Simplified Recommendation Service] Weighted calculation:');
  console.log(`  Sports: ${breakdown.sports} × ${WEIGHTS.SPORTS} = ${breakdown.sports * WEIGHTS.SPORTS}`);
  console.log(`  Faculty: ${breakdown.faculty} × ${WEIGHTS.FACULTY} = ${breakdown.faculty * WEIGHTS.FACULTY}`);
  console.log(`  Skill: ${breakdown.skill} × ${WEIGHTS.SKILL} = ${breakdown.skill * WEIGHTS.SKILL}`);
  console.log(`  Schedule: ${breakdown.schedule} × ${WEIGHTS.SCHEDULE} = ${breakdown.schedule * WEIGHTS.SCHEDULE}`);
  console.log(`  Location: ${breakdown.location} × ${WEIGHTS.LOCATION} = ${breakdown.location * WEIGHTS.LOCATION}`);
  console.log(`  Total Score: ${totalScore}`);

  const finalScore = Math.round(totalScore * 100) / 100;
  console.log('[Simplified Recommendation Service] Final score (rounded):', finalScore);

  return {
    totalScore: finalScore,
    breakdown
  };
}

/**
 * Sports matching: Direct preference comparison
 */
function calculateSportsScore(userProfile, match) {
  const userSports = userProfile.sport_preferences || [];
  const matchSport = match.sport_name;



  // Check if user has this sport in their preferences
  const hasMatchingSport = userSports.some(sport => {
    const nameMatch = sport.sport_name === matchSport;
    const idMatch = sport.sport_id === match.sport_id;
    return nameMatch || idMatch;
  });

  return hasMatchingSport ? 1.0 : 0.0;
}

/**
 * Faculty matching: Same faculty gets full points, different gets partial
 */
function calculateFacultyScore(userProfile, match) {
  const userFaculty = userProfile.faculty;
  const hostFaculty = match.host_faculty;

  if (!userFaculty || !hostFaculty) {
    return 0.5; // Neutral score if faculty info missing
  }

  if (userFaculty === hostFaculty) {
    return 1.0; // Same faculty
  } else {
    return 0.5; // Different faculty (still gets partial points for diversity)
  }
}

/**
 * Skill level compatibility matrix
 */
function calculateSkillScore(userProfile, match) {
  const userSkillLevels = userProfile.skill_levels || {};
  const matchSport = match.sport_name;
  const matchSkillRequirement = match.skill_level || 'intermediate';

  // Get user's skill level for this specific sport
  let userSkillLevel = userSkillLevels[matchSport] || 'intermediate';

  // Skill compatibility matrix
  const skillMatrix = {
    'beginner': {
      'beginner': 1.0,
      'intermediate': 0.75,
      'advanced': 0.5,
      'professional': 0.0
    },
    'intermediate': {
      'beginner': 0.75,
      'intermediate': 1.0,
      'advanced': 0.75,
      'professional': 0.5
    },
    'advanced': {
      'beginner': 0.5,
      'intermediate': 0.75,
      'advanced': 1.0,
      'professional': 0.75
    },
    'professional': {
      'beginner': 0.0,
      'intermediate': 0.5,
      'advanced': 0.75,
      'professional': 1.0
    }
  };

  return skillMatrix[userSkillLevel]?.[matchSkillRequirement] || 0.5;
}

/**
 * Schedule overlap calculation
 */
function calculateScheduleScore(userProfile, match) {
  const userAvailableDays = userProfile.available_days || [];
  const matchDate = new Date(match.start_time);
  const matchDay = matchDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  // Check if user is available on the match day
  const isAvailableOnDay = userAvailableDays.includes(matchDay);

  if (!isAvailableOnDay) {
    return 0.0; // User not available on this day
  }

  // For now, if available on the day, give full points
  // TODO: Add time-specific availability checking
  return 1.0;
}

/**
 * Location preference matching
 */
function calculateLocationScore(userProfile, match) {
  // For now, give neutral score since we don't have detailed location preferences
  // TODO: Implement location preference system
  return 0.5;
}

/**
 * Generate human-readable explanation of match score
 */
function generateExplanation(breakdown) {
  const explanations = [];

  if (breakdown.sports === 1.0) {
    explanations.push(`Same sport preference (${Math.round(breakdown.sports * WEIGHTS.SPORTS * 100)}%)`);
  } else {
    explanations.push(`Different sport (0%)`);
  }

  if (breakdown.faculty === 1.0) {
    explanations.push(`Same faculty (${Math.round(breakdown.faculty * WEIGHTS.FACULTY * 100)}%)`);
  } else if (breakdown.faculty === 0.5) {
    explanations.push(`Different faculty (${Math.round(breakdown.faculty * WEIGHTS.FACULTY * 100)}%)`);
  }

  if (breakdown.skill >= 0.75) {
    explanations.push(`Compatible skill level (${Math.round(breakdown.skill * WEIGHTS.SKILL * 100)}%)`);
  } else if (breakdown.skill >= 0.5) {
    explanations.push(`Moderate skill compatibility (${Math.round(breakdown.skill * WEIGHTS.SKILL * 100)}%)`);
  } else {
    explanations.push(`Skill level mismatch (${Math.round(breakdown.skill * WEIGHTS.SKILL * 100)}%)`);
  }

  if (breakdown.schedule === 1.0) {
    explanations.push(`Available during match time (${Math.round(breakdown.schedule * WEIGHTS.SCHEDULE * 100)}%)`);
  } else {
    explanations.push(`Schedule conflict (0%)`);
  }

  return explanations.join(', ');
}

/**
 * Get user profile with preferences
 */
async function getUserProfile(userId) {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Get user preferences (including sport preferences from JSONB field)
    const { data: userPrefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('sport_preferences')
      .eq('user_id', userId)
      .single();

    if (prefsError) {
      log('No user preferences found for user:', userId);
    }

    // Transform sport preferences to match expected format
    const sportPreferences = userPrefs?.sport_preferences || [];
    const transformedSportPrefs = sportPreferences.map(sport => ({
      sport_name: sport.name,
      skill_level: sport.level?.toLowerCase() || 'beginner',
      // Add sport_id if available (for compatibility)
      sport_id: null // Will be resolved by name matching
    }));



    return {
      ...user,
      sport_preferences: transformedSportPrefs
    };

  } catch (error) {
    logError('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Get available matches (excluding user's own matches and past matches)
 */
async function getAvailableMatches(userId) {
  try {
    // Get current time in UTC
    const now = new Date();

    // Allow matches that started within the last hour for testing purposes
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const nowString = oneHourAgo.toISOString();

    // For display purposes, show Malaysia time
    const malaysiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

    console.log('[Simplified Recommendation Service] Fetching matches for user:', userId);
    console.log('[Simplified Recommendation Service] Current UTC time:', now.toISOString());
    console.log('[Simplified Recommendation Service] Current Malaysia time:', malaysiaTime.toISOString());
    console.log('[Simplified Recommendation Service] Query time UTC (1 hour buffer for testing):', nowString);

    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        sports(name),
        users!matches_host_id_fkey(faculty),
        locations(name, campus, image_url)
      `)
      .neq('host_id', userId) // Exclude user's own matches
      .gte('start_time', nowString) // Only future matches (with 5-minute buffer)
      .eq('status', 'upcoming') // Changed from 'active' to 'upcoming'
      .order('start_time', { ascending: true });

    if (error) throw error;

    console.log('[Simplified Recommendation Service] Raw matches from database:', matches?.length || 0);
    console.log('[Simplified Recommendation Service] Raw matches data:', matches);

    // Transform data for easier processing
    const transformedMatches = matches.map(match => ({
      ...match,
      sport_name: match.sports?.name,
      host_faculty: match.users?.faculty,
      venue_name: match.locations?.name,
      venue_location: match.locations?.campus,
      location_image_url: match.locations?.image_url, // Add venue image URL
      current_participants: 0 // Will be filled in below
    }));

    // Get participant counts for each match (same logic as LiveMatchBoard)
    try {
      const participantPromises = transformedMatches.map(async (match) => {
        const { count, error } = await supabase
          .from('participants')
          .select('id', { count: 'exact' })
          .eq('match_id', match.id)
          .eq('status', 'confirmed');

        return {
          matchId: match.id,
          count: error ? 0 : (count || 0),
          error
        };
      });

      const participantResults = await Promise.all(participantPromises);

      // Update matches with participant counts
      participantResults.forEach(result => {
        const match = transformedMatches.find(m => m.id === result.matchId);
        if (match && !result.error) {
          match.current_participants = result.count;
        }
      });

      console.log('[Simplified Recommendation Service] Added participant counts to matches');
    } catch (countError) {
      console.error('[Simplified Recommendation Service] Error fetching participant counts:', countError);
      // Continue without participant counts rather than failing
    }

    console.log('[Simplified Recommendation Service] Transformed matches:', transformedMatches?.length || 0);
    return transformedMatches;

  } catch (error) {
    logError('Error fetching available matches:', error);
    return [];
  }
}

/**
 * Cache management
 */
function isCacheValid(userId) {
  const now = Date.now();
  return (
    recommendationsCache.data &&
    recommendationsCache.userId === userId &&
    (now - recommendationsCache.timestamp) < CACHE_DURATION
  );
}

function cacheResults(userId, results) {
  recommendationsCache = {
    data: results,
    timestamp: Date.now(),
    userId
  };
}

function clearCache() {
  recommendationsCache = {
    data: null,
    timestamp: 0,
    userId: null
  };
  log('Cache cleared');
}

/**
 * Invalidate cache for specific user
 */
function invalidateUserCache(userId) {
  if (recommendationsCache.userId === userId) {
    clearCache();
    log(`Cache invalidated for user: ${userId}`);
  }
}

/**
 * Invalidate cache for all users (when match details change)
 */
function invalidateAllCache() {
  clearCache();
  log('Cache invalidated for all users');
}

// Export functions
export {
  getRecommendations,
  clearCache,
  invalidateUserCache,
  invalidateAllCache
};
