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

interface WeightedRecommendationResult {
  match: any
  similarity_score: number
  similarity_percentage: number
  explanation: string
  mathematical_breakdown: {
    user_vector_dimensions: number
    match_vector_dimensions: number
    weighted_cosine_similarity: number
    calculation_method: string
    weight_distribution: {
      sports: string
      faculty: string
      skill_level: string
      enhanced_attributes: string
      venues: string
      duration: string
      play_style: string
    }
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

    const similarity = parseFloat(data)
    console.log(`Weighted cosine similarity calculated: ${similarity} (${Math.round(similarity * 100)}%)`)
    return similarity
  } catch (error) {
    console.error('Error in weighted similarity calculation:', error)
    return 0
  }
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
        JSON.stringify({ error: 'User ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('\\n=== ENHANCED WEIGHTED SIMILARITY RECOMMENDATION SYSTEM ===')
    console.log(`Processing recommendations for user: ${userId}`)
    console.log(`Timestamp: ${new Date().toISOString()}`)
    console.log('Target: 90-100% similarity for perfect attribute matches')

    // Get user data with preference vector
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('Error fetching user data:', userError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!userData.preference_vector) {
      console.log('User preference vector not found, generating...')
      
      // Trigger vector generation
      const { error: vectorError } = await supabase
        .rpc('generate_user_preference_vector', { user_id_param: userId })
      
      if (vectorError) {
        console.error('Error generating user vector:', vectorError)
        return new Response(
          JSON.stringify({ error: 'Failed to generate user preference vector' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Refetch user data with generated vector
      const { data: updatedUserData, error: refetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (refetchError || !updatedUserData?.preference_vector) {
        console.error('Error refetching user data after vector generation:', refetchError)
        return new Response(
          JSON.stringify({ error: 'Failed to generate user preference vector' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      userData.preference_vector = updatedUserData.preference_vector
    }

    console.log(`User preference vector dimensions: ${userData.preference_vector.length}`)

    // Get available matches with characteristic vectors
    const currentTime = new Date().toISOString()
    const { data: matches, error: matchesError } = await supabase
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
        host:host_id (id, full_name, avatar_url)
      `)
      .neq('host_id', userId)
      .in('status', ['upcoming', 'active'])
      .gte('start_time', currentTime)
      .not('characteristic_vector', 'is', null)

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

    if (!matches || matches.length === 0) {
      console.log('No available matches found')
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          message: 'No available matches found',
          calculation_method: 'Enhanced weighted cosine similarity'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${matches.length} available matches to analyze`)

    // Calculate weighted similarity for each match
    const recommendations: WeightedRecommendationResult[] = []

    for (const match of matches) {
      console.log(`\\n--- Analyzing Match ${match.id} ---`)
      console.log(`Sport: ${match.sports.name}`)
      console.log(`Host: ${match.users.full_name}`)
      console.log(`Venue: ${match.venues.name}`)
      console.log(`Match vector dimensions: ${match.characteristic_vector.length}`)

      // Calculate weighted cosine similarity using enhanced PostgreSQL vector operations
      const similarity = await calculateWeightedSimilarityWithPostgreSQL(
        supabase,
        userId,
        match.characteristic_vector
      )
      console.log(`Match ${match.id} weighted similarity: ${similarity} (${Math.round(similarity * 100)}%)`)

      if (similarity >= minSimilarity) {
        const similarityPercentage = Math.round(similarity * 100)
        
        let explanation = ''
        if (similarity >= 0.90) {
          explanation = `Excellent match! ${similarityPercentage}% compatibility with your preferences. This match perfectly aligns with your sports interests, skill level, and other preferences.`
        } else if (similarity >= 0.75) {
          explanation = `Great match! ${similarityPercentage}% compatibility. Strong alignment with your preferences across multiple attributes.`
        } else if (similarity >= 0.60) {
          explanation = `Good match! ${similarityPercentage}% compatibility. Solid alignment with several of your key preferences.`
        } else if (similarity >= 0.40) {
          explanation = `Moderate match. ${similarityPercentage}% compatibility. Some alignment with your preferences.`
        } else {
          explanation = `Basic match. ${similarityPercentage}% compatibility. Limited alignment with your current preferences.`
        }

        recommendations.push({
          match: {
            ...match,
            sport: match.sports,
            location: match.locations,
            current_participants: 0 // Will be calculated if needed
          },
          similarity_score: similarity,
          similarity_percentage: similarityPercentage,
          explanation,
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
      }
    }

    // Sort by similarity score (highest first)
    recommendations.sort((a, b) => b.similarity_score - a.similarity_score)

    // Apply pagination
    const paginatedRecommendations = recommendations.slice(offset, offset + limit)

    console.log('\\n=== WEIGHTED SIMILARITY RESULTS ===')
    console.log(`Total matches analyzed: ${matches.length}`)
    console.log(`Valid recommendations: ${recommendations.length}`)
    console.log(`Paginated recommendations returned: ${paginatedRecommendations.length}`)

    if (paginatedRecommendations.length > 0) {
      console.log(`Highest similarity: ${Math.round(paginatedRecommendations[0].similarity_score * 100)}%`)
      console.log(`Lowest similarity: ${Math.round(paginatedRecommendations[paginatedRecommendations.length - 1].similarity_score * 100)}%`)
    }

    return new Response(
      JSON.stringify({
        recommendations: paginatedRecommendations,
        count: paginatedRecommendations.length,
        total_analyzed: matches.length,
        total_similar_matches: recommendations.length,
        calculation_method: 'Enhanced weighted cosine similarity',
        target_accuracy: '90-100% for perfect attribute matches',
        min_similarity_threshold: minSimilarity,
        weight_distribution: {
          sports: '35%',
          faculty: '25%',
          skill_level: '20%',
          enhanced_attributes: '15%',
          venues: '3%',
          duration: '1%',
          play_style: '1%'
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in weighted recommendations:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
