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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, limit = 10, offset = 0, minSimilarity = 0.01 } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`=== ENHANCED RECOMMENDATIONS TEST V4 ===`)
    console.log(`User ID: ${userId}`)

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('User error:', userError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`User: ${userData.full_name}`)
    console.log(`Has preference vector: ${!!userData.preference_vector}`)

    if (!userData.preference_vector) {
      console.log('Generating user vector...')
      const { error: vectorError } = await supabase
        .rpc('generate_user_preference_vector', { user_id_param: userId })
      
      if (vectorError) {
        console.error('Vector generation error:', vectorError)
        return new Response(
          JSON.stringify({ error: 'Failed to generate user vector' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Refetch user data
      const { data: updatedUserData, error: refetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (refetchError || !updatedUserData?.preference_vector) {
        console.error('Refetch error:', refetchError)
        return new Response(
          JSON.stringify({ error: 'Failed to get updated user vector' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      userData.preference_vector = updatedUserData.preference_vector
    }

    console.log(`User vector dimensions: ${userData.preference_vector.length}`)

    // Get matches
    const currentTime = new Date().toISOString()
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id, title, sport_id, location_id, start_time, end_time, max_participants,
        skill_level, description, host_id, status, characteristic_vector,
        sports:sport_id (id, name),
        locations:location_id (id, name, image_url),
        host:host_id (id, full_name, avatar_url, faculty, gender, play_style)
      `)
      .neq('host_id', userId)
      .in('status', ['upcoming', 'active'])
      .gte('start_time', currentTime)
      .not('characteristic_vector', 'is', null)

    if (matchesError) {
      console.error('Matches error:', matchesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch matches' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${matches?.length || 0} matches`)

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          count: 0,
          message: 'No available matches found'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate similarities
    const recommendations = []
    let perfectMatches = 0

    for (const match of matches) {
      console.log(`Analyzing match: ${match.title}`)
      
      // Call enhanced similarity function
      const { data: similarity, error: simError } = await supabase
        .rpc('calculate_enhanced_weighted_cosine_similarity', {
          user_id_param: userId,
          match_vector_param: match.characteristic_vector
        })

      if (simError) {
        console.error(`Similarity error for match ${match.id}:`, simError)
        continue
      }

      const simScore = parseFloat(similarity) || 0
      console.log(`Match ${match.title}: ${Math.round(simScore * 100)}% similarity`)

      if (simScore >= minSimilarity) {
        const percentage = Math.round(simScore * 100)
        
        if (simScore >= 0.90) {
          perfectMatches++
        }

        let explanation = ''
        if (simScore >= 0.90) {
          explanation = `🎯 PERFECT MATCH! ${percentage}% compatibility - achieves 90-100% target!`
        } else if (simScore >= 0.75) {
          explanation = `✅ EXCELLENT match! ${percentage}% compatibility`
        } else {
          explanation = `👍 Good match! ${percentage}% compatibility`
        }

        recommendations.push({
          match: {
            ...match,
            sport: match.sports,
            location: match.locations,
            current_participants: 0
          },
          similarity_score: simScore,
          similarity_percentage: percentage,
          explanation
        })
      }
    }

    // Sort by similarity
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
        academic_target_status: perfectMatches > 0 ? 'ACHIEVED' : 'PARTIAL'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
