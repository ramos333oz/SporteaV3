import { supabase } from './supabase';

/**
 * V3 Recommendation Service - Simplified and Explainable
 * Uses 128-dimension vectors with clear attribute weighting
 * 
 * FEATURES:
 * - Single algorithm path (no feature flags)
 * - Sport isolation (Basketball preferences only affect Basketball matches)
 * - Explainable scoring (clear breakdown of why each match was recommended)
 * - Predictable behavior (removing preferences decreases scores)
 * - Fast performance (128-dim vectors with HNSW indexing)
 */

const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const LOG_PREFIX = '[SporteaV3 Recommendation Service]';

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
 * Main recommendation function using V3 128-dimension vectors
 */
async function getRecommendations(userId, options = {}) {
  try {
    const { limit = 10, offset = 0, minSimilarity = 0.1 } = options;
    
    log(`=== V3 RECOMMENDATIONS START ===`);
    log(`User: ${userId}, Limit: ${limit}, Min Similarity: ${minSimilarity}`);
    
    // Check cache first
    if (isCacheValid(userId)) {
      log('Returning cached recommendations');
      return recommendationsCache.data;
    }
    
    // Step 1: Verify user has V3 vector
    const { data: userVector, error: userVectorError } = await supabase
      .from('user_vectors_v3')
      .select('vector_data, sport_preferences_normalized')
      .eq('user_id', userId)
      .single();
    
    if (userVectorError || !userVector) {
      log('User has no V3 vector, generating one...');
      await generateUserVector(userId);
      
      // Retry after generation
      const { data: retryUserVector, error: retryError } = await supabase
        .from('user_vectors_v3')
        .select('vector_data, sport_preferences_normalized')
        .eq('user_id', userId)
        .single();
        
      if (retryError || !retryUserVector) {
        throw new Error('Failed to generate user vector');
      }
    }
    
    // Step 2: Get user's sport preferences for filtering
    const { data: userSports, error: userSportsError } = await supabase
      .from('sport_preferences_normalized')
      .select('sport_id, sport_name')
      .eq('user_id', userId);

    if (userSportsError) {
      log('Failed to get user sports, proceeding without sport filtering:', userSportsError);
    }

    const userSportIds = userSports?.map(s => s.sport_id) || [];
    log(`User interested in sports: ${userSports?.map(s => s.sport_name).join(', ') || 'None specified'}`);

    // Step 3: Get available matches with sport filtering - Direct approach
    const { data: directMatches, error: directError } = await supabase
      .from('matches')
      .select(`
        id,
        title,
        description,
        skill_level,
        start_time,
        max_participants,
        status,
        sport_id,
        sports(id, name),
        locations(name, campus),
        host:host_id(full_name, faculty),
        participants(user_id)
      `)
      .eq('status', 'upcoming')
      .not('host_id', 'eq', userId)
      .gte('start_time', new Date().toISOString())
      .in('sport_id', userSportIds.length > 0 ? userSportIds : [])
      .limit(50);

    if (directError) {
      throw new Error(`Failed to fetch matches: ${directError.message}`);
    }

    // Get vectors separately for these matches
    const matchIds = directMatches?.map(m => m.id) || [];
    const { data: vectors } = await supabase
      .from('match_vectors_v3')
      .select('match_id, vector_data')
      .in('match_id', matchIds);

    // Combine matches with their vectors
    const matchesWithVectors = directMatches?.map(match => ({
      ...match,
      match_vectors_v3: vectors?.filter(v => v.match_id === match.id) || []
    })) || [];

    log(`Found ${matchesWithVectors.length} available matches (sport-filtered)`);

    // Filter to only matches that have V3 vectors
    const matches = matchesWithVectors.filter(match =>
      match.match_vectors_v3.length > 0
    );

    log(`Found ${matches.length} matches with V3 vectors`);

    // SPORT ISOLATION logging
    if (userSportIds.length > 0) {
      log(`🎯 SPORT FILTERING: Only showing matches for user's ${userSportIds.length} preferred sports`);
    } else {
      log('⚠️ No sport preferences found, showing all matches');
    }

    
    if (!matches || matches.length === 0) {
      log('No available matches found');
      return createEmptyResponse('No upcoming matches available');
    }
    
    log(`Found ${matches.length} available matches (sport-filtered)`);

    // Step 4: Calculate similarities using V3 function with sport isolation verification
    const recommendations = [];
    
    for (const match of matches) {
      try {
        const matchVector = match.match_vectors_v3[0]?.vector_data;
        if (!matchVector) {
          log(`Match ${match.id} has no V3 vector, skipping`);
          continue;
        }

        log(`✅ Processing match ${match.id} (${match.title}) with V3 vector`);

        // SPORT ISOLATION VERIFICATION: Ensure this match is for a sport the user likes
        const matchSportName = match.sports?.name;
        const userLikesThisSport = userSports?.some(s => s.sport_name === matchSportName);

        if (!userLikesThisSport && userSports?.length > 0) {
          log(`🚫 SPORT ISOLATION: Skipping ${matchSportName} match - user not interested in this sport`);
          continue;
        }

        log(`✅ SPORT ISOLATION: ${matchSportName} match approved - user interested in this sport`);

        // Call the V3 similarity function
        log(`🔍 Calling similarity function for match ${match.id} with user ${userId}`);
        log(`🔍 Match vector type:`, typeof matchVector, 'Length:', matchVector?.length);

        let similarity;
        try {
          const { data: similarityResult, error: similarityError } = await supabase
            .rpc('calculate_proper_weighted_cosine_similarity_v3', {
              user_id_param: userId,
              match_vector_param: matchVector
            });

          log(`🔍 Similarity result for match ${match.id}:`, similarityResult);
          log(`🔍 Raw similarity result structure:`, JSON.stringify(similarityResult, null, 2));

          if (similarityError) {
            logError(`Similarity calculation failed for match ${match.id}:`, similarityError);
            continue;
          }

          // Parse the similarity result - the function returns an object directly
          const rawResult = similarityResult[0];
          log(`🔍 Raw result structure:`, rawResult);
          if (!rawResult) {
            log(`❌ No raw result found`);
            continue;
          }

          // The function returns an object with similarity scores directly
          similarity = {
            similarity_score: rawResult.similarity_score || 0,
            sports_contribution: rawResult.sports_contribution || 0,
            faculty_contribution: rawResult.faculty_contribution || 0,
            skill_contribution: rawResult.skill_contribution || 0,
            schedule_contribution: rawResult.schedule_contribution || 0,
            enhanced_contribution: rawResult.enhanced_contribution || 0
          };

          if (similarity.similarity_score < minSimilarity) {
            continue;
          }

          log(`📊 SIMILARITY SCORE: ${similarity.similarity_score} (${Math.round(similarity.similarity_score * 100)}%) for match ${match.title}`);

        } catch (similarityException) {
          logError(`Exception during similarity calculation for match ${match.id}:`, similarityException);
          continue;
        }

        // Calculate current participants
        const currentParticipants = match.participants?.length || 0;

        // Create explainable recommendation with expected frontend structure
        const recommendation = {
          // Match data in nested structure expected by frontend
          match: {
            id: match.id,
            title: match.title,
            description: match.description,
            skill_level: match.skill_level,
            start_time: match.start_time,
            max_participants: match.max_participants,
            current_participants: currentParticipants,

            // Sport information - provide both formats for compatibility
            sport_id: match.sport_id,
            sport: {
              id: match.sport_id,
              name: match.sports?.name
            },
            sports: {
              id: match.sport_id,
              name: match.sports?.name
            },

            // Location information - provide both formats for compatibility
            location: {
              name: match.locations?.name,
              campus: match.locations?.campus
            },
            locations: {
              name: match.locations?.name,
              campus: match.locations?.campus
            },

            // Host information
            host: {
              full_name: match.host?.full_name,
              faculty: match.host?.faculty
            },
            host_name: match.host?.full_name,
            host_faculty: match.host?.faculty
          },

          // V3 Explainable Scoring - provide multiple formats for compatibility
          similarity_score: Math.round(similarity.similarity_score * 100), // Convert to percentage
          score: similarity.similarity_score, // Raw score (0-1) for frontend components
          final_score: similarity.similarity_score, // Raw score (0-1) for frontend components

          explanation: {
            sports_match: Math.round(similarity.sports_contribution * 100),
            faculty_match: Math.round(similarity.faculty_contribution * 100),
            skill_match: Math.round(similarity.skill_contribution * 100),
            schedule_match: Math.round(similarity.schedule_contribution * 100),
            enhanced_match: Math.round(similarity.enhanced_contribution * 100)
          },

          // Sport isolation verification
          sport_isolation: {
            match_sport: matchSportName,
            user_interested: userLikesThisSport,
            isolation_verified: true
          },

          // Human-readable explanation
          why_recommended: generateExplanation(similarity, match),

          // V3 metadata
          algorithm: 'v3_vector_similarity',
          vector_dimensions: 128
        };
        
        recommendations.push(recommendation);
        
      } catch (error) {
        logError(`Error processing match ${match.id}:`, error);
        continue;
      }
    }
    
    // Step 4: Sort by similarity score and apply pagination
    recommendations.sort((a, b) => b.similarity_score - a.similarity_score);
    const paginatedRecommendations = recommendations.slice(offset, offset + limit);
    
    log(`Generated ${recommendations.length} recommendations, returning ${paginatedRecommendations.length}`);
    
    // Step 5: Create response with metadata
    const response = {
      recommendations: paginatedRecommendations,
      metadata: {
        count: paginatedRecommendations.length,
        total_available: recommendations.length,
        type: 'v3_vector_similarity',
        algorithm: '128-dimension cosine similarity with sport isolation',
        min_similarity: minSimilarity,
        sport_isolation: {
          enabled: true,
          user_sports: userSports?.map(s => s.sport_name) || [],
          filtered_matches: userSportIds.length > 0,
          isolation_verified: true
        },
        attribute_weights: {
          sports: '40%',
          faculty: '25%',
          skill: '20%',
          schedule: '10%',
          enhanced: '5%'
        }
      }
    };
    
    // Cache the response
    cacheResponse(userId, response);
    
    log(`=== V3 RECOMMENDATIONS END ===`);
    return response;
    
  } catch (error) {
    logError('Exception in V3 getRecommendations:', error);
    return createErrorResponse(error.message);
  }
}

/**
 * Generate human-readable explanation for why a match was recommended
 */
function generateExplanation(similarity, match) {
  const explanations = [];
  
  // Sports explanation (most important)
  if (similarity.sports_contribution > 0.3) {
    explanations.push(`You're interested in ${match.sports?.name}`);
  }
  
  // Faculty explanation
  if (similarity.faculty_contribution > 0.2) {
    explanations.push(`Host is from ${match.host?.faculty} faculty`);
  }
  
  // Skill explanation
  if (similarity.skill_contribution > 0.15) {
    explanations.push(`Skill level matches your experience (${match.skill_level})`);
  }
  
  // Schedule explanation
  if (similarity.schedule_contribution > 0.05) {
    const matchDay = new Date(match.start_time).toLocaleDateString('en-US', { weekday: 'long' });
    explanations.push(`Available on ${matchDay}`);
  }
  
  if (explanations.length === 0) {
    explanations.push('General compatibility with your preferences');
  }
  
  return explanations.join(', ');
}

/**
 * Generate user vector if it doesn't exist
 */
async function generateUserVector(userId) {
  log(`Generating V3 vector for user ${userId}`);

  const { data, error } = await supabase.functions.invoke('generate-user-vectors-v3', {
    body: { userId }
  });

  if (error) {
    throw new Error(`Failed to generate user vector: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(`Vector generation failed: ${data?.error || 'Unknown error'}`);
  }

  // Clear cache after successful vector generation to ensure fresh recommendations
  clearCache();
  log(`V3 cache cleared after vector generation for user ${userId}`);

  log(`Successfully generated V3 vector for user ${userId}`);
}

/**
 * Cache management
 */
function isCacheValid(userId) {
  return recommendationsCache.userId === userId &&
         recommendationsCache.data &&
         (Date.now() - recommendationsCache.timestamp) < CACHE_DURATION;
}

function cacheResponse(userId, response) {
  recommendationsCache = {
    data: response,
    timestamp: Date.now(),
    userId: userId
  };
}

/**
 * Helper response creators
 */
function createEmptyResponse(message) {
  return {
    recommendations: [],
    metadata: {
      count: 0,
      type: 'empty',
      message: message
    }
  };
}

function createErrorResponse(errorMessage) {
  return {
    recommendations: [],
    metadata: {
      count: 0,
      type: 'error',
      message: 'Unable to load recommendations',
      error: errorMessage
    }
  };
}

/**
 * Clear cache (useful for testing)
 */
function clearCache() {
  recommendationsCache = {
    data: null,
    timestamp: 0,
    userId: null
  };
  log('Cache cleared');
}

// Export the V3 recommendation service
export const recommendationServiceV3 = {
  getRecommendations,
  generateUserVector,
  clearCache
};

export default recommendationServiceV3;
