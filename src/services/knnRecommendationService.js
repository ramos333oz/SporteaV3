import { supabase } from './supabase';
import { buildAndStoreUserVector, getUserVector } from './knnVectorService';

/**
 * KNN User Recommendation Service
 *
 * Implements K-Nearest Neighbors USER recommendation system using unweighted Euclidean distance
 * Following TEMPLATE.md methodology for user similarity-based recommendations
 *
 * Core Concept (TEMPLATE.md lines 11-15):
 * - Find users with similar profiles/preferences (not matches)
 * - Calculate Euclidean distances between user vectors to determine user similarity
 * - Recommend matches created by similar users
 * - Provide explanations based on user similarity scores
 *
 * Mathematical Foundation (TEMPLATE.md lines 61-63):
 * Euclidean Distance = √[(x₁-y₁)² + (x₂-y₂)² + ... + (x₁₄₂-y₁₄₂)²]
 * Lower distance = Higher user similarity
 */

const DEBUG_MODE = process.env.NODE_ENV !== 'production';
const LOG_PREFIX = '[KNN Recommendation Service]';

// Cache configuration
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
let knnCache = {
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
 * Display user vector with labeled components for debugging
 */
function displayUserVector(vector, userId, userProfile = null) {
  log(`\n📊 === USER VECTOR DISPLAY: ${userId} ===`);

  if (userProfile) {
    log(`👤 Profile Info:`);
    log(`   Name: ${userProfile.full_name || 'Unknown'}`);
    log(`   Faculty: ${userProfile.faculty || 'Unknown'}`);
    log(`   Campus: ${userProfile.campus || 'Unknown'}`);
    log(`   Sports: ${userProfile.sport_preferences ? userProfile.sport_preferences.map(s => `${s.sport} (${s.skill_level})`).join(', ') : 'None'}`);
  }

  log(`\n🔢 Vector Components (142 elements):`);

  // Sport-Skills (0-32)
  const sportSkills = vector.slice(0, 33);
  const activeSkills = sportSkills.map((val, idx) => val > 0 ? `pos${idx}:${val}` : null).filter(Boolean);
  log(`🏀 Sport-Skills (0-32): [${activeSkills.length > 0 ? activeSkills.join(', ') : 'none'}]`);

  // Faculty (33-39)
  const faculty = vector.slice(33, 40);
  const activeFaculty = faculty.map((val, idx) => val > 0 ? `pos${33+idx}:${val}` : null).filter(Boolean);
  log(`🎓 Faculty (33-39): [${activeFaculty.length > 0 ? activeFaculty.join(', ') : 'none'}]`);

  // Campus (40-52)
  const campus = vector.slice(40, 53);
  const activeCampus = campus.map((val, idx) => val > 0 ? `pos${40+idx}:${val}` : null).filter(Boolean);
  log(`🏫 Campus (40-52): [${activeCampus.length > 0 ? activeCampus.join(', ') : 'none'}]`);

  // Gender (53-56)
  const gender = vector.slice(53, 57);
  const activeGender = gender.map((val, idx) => val > 0 ? `pos${53+idx}:${val}` : null).filter(Boolean);
  log(`👤 Gender (53-56): [${activeGender.length > 0 ? activeGender.join(', ') : 'none'}]`);

  // Play Style (57-58)
  const playStyle = vector.slice(57, 59);
  const activePlayStyle = playStyle.map((val, idx) => val > 0 ? `pos${57+idx}:${val}` : null).filter(Boolean);
  log(`🎮 Play Style (57-58): [${activePlayStyle.length > 0 ? activePlayStyle.join(', ') : 'none'}]`);

  // Time Slots (59-107)
  const timeSlots = vector.slice(59, 108);
  const activeTimeSlots = timeSlots.map((val, idx) => val > 0 ? `pos${59+idx}:${val}` : null).filter(Boolean);
  log(`⏰ Time Slots (59-107): [${activeTimeSlots.length} active slots]`);
  if (activeTimeSlots.length > 0 && activeTimeSlots.length <= 10) {
    log(`   Active: ${activeTimeSlots.join(', ')}`);
  }

  // Facilities (108-136)
  const facilities = vector.slice(108, 137);
  const activeFacilities = facilities.map((val, idx) => val > 0 ? `pos${108+idx}:${val}` : null).filter(Boolean);
  log(`🏟️ Facilities (108-136): [${activeFacilities.length > 0 ? activeFacilities.join(', ') : 'none'}]`);

  // Padding (137-141)
  const padding = vector.slice(137, 142);
  const activePadding = padding.map((val, idx) => val > 0 ? `pos${137+idx}:${val}` : null).filter(Boolean);
  log(`📦 Padding (137-141): [${activePadding.length > 0 ? activePadding.join(', ') : 'none'}]`);

  // Summary
  const totalActiveElements = vector.filter(val => val > 0).length;
  const vectorCompleteness = (totalActiveElements / 142 * 100).toFixed(1);
  log(`\n📈 Vector Summary:`);
  log(`   Active elements: ${totalActiveElements}/142 (${vectorCompleteness}% complete)`);
  log(`   Vector magnitude: ${Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)).toFixed(6)}`);
}

/**
 * Calculate unweighted Euclidean distance between two 142-element vectors with detailed logging
 * Following TEMPLATE.md methodology (lines 61-63): √[(x₁-y₁)² + (x₂-y₂)² + ... + (x₁₃₇-y₁₃₇)²]
 *
 * NOTE: Only calculates over meaningful vector elements (0-136), excluding padding elements (137-141)
 * This ensures similarity scores reflect actual user preferences, not unused padding positions.
 */
function calculateEuclideanDistance(vector1, vector2, userId1 = 'User1', userId2 = 'User2', enableDetailedLogging = true) {
  if (vector1.length !== vector2.length || vector1.length !== 142) {
    throw new Error('Vectors must be 142-dimensional');
  }

  if (enableDetailedLogging) {
    log(`\n🔍 === DETAILED EUCLIDEAN DISTANCE CALCULATION ===`);
    log(`📊 Comparing ${userId1} vs ${userId2}`);
    log(`📐 Formula: √[(x₁-y₁)² + (x₂-y₂)² + ... + (x₁₄₂-y₁₄₂)²]`);
    log(`\n📋 Vector Structure (142 elements):`);
    log(`   • Sport-Skills: positions 0-32 (33 elements)`);
    log(`   • Faculty: positions 33-39 (7 elements)`);
    log(`   • Campus/State: positions 40-52 (13 elements)`);
    log(`   • Gender: positions 53-56 (4 elements)`);
    log(`   • Play Style: positions 57-58 (2 elements)`);
    log(`   • Time Slots: positions 59-107 (49 elements)`);
    log(`   • Facilities: positions 108-136 (29 elements)`);
    log(`   • Padding: positions 137-141 (5 elements)`);
  }

  let sum = 0;
  const componentBreakdown = {
    sportSkills: { start: 0, end: 32, sum: 0, differences: [] },
    faculty: { start: 33, end: 39, sum: 0, differences: [] },
    campus: { start: 40, end: 52, sum: 0, differences: [] },
    gender: { start: 53, end: 56, sum: 0, differences: [] },
    playStyle: { start: 57, end: 58, sum: 0, differences: [] },
    timeSlots: { start: 59, end: 107, sum: 0, differences: [] },
    facilities: { start: 108, end: 136, sum: 0, differences: [] },
    padding: { start: 137, end: 141, sum: 0, differences: [] }
  };

  // Calculate sum of squared differences for meaningful elements only (0-136)
  // Exclude padding elements (137-141) from similarity calculation
  for (let i = 0; i < 137; i++) {
    const diff = vector1[i] - vector2[i];
    const squaredDiff = diff * diff;
    sum += squaredDiff;

    // Categorize the difference by component
    for (const [componentName, component] of Object.entries(componentBreakdown)) {
      if (i >= component.start && i <= component.end) {
        component.sum += squaredDiff;
        if (squaredDiff > 0) { // Only log non-zero differences
          component.differences.push({
            position: i,
            user1Value: vector1[i],
            user2Value: vector2[i],
            difference: diff,
            squaredDiff: squaredDiff
          });
        }
        break;
      }
    }
  }

  const distance = Math.sqrt(sum);

  if (enableDetailedLogging) {
    log(`\n📊 COMPONENT-BY-COMPONENT BREAKDOWN:`);

    for (const [componentName, component] of Object.entries(componentBreakdown)) {
      const componentDistance = Math.sqrt(component.sum);
      const isExcluded = componentName === 'padding';
      const statusIcon = isExcluded ? '🚫' : '🔸';
      const statusText = isExcluded ? ' (EXCLUDED FROM CALCULATION)' : '';

      log(`\n${statusIcon} ${componentName.toUpperCase()} (positions ${component.start}-${component.end})${statusText}:`);

      if (isExcluded) {
        log(`   ⚠️  Padding elements excluded from similarity calculation`);
        log(`   ℹ️  These positions don't represent actual user preferences`);
      } else {
        log(`   Sum of squared differences: ${component.sum.toFixed(6)}`);
        log(`   Component distance: ${componentDistance.toFixed(6)}`);

        if (component.differences.length > 0) {
          log(`   Non-zero differences (${component.differences.length}):`);
          component.differences.forEach(diff => {
            log(`     Position ${diff.position}: ${diff.user1Value} - ${diff.user2Value} = ${diff.difference} → (${diff.difference})² = ${diff.squaredDiff}`);
          });
        } else {
          log(`   ✅ Perfect match - no differences`);
        }
      }
    }

    log(`\n🧮 FINAL CALCULATION:`);
    log(`   Total sum of squared differences: ${sum.toFixed(6)} (meaningful elements only)`);
    log(`   Euclidean distance: √${sum.toFixed(6)} = ${distance.toFixed(6)}`);
    log(`   Max possible distance: √137 = ${Math.sqrt(137).toFixed(6)} (excluding padding)`);
  }

  return distance;
}

/**
 * Convert Euclidean distance to similarity score with detailed logging
 * Lower distance = Higher similarity
 * Following TEMPLATE.md methodology: Similarity = 1 - (distance / max_distance)
 *
 * NOTE: Uses √137 as max distance since we exclude padding elements (137-141) from calculation
 */
function distanceToSimilarity(distance, maxDistance = Math.sqrt(137), enableDetailedLogging = true) {
  // Normalize distance to 0-1 range and invert for similarity
  const normalizedDistance = Math.min(distance / maxDistance, 1);
  const similarity = 1 - normalizedDistance;

  if (enableDetailedLogging) {
    log(`\n🎯 === DISTANCE TO SIMILARITY CONVERSION ===`);
    log(`📏 Euclidean distance: ${distance.toFixed(6)}`);
    log(`📐 Max possible distance: √137 = ${maxDistance.toFixed(6)} (excluding padding)`);
    log(`📊 Normalized distance: ${distance.toFixed(6)} / ${maxDistance.toFixed(6)} = ${normalizedDistance.toFixed(6)}`);
    log(`🎯 Similarity score: 1 - ${normalizedDistance.toFixed(6)} = ${similarity.toFixed(6)}`);
    log(`📈 Similarity percentage: ${(similarity * 100).toFixed(1)}%`);

    // Provide interpretation
    if (similarity >= 0.8) {
      log(`💚 Interpretation: Very High Similarity (${(similarity * 100).toFixed(1)}%)`);
    } else if (similarity >= 0.6) {
      log(`💛 Interpretation: High Similarity (${(similarity * 100).toFixed(1)}%)`);
    } else if (similarity >= 0.4) {
      log(`🧡 Interpretation: Moderate Similarity (${(similarity * 100).toFixed(1)}%)`);
    } else if (similarity >= 0.2) {
      log(`❤️ Interpretation: Low Similarity (${(similarity * 100).toFixed(1)}%)`);
    } else {
      log(`💔 Interpretation: Very Low Similarity (${(similarity * 100).toFixed(1)}%)`);
    }
  }

  return similarity;
}

/**
 * Get cached similarity or calculate and cache it
 */
async function getCachedSimilarity(userId1, userId2, vector1, vector2, version1, version2) {
  try {
    // Check if similarity is already cached
    const { data: cached, error: cacheError } = await supabase
      .from('user_similarity_cache_knn')
      .select('euclidean_distance, similarity_score')
      .or(`and(user_id_1.eq.${userId1},user_id_2.eq.${userId2}),and(user_id_1.eq.${userId2},user_id_2.eq.${userId1})`)
      .single();

    if (!cacheError && cached) {
      return {
        distance: cached.euclidean_distance,
        similarity: cached.similarity_score,
        fromCache: true
      };
    }

    // Calculate new similarity with detailed logging
    log(`\n🚀 === FRESH SIMILARITY CALCULATION ===`);
    log(`👥 Users: ${userId1} vs ${userId2}`);

    // Display both user vectors for comparison
    displayUserVector(vector1, userId1);
    displayUserVector(vector2, userId2);

    const distance = calculateEuclideanDistance(vector1, vector2, userId1, userId2, true);
    const similarity = distanceToSimilarity(distance, Math.sqrt(137), true);

    // Cache the result (ensure consistent ordering: smaller ID first)
    const [smallerId, largerId] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    const [smallerVersion, largerVersion] = userId1 < userId2 ? [version1, version2] : [version2, version1];

    await supabase
      .from('user_similarity_cache_knn')
      .upsert({
        user_id_1: smallerId,
        user_id_2: largerId,
        euclidean_distance: distance,
        similarity_score: similarity,
        vector_version_1: smallerVersion,
        vector_version_2: largerVersion
      }, {
        onConflict: 'user_id_1,user_id_2'
      });

    return {
      distance,
      similarity,
      fromCache: false
    };

  } catch (error) {
    // Fallback to direct calculation if caching fails
    logError('Cache operation failed, falling back to direct calculation:', error);
    const distance = calculateEuclideanDistance(vector1, vector2, userId1, userId2, false); // Disable detailed logging for fallback
    const similarity = distanceToSimilarity(distance, Math.sqrt(137), false);
    return { distance, similarity, fromCache: false };
  }
}

/**
 * Find K nearest neighbors for a user with caching optimization
 */
async function findKNearestNeighbors(userId, k = 10) {
  try {
    log(`Finding ${k} nearest neighbors for user ${userId}`);

    // Get or build user vector
    let userVector = await getUserVector(userId);
    if (!userVector) {
      log('User vector not found, building new vector');
      const vectorResult = await buildAndStoreUserVector(userId);
      userVector = vectorResult.stored;
    }

    if (!userVector || !userVector.vector_data) {
      throw new Error('Unable to get user vector');
    }

    // Get all other user vectors for comparison
    const { data: otherVectors, error } = await supabase
      .from('user_vectors_knn')
      .select('user_id, vector_data, completeness_score, vector_version')
      .neq('user_id', userId)
      .gte('completeness_score', 0.05); // Temporarily lowered for testing - consider users with basic completeness

    if (error) throw error;

    if (!otherVectors || otherVectors.length === 0) {
      log('No other user vectors found for comparison');
      return [];
    }

    log(`Comparing with ${otherVectors.length} other user vectors`);

    // Calculate distances to all other users with caching
    const distances = [];
    let cacheHits = 0;

    for (const otherUser of otherVectors) {
      const result = await getCachedSimilarity(
        userId,
        otherUser.user_id,
        userVector.vector_data,
        otherUser.vector_data,
        userVector.vector_version,
        otherUser.vector_version
      );

      if (result.fromCache) cacheHits++;

      distances.push({
        userId: otherUser.user_id,
        distance: result.distance,
        similarity: result.similarity,
        completenessScore: otherUser.completeness_score
      });
    }

    log(`Cache hits: ${cacheHits}/${otherVectors.length} (${Math.round(cacheHits/otherVectors.length*100)}%)`);

    // Sort by distance (ascending) and take top K
    distances.sort((a, b) => a.distance - b.distance);
    const kNearest = distances.slice(0, k);

    // Enhanced logging for K nearest neighbors results
    log(`\n🎯 === K NEAREST NEIGHBORS RESULTS ===`);
    log(`👤 Target User: ${userId}`);
    log(`🔍 Requested K: ${k}`);
    log(`📊 Found: ${kNearest.length} nearest neighbors`);
    log(`\n📋 Top ${Math.min(k, kNearest.length)} Most Similar Users:`);

    kNearest.forEach((neighbor, index) => {
      const rank = index + 1;
      const similarityPercent = (neighbor.similarity * 100).toFixed(1);
      log(`   ${rank}. User ${neighbor.userId}:`);
      log(`      Distance: ${neighbor.distance.toFixed(6)}`);
      log(`      Similarity: ${neighbor.similarity.toFixed(6)} (${similarityPercent}%)`);
      log(`      Completeness: ${(neighbor.completenessScore * 100).toFixed(1)}%`);
    });

    if (kNearest.length > 0) {
      const avgSimilarity = kNearest.reduce((sum, n) => sum + n.similarity, 0) / kNearest.length;
      const maxSimilarity = kNearest[0].similarity;
      const minSimilarity = kNearest[kNearest.length - 1].similarity;

      log(`\n📈 Similarity Statistics:`);
      log(`   Highest similarity: ${(maxSimilarity * 100).toFixed(1)}%`);
      log(`   Lowest similarity: ${(minSimilarity * 100).toFixed(1)}%`);
      log(`   Average similarity: ${(avgSimilarity * 100).toFixed(1)}%`);
    }

    return kNearest;

  } catch (error) {
    logError('Error finding K nearest neighbors:', error);
    throw error;
  }
}

/**
 * Get user recommendations based on KNN algorithm
 * Following TEMPLATE.md user recommendation methodology:
 * 1. Find K nearest neighbor users (most similar users)
 * 2. Recommend matches created by those similar users
 * 3. Provide explanations based on user similarity
 */
async function getKNNRecommendations(userId, options = {}) {
  try {
    const { limit = 10, offset = 0, minSimilarity = 0.3, k = 20 } = options;

    log(`=== KNN USER RECOMMENDATIONS START ===`);
    log(`User: ${userId}, K: ${k}, Limit: ${limit}, Min User Similarity: ${minSimilarity}`);

    // Check cache first
    if (isCacheValid(userId)) {
      log('Returning cached KNN user recommendations');
      return knnCache.data;
    }

    // Step 1: Find K nearest neighbor users (TEMPLATE.md methodology)
    const nearestNeighbors = await findKNearestNeighbors(userId, k);

    if (nearestNeighbors.length === 0) {
      log('No similar users found');
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total_available: 0,
          type: 'knn_user_similarity',
          algorithm: 'K-Nearest Neighbors User Recommendation (TEMPLATE.md)',
          k_value: k,
          similar_users_found: 0
        },
        type: 'knn_user_similarity'
      };
    }

    // Step 2: Filter users by minimum similarity threshold
    const similarUsers = nearestNeighbors.filter(neighbor => neighbor.similarity >= minSimilarity);

    if (similarUsers.length === 0) {
      log(`No users meet minimum similarity threshold of ${minSimilarity}`);
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total_available: 0,
          type: 'knn_user_similarity',
          algorithm: 'K-Nearest Neighbors User Recommendation (TEMPLATE.md)',
          k_value: k,
          users_analyzed: nearestNeighbors.length,
          similar_users_found: 0,
          min_similarity_threshold: minSimilarity
        },
        type: 'knn_user_similarity'
      };
    }

    log(`Found ${similarUsers.length} similar users (${nearestNeighbors.length} total analyzed)`);

    // Step 3: Get matches created by similar users (TEMPLATE.md workflow)
    const similarUserIds = similarUsers.map(user => user.userId);

    const { data: userCreatedMatches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        sports(name),
        users!matches_host_id_fkey(id, name, faculty),
        locations(name, campus, image_url)
      `)
      .in('host_id', similarUserIds)
      .neq('host_id', userId) // Exclude user's own matches
      .gte('start_time', new Date().toISOString())
      .eq('status', 'upcoming')
      .not('moderation_status', 'in', '(flagged,rejected,pending_review)')
      .order('start_time', { ascending: true });

    if (matchesError) throw matchesError;

    if (!userCreatedMatches || userCreatedMatches.length === 0) {
      log('No matches found created by similar users');
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total_available: 0,
          type: 'knn_user_similarity',
          algorithm: 'K-Nearest Neighbors User Recommendation (TEMPLATE.md)',
          k_value: k,
          users_analyzed: nearestNeighbors.length,
          similar_users_found: similarUsers.length,
          matches_by_similar_users: 0
        },
        type: 'knn_user_similarity'
      };
    }

    log(`Found ${userCreatedMatches.length} matches created by similar users`);

    // Step 4: Score matches based on creator's similarity to target user
    const scoredMatches = userCreatedMatches.map(match => {
      // Find the similar user who created this match
      const matchCreator = similarUsers.find(user => user.userId === match.host_id);
      const creatorSimilarity = matchCreator ? matchCreator.similarity : 0;
      const creatorDistance = matchCreator ? matchCreator.distance : Infinity;

      return {
        ...match,
        knn_user_similarity_score: creatorSimilarity,
        knn_user_distance: creatorDistance,
        similar_user_id: matchCreator ? matchCreator.userId : null,
        explanation: generateUserSimilarityExplanation(creatorSimilarity, match.users?.name || 'Unknown'),
        recommendation_source: 'knn_similar_user_match',
        recommendation_type: 'user_similarity_based'
      };
    });

    // Step 5: Sort by user similarity score (highest similarity first)
    scoredMatches.sort((a, b) => b.knn_user_similarity_score - a.knn_user_similarity_score);

    // Apply pagination
    const paginatedResults = scoredMatches.slice(offset, offset + limit);

    const response = {
      recommendations: paginatedResults,
      metadata: {
        count: paginatedResults.length,
        total_available: scoredMatches.length,
        type: 'knn_user_similarity',
        algorithm: 'K-Nearest Neighbors User Recommendation (TEMPLATE.md)',
        methodology: 'Find similar users, recommend their matches',
        k_value: k,
        users_analyzed: nearestNeighbors.length,
        similar_users_found: similarUsers.length,
        matches_by_similar_users: userCreatedMatches.length,
        min_similarity_threshold: minSimilarity
      },
      type: 'knn_user_similarity'
    };

    // Cache results
    cacheResults(userId, response);

    log(`=== KNN USER RECOMMENDATIONS END ===`);
    log(`Returning ${paginatedResults.length} recommendations based on ${similarUsers.length} similar users`);
    return response;

  } catch (error) {
    logError('Error generating KNN user recommendations:', error);
    throw error;
  }
}

/**
 * Generate explanation for user similarity-based recommendation
 * Following TEMPLATE.md explanation methodology (lines 148-156)
 */
function generateUserSimilarityExplanation(userSimilarity, creatorName) {
  const similarityPercentage = Math.round(userSimilarity * 100);

  if (userSimilarity >= 0.8) {
    return `${creatorName} has ${similarityPercentage}% similar preferences to you and created this match`;
  } else if (userSimilarity >= 0.6) {
    return `${creatorName} shares ${similarityPercentage}% of your sports preferences and created this match`;
  } else if (userSimilarity >= 0.4) {
    return `${creatorName} has ${similarityPercentage}% similar profile to you and created this match`;
  } else {
    return `${creatorName} (${similarityPercentage}% profile similarity) created this match`;
  }
}

/**
 * Get detailed similarity breakdown for explanation
 * Following TEMPLATE.md similarity breakdown (lines 150-156)
 */
function generateDetailedSimilarityBreakdown(userSimilarity, creatorName) {
  const similarityPercentage = Math.round(userSimilarity * 100);

  return {
    main_explanation: generateUserSimilarityExplanation(userSimilarity, creatorName),
    similarity_percentage: similarityPercentage,
    similarity_level: userSimilarity >= 0.8 ? 'High' :
                     userSimilarity >= 0.6 ? 'Good' :
                     userSimilarity >= 0.4 ? 'Moderate' : 'Low',
    recommendation_reason: 'User with similar preferences created this match',
    methodology: 'K-Nearest Neighbors User Similarity (TEMPLATE.md)'
  };
}

/**
 * Cache management functions
 */
function isCacheValid(userId) {
  return knnCache.userId === userId && 
         knnCache.data && 
         (Date.now() - knnCache.timestamp) < CACHE_DURATION;
}

function cacheResults(userId, data) {
  knnCache = {
    userId,
    data,
    timestamp: Date.now()
  };
}

function clearKNNCache() {
  knnCache = {
    data: null,
    timestamp: 0,
    userId: null
  };
}

/**
 * Clear both in-memory cache and database cache for a specific user
 * This ensures complete cache invalidation when user preferences change
 */
async function clearAllKNNCaches(userId) {
  try {
    // Clear in-memory cache
    clearKNNCache();

    // Clear database cache entries involving this user
    const { error } = await supabase
      .from('user_similarity_cache_knn')
      .delete()
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    if (error) {
      logError('Failed to clear database cache for user:', userId, error);
    } else {
      log('Cleared all KNN caches (memory + database) for user:', userId);
    }
  } catch (error) {
    logError('Error clearing all KNN caches:', error);
  }
}

export {
  getKNNRecommendations,
  findKNearestNeighbors,
  calculateEuclideanDistance,
  distanceToSimilarity,
  generateUserSimilarityExplanation,
  generateDetailedSimilarityBreakdown,
  clearKNNCache,
  clearAllKNNCaches
};
