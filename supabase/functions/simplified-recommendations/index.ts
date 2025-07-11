import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define CORS headers directly
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, Content-Type, Authorization, x-client-info, X-Debug-Request-ID, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface SimplifiedRecommendationResult {
  match: any
  similarity_score: number
  similarity_percentage: number
  explanation: string
  mathematical_breakdown: {
    user_vector_dimensions: number
    match_vector_dimensions: number
    cosine_similarity: number
    calculation_method: string
  }
}

/**
 * Calculate weighted cosine similarity using enhanced PostgreSQL RPC function
 * This uses weighted cosine similarity targeting 90-100% similarity for perfect matches
 * Replaces standard cosine similarity with attribute-weighted calculation
 */
async function calculateWeightedSimilarityWithPostgreSQL(
  supabase: any,
  userId: string,
  matchVector: number[]
): Promise<number> {
  try {
    // Use the enhanced weighted cosine similarity PostgreSQL function
    const { data, error } = await supabase
      .rpc('calculate_weighted_cosine_similarity', {
        user_id_param: userId,
        match_vector_param: matchVector
      })

    if (error || data === null || data === undefined) {
      console.log('PostgreSQL weighted similarity calculation failed:', error)
      console.log('Falling back to standard cosine similarity...')

      // Fallback to standard cosine similarity if weighted function fails
      const fallbackResult = await supabase
        .rpc('calculate_cosine_similarity', {
          user_id_param: userId,
          match_vector_param: matchVector
        })

      if (fallbackResult.error) {
        console.log('Fallback similarity calculation also failed:', fallbackResult.error)
        return 0
      }

      return fallbackResult.data || 0
    }

    // Ensure similarity is between 0 and 1
    return Math.max(0, Math.min(1, data))
  } catch (error) {
    console.log('Error in PostgreSQL RPC similarity calculation:', error)
    return 0
  }
}

/**
 * Generate explanation for similarity score
 */
function generateExplanation(similarity: number): string {
  const percentage = Math.round(similarity * 100)
  
  if (percentage >= 90) return `${percentage}% similarity - Excellent match! Your preferences align very closely with this match.`
  if (percentage >= 80) return `${percentage}% similarity - Great match! This match strongly aligns with your preferences.`
  if (percentage >= 70) return `${percentage}% similarity - Good match! This match aligns well with your preferences.`
  if (percentage >= 60) return `${percentage}% similarity - Decent match! This match somewhat aligns with your preferences.`
  if (percentage >= 50) return `${percentage}% similarity - Moderate match! This match has some alignment with your preferences.`
  if (percentage >= 30) return `${percentage}% similarity - Low match! This match has limited alignment with your preferences.`
  return `${percentage}% similarity - Minimal match! This match has very little alignment with your preferences.`
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, limit = 10, offset = 0, minSimilarity = 0.01 } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Processing simplified recommendations for user: ${userId}`)

    // Get user preference vector
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, preference_vector')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.log('User lookup error:', userError)
      return new Response(
        JSON.stringify({
          error: 'User not found',
          recommendations: [],
          count: 0,
          algorithm: 'simplified-vector-similarity'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`User found: ${userData.id}, has preference vector: ${!!userData.preference_vector}`)

    if (!userData.preference_vector) {
      return new Response(
        JSON.stringify({ 
          error: 'User has no preference vector',
          message: 'Please update your preferences to get personalized recommendations',
          recommendations: [],
          count: 0,
          algorithm: 'simplified-vector-similarity'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's joined matches to exclude them
    const { data: participations } = await supabase
      .from('participants')
      .select('match_id')
      .eq('user_id', userId)

    const joinedMatchIds = participations?.map(p => p.match_id) || []
    console.log(`User has joined ${joinedMatchIds.length} matches:`, joinedMatchIds)

    // Get available matches with characteristic vectors
    const currentTime = new Date().toISOString()
    console.log(`Current time for filtering: ${currentTime}`)

    let matchQuery = supabase
      .from('matches')
      .select(`
        id,
        title,
        sport_id,
        location_id,
        start_time,
        end_time,
        max_participants,
        skill_level,
        description,
        host_id,
        status,
        characteristic_vector,
        sports:sport_id (id, name),
        locations:location_id (id, name, image_url),
        host:host_id (id, full_name, avatar_url),
        participants(count)
      `)
      .in('status', ['upcoming', 'active'])
      .neq('host_id', userId) // Don't recommend user's own matches
      .gte('start_time', currentTime)
      .not('characteristic_vector', 'is', null) // Only matches with vectors

    console.log('Match query filters applied:', {
      status: ['upcoming', 'active'],
      excludeHostId: userId,
      minStartTime: currentTime,
      requiresVector: true
    })

    // Exclude joined matches if any
    if (joinedMatchIds.length > 0) {
      matchQuery = matchQuery.not('id', 'in', `(${joinedMatchIds.join(',')})`)
      console.log(`Excluding ${joinedMatchIds.length} already joined matches`)
    }

    const { data: matches, error: matchesError } = await matchQuery
      .order('start_time', { ascending: true })
      .limit(100) // Get more matches to calculate similarity for

    if (matchesError) {
      console.error('Error fetching matches:', matchesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch matches' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`[Simplified Recommendations] Found ${matches?.length || 0} potential matches to analyze`)
    console.log(`[Simplified Recommendations] Matches found:`, matches?.map(m => ({ id: m.id, title: m.title, has_vector: !!m.characteristic_vector })) || [])

    if (matches && matches.length > 0) {
      console.log('Detailed match analysis:', matches.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        start_time: m.start_time,
        has_vector: !!m.characteristic_vector,
        vector_length: m.characteristic_vector?.length || 0,
        host_id: m.host_id
      })))
    }

    if (!matches || matches.length === 0) {
      console.log(`[Simplified Recommendations] No matches found - returning empty result`)
      return new Response(
        JSON.stringify({
          recommendations: [],
          count: 0,
          algorithm: 'simplified-vector-similarity',
          message: 'No available matches found with characteristic vectors'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate similarity for each match
    const recommendations: SimplifiedRecommendationResult[] = []
    let totalAnalyzed = 0
    let totalAboveThreshold = 0

    console.log(`Starting similarity analysis with minSimilarity: ${minSimilarity}`)
    console.log(`User preference vector length: ${userData.preference_vector?.length || 0}`)

    for (const match of matches) {
      console.log(`Analyzing match: ${match.id} - ${match.title}`)

      if (!match.characteristic_vector) {
        console.log(`Skipping match ${match.id}: no characteristic vector`)
        continue
      }

      totalAnalyzed++

      // Calculate weighted cosine similarity using enhanced PostgreSQL vector operations
      const similarity = await calculateWeightedSimilarityWithPostgreSQL(
        supabase,
        userId,
        match.characteristic_vector
      )
      console.log(`Match ${match.id} weighted similarity: ${similarity} (${Math.round(similarity * 100)}%)`)

      console.log(`Match ${match.id} final similarity: ${similarity} (${Math.round(similarity * 100)}%)`)

      // Only include matches above minimum similarity threshold
      if (similarity >= minSimilarity) {
        totalAboveThreshold++
        console.log(`Match ${match.id} ACCEPTED (above threshold ${minSimilarity})`)

        recommendations.push({
          match: {
            ...match,
            sport: match.sports,
            location: match.locations,
            current_participants: match.participants?.[0]?.count || 0
          },
          similarity_score: similarity,
          similarity_percentage: Math.round(similarity * 100),
          explanation: generateExplanation(similarity),
          mathematical_breakdown: {
            user_vector_dimensions: userData.preference_vector.length,
            match_vector_dimensions: match.characteristic_vector.length,
            weighted_cosine_similarity: similarity,
            calculation_method: 'Enhanced weighted cosine similarity with attribute-specific weights',
            weight_distribution: {
              sports: '35%',
              faculty: '25%',
              skill_level: '20%',
              enhanced_attributes: '15%',
              venues: '3%',
              duration: '1%',
              play_style: '1%'
            }
          }
        })
      } else {
        console.log(`Match ${match.id} REJECTED (below threshold ${minSimilarity})`)
      }
    }

    console.log(`Analysis complete: ${totalAnalyzed} matches analyzed, ${totalAboveThreshold} above threshold, ${recommendations.length} recommendations generated`)

    // Sort by similarity score (descending)
    recommendations.sort((a, b) => b.similarity_score - a.similarity_score)

    // Apply pagination
    const paginatedRecommendations = recommendations.slice(offset, offset + limit)

    console.log(`Found ${recommendations.length} similar matches, returning ${paginatedRecommendations.length}`)

    return new Response(
      JSON.stringify({
        recommendations: paginatedRecommendations,
        count: paginatedRecommendations.length,
        total_matches_analyzed: totalAnalyzed,
        total_similar_matches: recommendations.length,
        algorithm: 'simplified-vector-similarity',
        mathematical_approach: 'PostgreSQL RPC function cosine similarity between 384-dimensional vectors',
        min_similarity_threshold: minSimilarity,
        user_has_preference_vector: true,
        vector_dimensions: userData.preference_vector.length,
        debug_info: {
          matches_found: matches.length,
          matches_with_vectors: totalAnalyzed,
          matches_above_threshold: totalAboveThreshold,
          current_time: new Date().toISOString(),
          user_id: userId
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in simplified-recommendations function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
