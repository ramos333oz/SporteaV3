import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * KNN User Recommendations Edge Function
 * 
 * Implements K-Nearest Neighbors user recommendation system as a Supabase Edge Function
 * Following TEMPLATE.md methodology for user similarity-based recommendations
 * 
 * Performance optimized for UiTM student base scalability
 */

interface UserVector {
  user_id: string;
  vector_data: number[];
  completeness_score: number;
  vector_version: number;
}

interface KNNRequest {
  userId: string;
  k?: number;
  minSimilarity?: number;
  limit?: number;
  offset?: number;
}

interface KNNResponse {
  recommendations: any[];
  metadata: {
    count: number;
    total_available: number;
    type: string;
    algorithm: string;
    k_value: number;
    users_analyzed: number;
    similar_users_found: number;
    matches_by_similar_users: number;
    min_similarity_threshold: number;
  };
  type: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Calculate unweighted Euclidean distance between two 142-element vectors
 * Following TEMPLATE.md methodology (lines 61-63)
 *
 * NOTE: Only calculates over meaningful vector elements (0-136), excluding padding elements (137-141)
 * This ensures similarity scores reflect actual user preferences, not unused padding positions.
 */
function calculateEuclideanDistance(vector1: number[], vector2: number[]): number {
  if (vector1.length !== vector2.length || vector1.length !== 142) {
    throw new Error('Vectors must be 142-dimensional');
  }

  let sum = 0;
  // Calculate sum of squared differences for meaningful elements only (0-136)
  // Exclude padding elements (137-141) from similarity calculation
  for (let i = 0; i < 137; i++) {
    const diff = vector1[i] - vector2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Convert Euclidean distance to similarity score
 *
 * NOTE: Uses √137 as max distance since we exclude padding elements (137-141) from calculation
 */
function distanceToSimilarity(distance: number, maxDistance: number = Math.sqrt(137)): number {
  const normalizedDistance = Math.min(distance / maxDistance, 1);
  return 1 - normalizedDistance;
}

/**
 * Generate user similarity explanation
 */
function generateUserSimilarityExplanation(userSimilarity: number, creatorName: string): string {
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
 * Get or build user vector
 */
async function getUserVector(userId: string): Promise<UserVector | null> {
  try {
    const { data, error } = await supabase
      .from('user_vectors_knn')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error getting user vector:', error);
    return null;
  }
}

/**
 * Find K nearest neighbor users
 */
async function findKNearestNeighbors(userId: string, k: number = 20): Promise<any[]> {
  try {
    // Get user vector
    const userVector = await getUserVector(userId);
    if (!userVector || !userVector.vector_data) {
      throw new Error('User vector not found');
    }

    // Get all other user vectors
    const { data: otherVectors, error } = await supabase
      .from('user_vectors_knn')
      .select('user_id, vector_data, completeness_score, vector_version')
      .neq('user_id', userId)
      .gte('completeness_score', 0.3);

    if (error) throw error;
    if (!otherVectors || otherVectors.length === 0) return [];

    // Calculate distances to all other users
    const distances = otherVectors.map(otherUser => {
      const distance = calculateEuclideanDistance(userVector.vector_data, otherUser.vector_data);
      const similarity = distanceToSimilarity(distance);

      return {
        userId: otherUser.user_id,
        distance,
        similarity,
        completenessScore: otherUser.completeness_score
      };
    });

    // Sort by distance and take top K
    distances.sort((a, b) => a.distance - b.distance);
    return distances.slice(0, k);

  } catch (error) {
    console.error('Error finding K nearest neighbors:', error);
    throw error;
  }
}

/**
 * Main KNN recommendations function
 */
async function getKNNRecommendations(request: KNNRequest): Promise<KNNResponse> {
  try {
    const { userId, k = 20, minSimilarity = 0.3, limit = 10, offset = 0 } = request;

    console.log(`KNN Edge Function: Processing request for user ${userId}`);

    // Find K nearest neighbor users
    const nearestNeighbors = await findKNearestNeighbors(userId, k);
    
    if (nearestNeighbors.length === 0) {
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total_available: 0,
          type: 'knn_user_similarity_edge',
          algorithm: 'K-Nearest Neighbors User Recommendation (Edge Function)',
          k_value: k,
          users_analyzed: 0,
          similar_users_found: 0,
          matches_by_similar_users: 0,
          min_similarity_threshold: minSimilarity
        },
        type: 'knn_user_similarity_edge'
      };
    }

    // Filter by minimum similarity
    const similarUsers = nearestNeighbors.filter(neighbor => neighbor.similarity >= minSimilarity);
    
    if (similarUsers.length === 0) {
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total_available: 0,
          type: 'knn_user_similarity_edge',
          algorithm: 'K-Nearest Neighbors User Recommendation (Edge Function)',
          k_value: k,
          users_analyzed: nearestNeighbors.length,
          similar_users_found: 0,
          matches_by_similar_users: 0,
          min_similarity_threshold: minSimilarity
        },
        type: 'knn_user_similarity_edge'
      };
    }

    // Get matches created by similar users
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
      .neq('host_id', userId)
      .gte('start_time', new Date().toISOString())
      .eq('status', 'upcoming')
      .not('moderation_status', 'in', '(flagged,rejected,pending_review)')
      .order('start_time', { ascending: true });

    if (matchesError) throw matchesError;

    if (!userCreatedMatches || userCreatedMatches.length === 0) {
      return {
        recommendations: [],
        metadata: {
          count: 0,
          total_available: 0,
          type: 'knn_user_similarity_edge',
          algorithm: 'K-Nearest Neighbors User Recommendation (Edge Function)',
          k_value: k,
          users_analyzed: nearestNeighbors.length,
          similar_users_found: similarUsers.length,
          matches_by_similar_users: 0,
          min_similarity_threshold: minSimilarity
        },
        type: 'knn_user_similarity_edge'
      };
    }

    // Score matches based on creator similarity
    const scoredMatches = userCreatedMatches.map(match => {
      const matchCreator = similarUsers.find(user => user.userId === match.host_id);
      const creatorSimilarity = matchCreator ? matchCreator.similarity : 0;
      const creatorDistance = matchCreator ? matchCreator.distance : Infinity;

      return {
        ...match,
        knn_user_similarity_score: creatorSimilarity,
        knn_user_distance: creatorDistance,
        similar_user_id: matchCreator ? matchCreator.userId : null,
        explanation: generateUserSimilarityExplanation(creatorSimilarity, match.users?.name || 'Unknown'),
        recommendation_source: 'knn_similar_user_match_edge',
        recommendation_type: 'user_similarity_based_edge'
      };
    });

    // Sort by user similarity score
    scoredMatches.sort((a, b) => b.knn_user_similarity_score - a.knn_user_similarity_score);

    // Apply pagination
    const paginatedResults = scoredMatches.slice(offset, offset + limit);

    console.log(`KNN Edge Function: Returning ${paginatedResults.length} recommendations`);

    return {
      recommendations: paginatedResults,
      metadata: {
        count: paginatedResults.length,
        total_available: scoredMatches.length,
        type: 'knn_user_similarity_edge',
        algorithm: 'K-Nearest Neighbors User Recommendation (Edge Function)',
        k_value: k,
        users_analyzed: nearestNeighbors.length,
        similar_users_found: similarUsers.length,
        matches_by_similar_users: userCreatedMatches.length,
        min_similarity_threshold: minSimilarity
      },
      type: 'knn_user_similarity_edge'
    };

  } catch (error) {
    console.error('Error in KNN Edge Function:', error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requestData: KNNRequest = await req.json();
    
    if (!requestData.userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await getKNNRecommendations(requestData);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
