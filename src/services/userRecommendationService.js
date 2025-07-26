import { supabase } from './supabase';
import { findKNearestNeighbors, generateUserSimilarityExplanation } from './knnRecommendationService';
import { buildAndStoreUserVector, getUserVector } from './knnVectorService';

/**
 * User Recommendation Service
 * 
 * Implements user discovery and recommendation system following TEMPLATE.md methodology
 * This service finds USERS with similar preferences for connection/friendship
 * NOT matches to join (that's handled by match recommendation services)
 * 
 * Core Purpose: Find similar users for social connections and friendship building
 */

const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const LOG_PREFIX = '[User Recommendation Service]';

// Cache configuration for user recommendations
const USER_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
let userRecommendationCache = {
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
 * Get user recommendations for connection/friendship
 * Following TEMPLATE.md user recommendation methodology
 */
async function getUserRecommendations(userId, options = {}) {
  try {
    const { limit = 10, offset = 0, minSimilarity = 0.3, k = 20 } = options;

    log(`=== USER RECOMMENDATIONS START ===`);
    log(`Finding similar users for connection - User: ${userId}, K: ${k}, Min Similarity: ${minSimilarity}`);

    // Check cache first
    if (isUserCacheValid(userId)) {
      log('Returning cached user recommendations');
      return userRecommendationCache.data;
    }

    // Step 1: Find K nearest neighbor users using KNN algorithm
    const nearestNeighbors = await findKNearestNeighbors(userId, k);
    
    if (nearestNeighbors.length === 0) {
      log('No similar users found');
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total_available: 0,
          type: 'user_similarity_recommendations',
          algorithm: 'K-Nearest Neighbors User Discovery',
          k_value: k,
          similar_users_found: 0,
          purpose: 'Find users for connection and friendship'
        },
        type: 'user_similarity_recommendations'
      };
    }

    // Step 2: Filter users by minimum similarity threshold
    // TESTING MODE: Display ALL users regardless of similarity threshold for screenshot evidence
    const similarUsers = nearestNeighbors; // Removed threshold filtering to show all calculated similarities
    
    if (similarUsers.length === 0) {
      log(`No users found for recommendations`);
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total_available: 0,
          type: 'user_similarity_recommendations',
          algorithm: 'K-Nearest Neighbors User Discovery',
          k_value: k,
          users_analyzed: nearestNeighbors.length,
          similar_users_found: 0,
          min_similarity_threshold: 'DISABLED_FOR_TESTING',
          purpose: 'Find users for connection and friendship'
        },
        type: 'user_similarity_recommendations'
      };
    }

    log(`Found ${similarUsers.length} users for potential connection (threshold filtering disabled for testing)`);

    // Step 3: Filter out users who are already friends or have pending requests
    const similarUserIds = similarUsers.map(user => user.userId);

    // Get existing friendships and pending requests for the current user
    const { data: existingFriendships, error: friendshipError } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

    if (friendshipError) {
      logError('Error fetching existing friendships:', friendshipError);
      // Continue without filtering if there's an error
    }

    // Create a set of user IDs that should be excluded (only active relationships)
    const excludedUserIds = new Set();
    if (existingFriendships) {
      existingFriendships.forEach(friendship => {
        // Only exclude users with active relationships (pending or accepted)
        // Allow users with declined requests to appear in recommendations again
        if (friendship.status === 'pending' || friendship.status === 'accepted') {
          const otherUserId = friendship.user_id === userId ? friendship.friend_id : friendship.user_id;
          excludedUserIds.add(otherUserId);
        }
      });
    }

    // Filter out excluded users
    const filteredUserIds = similarUserIds.filter(id => !excludedUserIds.has(id));

    log(`Filtered out ${similarUserIds.length - filteredUserIds.length} users with active relationships (pending/accepted)`);
    log(`Remaining ${filteredUserIds.length} users for recommendations`);

    if (filteredUserIds.length === 0) {
      log('No users remaining after friendship filtering');
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total_available: 0,
          type: 'user_similarity_recommendations',
          algorithm: 'K-Nearest Neighbors User Discovery',
          k_value: k,
          users_analyzed: nearestNeighbors.length,
          similar_users_found: similarUsers.length,
          filtered_out_friends: similarUserIds.length - filteredUserIds.length,
          min_similarity_threshold: 'DISABLED_FOR_TESTING',
          purpose: 'Find users for connection and friendship'
        },
        type: 'user_similarity_recommendations'
      };
    }

    // Step 4: Get detailed user information for filtered similar users
    
    const { data: userProfiles, error: profilesError } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        avatar_url,
        faculty,
        campus,
        gender,
        play_style,
        sport_preferences,
        available_hours,
        preferred_facilities,
        created_at
      `)
      .in('id', filteredUserIds)
      .neq('id', userId); // Exclude the requesting user

    if (profilesError) throw profilesError;

    if (!userProfiles || userProfiles.length === 0) {
      log('No user profiles found for similar users');
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total_available: 0,
          type: 'user_similarity_recommendations',
          algorithm: 'K-Nearest Neighbors User Discovery',
          k_value: k,
          users_analyzed: nearestNeighbors.length,
          similar_users_found: similarUsers.length,
          profiles_retrieved: 0,
          purpose: 'Find users for connection and friendship'
        },
        type: 'user_similarity_recommendations'
      };
    }

    log(`Retrieved ${userProfiles.length} user profiles`);

    // Step 5: Combine user profiles with similarity data
    const recommendedUsers = userProfiles.map(profile => {
      // Find the similarity data for this user
      const similarityData = similarUsers.find(user => user.userId === profile.id);
      const userSimilarity = similarityData ? similarityData.similarity : 0;
      const userDistance = similarityData ? similarityData.distance : Infinity;

      return {
        ...profile,
        knn_user_similarity_score: userSimilarity,
        knn_user_distance: userDistance,
        similarity_explanation: generateUserSimilarityExplanation(userSimilarity, profile.full_name || 'This user'),
        recommendation_source: 'knn_user_similarity',
        recommendation_type: 'user_connection_recommendation',
        recommendation_purpose: 'Find users for friendship and connection'
      };
    });

    // Step 5: Sort by user similarity score (highest similarity first)
    recommendedUsers.sort((a, b) => b.knn_user_similarity_score - a.knn_user_similarity_score);

    // Apply pagination
    const paginatedResults = recommendedUsers.slice(offset, offset + limit);

    const response = {
      recommendations: paginatedResults,
      metadata: {
        count: paginatedResults.length,
        total_available: recommendedUsers.length,
        type: 'user_similarity_recommendations',
        algorithm: 'K-Nearest Neighbors User Discovery',
        methodology: 'Find similar users for connection and friendship',
        k_value: k,
        users_analyzed: nearestNeighbors.length,
        similar_users_found: similarUsers.length,
        filtered_out_friends: similarUserIds.length - filteredUserIds.length,
        profiles_retrieved: userProfiles.length,
        min_similarity_threshold: 'DISABLED_FOR_TESTING',
        purpose: 'Find users for connection and friendship'
      },
      type: 'user_similarity_recommendations'
    };

    // Cache results
    cacheUserResults(userId, response);

    log(`=== USER RECOMMENDATIONS END ===`);
    log(`Returning ${paginatedResults.length} user recommendations for connection`);
    return response;

  } catch (error) {
    logError('Error generating user recommendations:', error);
    throw error;
  }
}

/**
 * Get user similarity statistics for a specific user
 */
async function getUserSimilarityStats(userId) {
  try {
    log(`Getting user similarity stats for user ${userId}`);

    // Get user vector
    const userVector = await getUserVector(userId);
    
    if (!userVector) {
      // Try to build vector if it doesn't exist
      try {
        const vectorResult = await buildAndStoreUserVector(userId);
        return {
          vector_exists: true,
          vector_completeness: vectorResult.completenessScore,
          vector_just_created: true,
          can_find_similar_users: vectorResult.completenessScore >= 0.05, // Temporarily lowered for testing
          recommendation_quality: vectorResult.completenessScore >= 0.15 ? 'High' :
                                 vectorResult.completenessScore >= 0.05 ? 'Medium' : 'Low'
        };
      } catch (buildError) {
        return {
          vector_exists: false,
          vector_completeness: 0,
          can_find_similar_users: false,
          recommendation_quality: 'None',
          error: 'Unable to build user vector'
        };
      }
    }

    return {
      vector_exists: true,
      vector_completeness: userVector.completeness_score,
      vector_last_updated: userVector.last_updated,
      can_find_similar_users: userVector.completeness_score >= 0.05, // Temporarily lowered for testing
      recommendation_quality: userVector.completeness_score >= 0.15 ? 'High' :
                             userVector.completeness_score >= 0.05 ? 'Medium' : 'Low'
    };

  } catch (error) {
    logError('Error getting user similarity stats:', error);
    return {
      vector_exists: false,
      vector_completeness: 0,
      can_find_similar_users: false,
      recommendation_quality: 'None',
      error: error.message
    };
  }
}

/**
 * Cache management functions for user recommendations
 */
function isUserCacheValid(userId) {
  return userRecommendationCache.userId === userId && 
         userRecommendationCache.data && 
         (Date.now() - userRecommendationCache.timestamp) < USER_CACHE_DURATION;
}

function cacheUserResults(userId, data) {
  userRecommendationCache = {
    userId,
    data,
    timestamp: Date.now()
  };
}

function clearUserRecommendationCache() {
  userRecommendationCache = {
    data: null,
    timestamp: 0,
    userId: null
  };
}

/**
 * Check if user has sufficient data for quality recommendations
 */
async function canGenerateQualityRecommendations(userId) {
  try {
    const stats = await getUserSimilarityStats(userId);
    return {
      canGenerate: stats.can_find_similar_users,
      quality: stats.recommendation_quality,
      completeness: stats.vector_completeness,
      suggestions: stats.vector_completeness < 0.05 ? [ // Temporarily lowered for testing
        'Add sport preferences to your profile',
        'Set your available hours for playing',
        'Select preferred facilities',
        'Complete your faculty and campus information'
      ] : []
    };
  } catch (error) {
    logError('Error checking recommendation capability:', error);
    return {
      canGenerate: false,
      quality: 'None',
      completeness: 0,
      suggestions: ['Complete your profile to get user recommendations']
    };
  }
}

export {
  getUserRecommendations,
  getUserSimilarityStats,
  canGenerateQualityRecommendations,
  clearUserRecommendationCache
};
