import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface UserSimilarityRequest {
  userId: string;
  limit?: number;
  offset?: number;
  filters?: {
    minScore?: number;
    sameGender?: boolean;
    sameCampus?: boolean;
  };
}

interface SimilarUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  faculty?: string;
  campus?: string;
  sport_preferences: any[];
  similarity_score: number;
  similarity_factors: SimilarityFactors;
  reason_codes: string[];
}

interface SimilarityFactors {
  vectorSimilarity: number;
  behaviorMatch: number;
  skillCompatibility: number;
  proximityFactor: number;
  availabilityOverlap: number;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Calculate behavior match based on play style and preferences
function calculateBehaviorMatch(userA: any, userB: any): number {
  let score = 0.5; // Base score

  // Play style match (40% of behavior score)
  if (userA.play_style && userB.play_style) {
    if (userA.play_style === userB.play_style) {
      score += 0.4;
    } else {
      score += 0.1; // Different but specified
    }
  } else {
    score += 0.2; // Neutral if one or both unspecified
  }

  // Sport preferences overlap (60% of behavior score)
  if (userA.sport_preferences && userB.sport_preferences) {
    const sportsA = Array.isArray(userA.sport_preferences) 
      ? userA.sport_preferences.map((s: any) => s.name || s).filter(Boolean)
      : Object.keys(userA.sport_preferences).filter(key => userA.sport_preferences[key]);
    
    const sportsB = Array.isArray(userB.sport_preferences)
      ? userB.sport_preferences.map((s: any) => s.name || s).filter(Boolean)
      : Object.keys(userB.sport_preferences).filter(key => userB.sport_preferences[key]);

    if (sportsA.length > 0 && sportsB.length > 0) {
      const commonSports = sportsA.filter((sport: string) => sportsB.includes(sport));
      const overlapRatio = commonSports.length / Math.max(sportsA.length, sportsB.length);
      score += overlapRatio * 0.6;
    } else {
      score += 0.1; // Low score if preferences missing
    }
  } else {
    score += 0.1; // Low score if preferences missing
  }

  return Math.min(score, 1.0);
}

// Calculate skill compatibility
function calculateSkillCompatibility(userA: any, userB: any): number {
  // For now, return a moderate score since skill levels are basic
  // This can be enhanced when more detailed skill data is available
  return 0.6;
}

// Calculate proximity factor based on campus and location
function calculateProximityFactor(userA: any, userB: any): number {
  let score = 0.3; // Base score

  // Campus match (70% of proximity score)
  if (userA.campus && userB.campus) {
    if (userA.campus === userB.campus) {
      score += 0.7;
    } else {
      score += 0.1; // Different campus but specified
    }
  } else {
    score += 0.2; // Neutral if campus not specified
  }

  // Faculty match (30% of proximity score)
  if (userA.faculty && userB.faculty) {
    if (userA.faculty === userB.faculty) {
      score += 0.3;
    } else {
      score += 0.1; // Different faculty but specified
    }
  } else {
    score += 0.1; // Neutral if faculty not specified
  }

  return Math.min(score, 1.0);
}

// Calculate availability overlap
function calculateAvailabilityOverlap(userA: any, userB: any): number {
  if (!userA.available_days || !userB.available_days) {
    return 0.3; // Low score if availability not specified
  }

  const daysA = Array.isArray(userA.available_days) ? userA.available_days : [];
  const daysB = Array.isArray(userB.available_days) ? userB.available_days : [];

  if (daysA.length === 0 || daysB.length === 0) {
    return 0.3; // Low score if no days specified
  }

  const commonDays = daysA.filter((day: string) => daysB.includes(day));
  const overlapRatio = commonDays.length / Math.max(daysA.length, daysB.length);

  return overlapRatio;
}

// Generate reason codes for the recommendation
function generateReasonCodes(factors: SimilarityFactors, userA: any, userB: any): string[] {
  const reasons: string[] = [];

  if (factors.vectorSimilarity > 0.7) {
    reasons.push('similar_preferences');
  }

  if (factors.skillCompatibility > 0.7) {
    reasons.push('skill_match');
  }

  if (factors.proximityFactor > 0.8) {
    reasons.push('same_location');
  }

  if (factors.availabilityOverlap > 0.6) {
    reasons.push('similar_schedule');
  }

  if (userA.play_style === userB.play_style) {
    reasons.push('same_play_style');
  }

  if (userA.campus === userB.campus) {
    reasons.push('same_campus');
  }

  return reasons.length > 0 ? reasons : ['general_compatibility'];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, limit = 10, offset = 0, filters = {} }: UserSimilarityRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing user similarity for user: ${userId}`);

    // Get the current user's data
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select(`
        id, full_name, username, avatar_url, faculty, campus, gender, play_style,
        sport_preferences, preference_vector, available_days, available_hours,
        preferred_facilities, home_location
      `)
      .eq('id', userId)
      .single();

    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if current user has preference vector
    const hasPreferenceVector = !!currentUser.preference_vector;
    console.log(`Current user has preference vector: ${hasPreferenceVector}`);

    // Get potential similar users (excluding current user)
    let query = supabase
      .from('users')
      .select(`
        id, full_name, username, avatar_url, faculty, campus, gender, play_style,
        sport_preferences, preference_vector, available_days, available_hours,
        preferred_facilities, home_location
      `)
      .neq('id', userId);

    // Apply filters
    if (filters.sameGender && currentUser.gender) {
      query = query.eq('gender', currentUser.gender);
    }

    if (filters.sameCampus && currentUser.campus) {
      query = query.eq('campus', currentUser.campus);
    }

    const { data: potentialUsers, error: usersError } = await query;

    if (usersError) {
      throw usersError;
    }

    if (!potentialUsers || potentialUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          similar_users: [], 
          total_count: 0,
          message: 'No similar users found'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate similarity scores for each potential user
    const similarUsers: SimilarUser[] = [];

    for (const user of potentialUsers) {
      // Calculate individual similarity factors
      let vectorSimilarity = 0.2; // Default low score for missing vectors
      
      // Only calculate vector similarity if BOTH users have preference vectors
      if (hasPreferenceVector && user.preference_vector) {
        vectorSimilarity = cosineSimilarity(currentUser.preference_vector, user.preference_vector);
      } else if (!hasPreferenceVector && !user.preference_vector) {
        // If both users lack preference vectors, use a neutral score
        vectorSimilarity = 0.4;
      } else {
        // If only one user has a preference vector, give a low score
        vectorSimilarity = 0.2;
      }

      const behaviorMatch = calculateBehaviorMatch(currentUser, user);
      const skillCompatibility = calculateSkillCompatibility(currentUser, user);
      const proximityFactor = calculateProximityFactor(currentUser, user);
      const availabilityOverlap = calculateAvailabilityOverlap(currentUser, user);

      const factors: SimilarityFactors = {
        vectorSimilarity,
        behaviorMatch,
        skillCompatibility,
        proximityFactor,
        availabilityOverlap
      };

      // Calculate final similarity score with weights from nexi.md
      const finalScore = (
        vectorSimilarity * 0.4 +
        behaviorMatch * 0.2 +
        skillCompatibility * 0.2 +
        proximityFactor * 0.1 +
        availabilityOverlap * 0.1
      );

      // Apply minimum score filter
      if (filters.minScore && finalScore < filters.minScore) {
        continue;
      }

      const reasonCodes = generateReasonCodes(factors, currentUser, user);

      similarUsers.push({
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        avatar_url: user.avatar_url,
        faculty: user.faculty,
        campus: user.campus,
        sport_preferences: user.sport_preferences || [],
        similarity_score: finalScore,
        similarity_factors: factors,
        reason_codes: reasonCodes
      });
    }

    // Sort by similarity score (descending)
    similarUsers.sort((a, b) => b.similarity_score - a.similarity_score);

    // Apply pagination
    const paginatedUsers = similarUsers.slice(offset, offset + limit);

    console.log(`Found ${similarUsers.length} similar users, returning ${paginatedUsers.length}`);

    // Store/update recommendations in the user_user_recommendations table
    for (const similarUser of paginatedUsers) {
      await supabase
        .from('user_user_recommendations')
        .upsert({
          user_id: userId,
          recommended_user_id: similarUser.id,
          similarity_score: similarUser.similarity_score,
          reason_codes: similarUser.reason_codes,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,recommended_user_id'
        });
    }

    return new Response(
      JSON.stringify({
        similar_users: paginatedUsers,
        total_count: similarUsers.length,
        algorithm: 'user-similarity-v2-fixed',
        weights: {
          vector_similarity: 0.4,
          behavior_match: 0.2,
          skill_compatibility: 0.2,
          proximity_factor: 0.1,
          availability_overlap: 0.1
        },
        current_user_has_vector: hasPreferenceVector
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-similar-users function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
