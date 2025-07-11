import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, Content-Type, Authorization, x-client-info, X-Debug-Request-ID, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface RecommendationResult {
  match: any
  similarity_score: number
  similarity_percentage: number
  explanation: string
}

async function calculateSimilarity(
  supabase: any,
  userId: string,
  matchVector: number[]
): Promise<number> {
  try {
    console.log(`Calculating similarity for user ${userId}`)
    
    const { data, error } = await supabase
      .rpc('calculate_enhanced_weighted_cosine_similarity', {
        user_id_param: userId,
        match_vector_param: matchVector
      })

    if (error) {
      console.error('Similarity calculation error:', error)
      return 0
    }

    const similarity = parseFloat(data) || 0
    console.log(`Similarity result: ${similarity} (${Math.round(similarity * 100)}%)`)
    return similarity
  } catch (error) {
    console.error('Error in similarity calculation:', error)
    return 0
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== ENHANCED WEIGHTED RECOMMENDATIONS V4 ===')
    
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

    console.log(`Processing recommendations for user: ${userId}`)

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('User error:', userError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`User: ${userData.full_name}`)

    if (!userData.preference_vector) {
      console.log('Generating user preference vector...')
      
      const { error: vectorError } = await supabase
        .rpc('generate_user_preference_vector', { user_id_param: userId })
      
      if (vectorError) {
        console.error('Vector generation error:', vectorError)
        return new Response(
          JSON.stringify({ error: 'Failed to generate user preference vector' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      const { data: updatedUserData, error: refetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (refetchError || !updatedUserData?.preference_vector) {
        console.error('Refetch error:', refetchError)
        return new Response(
          JSON.stringify({ error: 'Failed to get updated user vector' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      userData.preference_vector = updatedUserData.preference_vector
    }

    console.log(`User vector dimensions: ${userData.preference_vector.length}`)

    const currentTime = new Date().toISOString()
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id, title, sport_id, location_id, start_time, end_time, max_participants,
        skill_level, description, host_id, status, characteristic_vector,
        sports:sport_id (id, name),
        locations:location_id (id, name, image_url),
        host:host_id (id, full_name, avatar_url)
      `)
      .neq('host_id', userId)
      .in('status', ['upcoming', 'active'])
      .gte('start_time', currentTime)
      .not('characteristic_vector', 'is', null)

    if (matchesError) {
      console.error('Matches error:', matchesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch matches' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${matches?.length || 0} matches`)

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          count: 0,
          total_analyzed: 0,
          total_similar_matches: 0,
          message: 'No available matches found',
          calculation_method: 'Enhanced weighted cosine similarity v4'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const recommendations: RecommendationResult[] = []
    let perfectMatches = 0

    for (const match of matches) {
      console.log(`Analyzing match: ${match.title}`)
      
      const similarity = await calculateSimilarity(
        supabase,
        userId,
        match.characteristic_vector
      )

      if (similarity >= minSimilarity) {
        const percentage = Math.round(similarity * 100)
        
        if (similarity >= 0.90) {
          perfectMatches++
        }

        let explanation = ''
        if (similarity >= 0.90) {
          explanation = `🎯 PERFECT MATCH! ${percentage}% compatibility - achieves 90-100% target!`
        } else if (similarity >= 0.75) {
          explanation = `✅ EXCELLENT match! ${percentage}% compatibility`
        } else if (similarity >= 0.60) {
          explanation = `👍 GOOD match! ${percentage}% compatibility`
        } else {
          explanation = `⚠️ MODERATE match. ${percentage}% compatibility`
        }

        recommendations.push({
          match: {
            ...match,
            sport: match.sports,
            location: match.locations,
            current_participants: 0
          },
          similarity_score: similarity,
          similarity_percentage: percentage,
          explanation
        })
      }
    }

    recommendations.sort((a, b) => b.similarity_score - a.similarity_score)
    const paginatedRecommendations = recommendations.slice(offset, offset + limit)

    console.log(`=== RESULTS ===`)
    console.log(`Total analyzed: ${matches.length}`)
    console.log(`Valid recommendations: ${recommendations.length}`)
    console.log(`Perfect matches (90%+): ${perfectMatches}`)
    console.log(`Returned: ${paginatedRecommendations.length}`)

    return new Response(
      JSON.stringify({
        recommendations: paginatedRecommendations,
        count: paginatedRecommendations.length,
        total_analyzed: matches.length,
        total_similar_matches: recommendations.length,
        perfect_matches_90_plus: perfectMatches,
        calculation_method: 'Enhanced weighted cosine similarity v4',
        academic_target_status: perfectMatches > 0 ? 'ACHIEVED' : 'PARTIAL',
        min_similarity_threshold: minSimilarity
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
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
