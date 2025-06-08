// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_supabase_edge

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0'

// CORS headers for Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, X-Client-Info, Content-Type, Authorization, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Constants for recommendation configuration
const CONTENT_BASED_WEIGHT = 0.5 // Weight for content-based filtering (adjusted from 0.6)
const COLLABORATIVE_WEIGHT = 0.3 // Weight for collaborative filtering (adjusted from 0.4)
const ACTIVITY_WEIGHT = 0.2 // New weight for activity-based scoring
const SIMILARITY_THRESHOLD = 0.3 // Minimum similarity threshold
const MAX_RECOMMENDATIONS = 20 // Maximum number of recommendations to return
const RRF_CONSTANT = 60 // Constant for Reciprocal Rank Fusion (RRF)

// Get user preference vector
const getUserPreference = async (supabase: any, userId: string) => {
  try {
    console.log(`Fetching preference vector for user: ${userId}`)
    const { data, error } = await supabase
      .from('users')
      .select('preference_vector')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.log(`Error fetching user preference: ${error.message}`)
      return null
    }
    
    return data?.preference_vector
  } catch (error) {
    console.log(`Exception in getUserPreference: ${error.message}`)
    return null
  }
}

// Get matches the user has already joined or is hosting
const getUserExistingMatches = async (supabase: any, userId: string) => {
  // Get matches user is hosting
  const { data: hostedMatches, error: hostedError } = await supabase
    .from('matches')
    .select('id')
    .eq('host_id', userId)
  
  if (hostedError) {
    throw new Error(`Error fetching hosted matches: ${hostedError.message}`)
  }
  
  // Get matches user has joined
  const { data: joinedMatches, error: joinedError } = await supabase
    .from('participants')
    .select('match_id')
    .eq('user_id', userId)
  
  if (joinedError) {
    throw new Error(`Error fetching joined matches: ${joinedError.message}`)
  }
  
  // Combine and return unique match IDs
  const matchIds = [
    ...(hostedMatches?.map(m => m.id) || []),
    ...(joinedMatches?.map(m => m.match_id) || [])
  ]
  
  return [...new Set(matchIds)]
}

// Get content-based recommendations using vector similarity
const getContentBasedRecommendations = async (supabase: any, userId: string, userPreference: any, excludeMatchIds: string[], useHnsw = true) => {
  if (!userPreference) {
    return []
  }
  
  // Use appropriate function based on indexing strategy
  const functionName = useHnsw ? 'match_similar_vector_hnsw' : 'match_similar_vector'
  
  console.log(`Using ${functionName} for content-based recommendations`)
  
  // Call the match similarity function
  const { data, error } = await supabase.rpc(
    functionName,
    {
      query_embedding: userPreference,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: MAX_RECOMMENDATIONS * 2 // Fetch more to allow for filtering
    }
  )
  
  if (error) {
    throw new Error(`Error getting content-based recommendations: ${error.message}`)
  }
  
  // Filter out matches that user is already part of
  return (data || [])
    .filter(match => !excludeMatchIds.includes(match.id))
    .map(match => ({
      ...match,
      recommendation_type: 'content-based',
      explanation: 'Based on your preferences and past activities'
    }))
}

// Get collaborative filtering recommendations based on similar users
const getCollaborativeRecommendations = async (supabase: any, userId: string, excludeMatchIds: string[]) => {
  // Get similar users
  const { data: similarUsers, error: similarUsersError } = await supabase.rpc(
    'find_similar_users',
    {
      user_id: userId,
      similarity_threshold: 0.4,
      user_count: 10
    }
  )
  
  if (similarUsersError) {
    throw new Error(`Error finding similar users: ${similarUsersError.message}`)
  }
  
  if (!similarUsers || similarUsers.length === 0) {
    return [] // No similar users found
  }
  
  // Get matches that similar users have joined or hosted
  const similarUserIds = similarUsers.map(u => u.id)
  
  // Get matches hosted by similar users
  const { data: hostedMatches, error: hostedError } = await supabase
    .from('matches')
    .select(`
      id,
      title,
      sport_id,
      host_id,
      start_time,
      sports (name),
      location_id,
      locations (name, address),
      skill_level,
      status
    `)
    .in('host_id', similarUserIds)
    .eq('status', 'active')
    .order('start_time', { ascending: true })
    .limit(MAX_RECOMMENDATIONS)
  
  if (hostedError) {
    throw new Error(`Error fetching hosted matches from similar users: ${hostedError.message}`)
  }
  
  // Get matches joined by similar users
  const { data: joinedMatchIds, error: joinedError } = await supabase
    .from('participants')
    .select('match_id, user_id')
    .in('user_id', similarUserIds)
  
  if (joinedError) {
    throw new Error(`Error fetching joined matches from similar users: ${joinedError.message}`)
  }
  
  // Count how many similar users joined each match
  const matchJoinCounts = {}
  joinedMatchIds?.forEach(join => {
    matchJoinCounts[join.match_id] = (matchJoinCounts[join.match_id] || 0) + 1
  })
  
  // Get details for joined matches
  let joinedMatches = []
  if (joinedMatchIds && joinedMatchIds.length > 0) {
    const uniqueMatchIds = [...new Set(joinedMatchIds.map(j => j.match_id))]
    
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        title,
        sport_id,
        host_id,
        start_time,
        sports (name),
        location_id,
        locations (name, address),
        skill_level,
        status
      `)
      .in('id', uniqueMatchIds)
      .eq('status', 'active')
      .order('start_time', { ascending: true })
      .limit(MAX_RECOMMENDATIONS)
    
    if (matchesError) {
      throw new Error(`Error fetching details for joined matches: ${matchesError.message}`)
    }
    
    joinedMatches = matches || []
  }
  
  // Combine and deduplicate matches
  const allMatches = [...(hostedMatches || []), ...joinedMatches]
  const uniqueMatches = []
  const matchMap = new Map()
  
  for (const match of allMatches) {
    if (!matchMap.has(match.id)) {
      matchMap.set(match.id, true)
      uniqueMatches.push(match)
    }
  }
  
  // Filter out matches that user is already part of
  return uniqueMatches
    .filter(match => !excludeMatchIds.includes(match.id))
    .map(match => {
      const joinCount = matchJoinCounts[match.id] || 0
      return {
        ...match,
        similarity: joinCount / similarUsers.length, // Normalize by number of similar users
        recommendation_type: 'collaborative',
        explanation: 'People with similar interests joined this match'
      }
    })
}

// Get activity-based recommendations using user's past interactions
const getActivityBasedRecommendations = async (supabase: any, userId: string, excludeMatchIds: string[]) => {
  // Query to get user activity patterns
  const userActivityQuery = `
    SELECT 
      ui.match_id,
      COUNT(*) as interaction_count,
      MAX(ui.timestamp) as last_interaction,
      m.title,
      m.sport_id,
      m.host_id,
      m.start_time,
      m.skill_level,
      m.status,
      m.location_id,
      s.name as sport_name,
      l.name as location_name,
      l.address as location_address
    FROM user_interactions ui
    JOIN matches m ON ui.match_id = m.id 
    JOIN sports s ON m.sport_id = s.id
    JOIN locations l ON m.location_id = l.id
    WHERE ui.user_id = $1
    AND m.status = 'active'
    GROUP BY ui.match_id, m.title, m.sport_id, m.host_id, m.start_time, 
             m.skill_level, m.status, m.location_id, s.name, l.name, l.address
    ORDER BY interaction_count DESC, last_interaction DESC
    LIMIT 20
  `

  try {
    // Execute the raw query
    const { data: activityData, error: activityError } = await supabase
      .rpc('query_raw', { query: userActivityQuery, params: [userId] })

    if (activityError) {
      throw new Error(`Error fetching user activity data: ${activityError.message}`)
    }

    // Process the results
    return (activityData || [])
      .filter(match => !excludeMatchIds.includes(match.match_id))
      .map(match => ({
        id: match.match_id,
        title: match.title,
        sport_id: match.sport_id,
        host_id: match.host_id,
        start_time: match.start_time,
        sports: { name: match.sport_name },
        location_id: match.location_id,
        locations: { name: match.location_name, address: match.location_address },
        skill_level: match.skill_level,
        status: match.status,
        similarity: Math.min(match.interaction_count / 10, 1), // Normalized score
        recommendation_type: 'activity',
        explanation: 'Based on your recent activity patterns'
      }))
  } catch (error) {
    console.error(`Error in activity-based recommendations: ${error.message}`)
    return [] // Return empty array on error
  }
}

// Reciprocal Rank Fusion algorithm for combining multiple ranked lists
function reciprocalRankFusion(recommendations: Map<string, any>) {
  const itemScores = new Map<string, number>()
  const itemData = new Map<string, any>()
  
  // Process each recommendation type (content, collaborative, activity)
  for (const [type, recs] of recommendations.entries()) {
    const weight = type === 'content-based' ? CONTENT_BASED_WEIGHT :
                  type === 'collaborative' ? COLLABORATIVE_WEIGHT :
                  ACTIVITY_WEIGHT
    
    // Calculate RRF scores for each item
    recs.forEach((rec: any, index: number) => {
      const id = rec.id
      const rrf = weight * (1.0 / (index + RRF_CONSTANT))
      itemScores.set(id, (itemScores.get(id) || 0) + rrf)
      
      // Store item data for later
      if (!itemData.has(id)) {
        itemData.set(id, {...rec, explanations: []})
      }
      
      // Add explanation
      itemData.get(id).explanations.push(rec.explanation)
    })
  }
  
  // Convert to array and add final scores
  return Array.from(itemScores.entries())
    .map(([id, score]) => {
      const data = itemData.get(id)
      return {
        ...data,
        finalScore: score,
        // Join unique explanations
        explanation: [...new Set(data.explanations)].join(' and ')
      }
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, MAX_RECOMMENDATIONS)
}

// Handle HTTP requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('Supabase client created with URL:', supabaseUrl)
    
    // Get user ID and options from request
    let userId, limit = 10, useHnsw = true, useHybridSearch = true, useActivityContext = true
    try {
      const body = await req.json()
      console.log('Request body received:', JSON.stringify(body))
      userId = body?.userId
      limit = body?.limit || 10
      useHnsw = body?.useHnsw !== undefined ? body.useHnsw : true
      useHybridSearch = body?.useHybridSearch !== undefined ? body.useHybridSearch : true
      useActivityContext = body?.useActivityContext !== undefined ? body.useActivityContext : true
    } catch (parseError) {
      console.log('Error parsing request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid request body - could not parse JSON' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    console.log('Processing request for userId:', userId, 'with limit:', limit, 
                'useHnsw:', useHnsw, 'useHybridSearch:', useHybridSearch, 'useActivityContext:', useActivityContext)
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: userId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Check if user exists first
    const { data: userExists, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
      
    if (userCheckError || !userExists) {
      console.log('User not found:', userId)
      return new Response(
        JSON.stringify({ 
          error: 'User not found', 
          recommendations: [],
          type: 'generic',
          message: 'No recommendations available' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
    
    // Get user's preference vector
    const userPreference = await getUserPreference(supabase, userId)
    
    // Get matches the user is already part of (to exclude from recommendations)
    const excludeMatchIds = await getUserExistingMatches(supabase, userId)
    
    // Start timing
    const startTime = performance.now()
    
    // Create a map to store recommendation lists by type
    const recommendationsMap = new Map<string, any[]>()
    
    // Get content-based recommendations
    const contentBasedRecommendations = await getContentBasedRecommendations(
      supabase,
      userId,
      userPreference,
      excludeMatchIds,
      useHnsw // Use HNSW indexing if enabled
    )
    
    recommendationsMap.set('content-based', contentBasedRecommendations)
    
    // Get collaborative filtering recommendations
    const collaborativeRecommendations = await getCollaborativeRecommendations(
      supabase,
      userId,
      excludeMatchIds
    )
    
    recommendationsMap.set('collaborative', collaborativeRecommendations)
    
    // Get activity-based recommendations if enabled
    if (useActivityContext) {
      const activityRecommendations = await getActivityBasedRecommendations(
        supabase,
        userId,
        excludeMatchIds
      )
      
      recommendationsMap.set('activity', activityRecommendations)
    }
    
    // Generate final recommendations
    let finalRecommendations = []
    
    if (useHybridSearch) {
      // Use Reciprocal Rank Fusion for sophisticated merging
      finalRecommendations = reciprocalRankFusion(recommendationsMap).slice(0, limit)
    } else {
      // Use the old simple merging method
      const oldMerged = mergeAndRankRecommendations(
        contentBasedRecommendations,
        collaborativeRecommendations
      ).slice(0, limit)
      
      finalRecommendations = oldMerged
    }
    
    // End timing
    const endTime = performance.now()
    
    // For new users without preference vectors, provide generic sport-based recommendations
    if (finalRecommendations.length === 0) {
      // Get user's favorite sports from profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('favorite_sports')
        .eq('user_id', userId)
        .single()
      
      const favoriteSports = profile?.favorite_sports || []
      
      // Get active matches for these sports or any active matches if no preferences
      const query = supabase
        .from('matches')
        .select(`
          id,
          title,
          sport_id,
          host_id,
          start_time,
          sports (name),
          location_id,
          locations (name, address),
          skill_level,
          status
        `)
        .eq('status', 'active')
        .order('start_time', { ascending: true })
        .limit(limit)
      
      if (favoriteSports.length > 0) {
        query.in('sport_id', favoriteSports)
      }
      
      const { data: matches } = await query
      
      // Filter out matches user is already part of
      const genericRecommendations = (matches || [])
        .filter(match => !excludeMatchIds.includes(match.id))
        .map(match => ({
          ...match,
          recommendation_type: 'generic',
          explanation: favoriteSports.length > 0 
            ? 'Based on your favorite sports' 
            : 'Popular upcoming matches',
          finalScore: 0.5 // Default score for generic recommendations
        }))
      
      return new Response(
        JSON.stringify({
          recommendations: genericRecommendations,
          type: 'generic',
          message: 'Generic recommendations provided based on sport preferences',
          metrics: {
            executionTimeMs: endTime - startTime,
            useHnsw,
            useHybridSearch,
            useActivityContext
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Log analytics data
    const analyticsPromises = finalRecommendations.map(rec => 
      supabase
        .from('recommendation_analytics')
        .insert({
          user_id: userId,
          match_id: rec.id,
          action: 'shown',
          recommendation_type: rec.recommendation_type || 'hybrid',
          score: rec.finalScore,
          explanation: rec.explanation
        })
        .then(({ error }) => {
          if (error) {
            console.error(`Error logging analytics: ${error.message}`)
          }
        })
    )
    
    // Don't wait for analytics to complete
    Promise.all(analyticsPromises).catch(console.error)
    
    return new Response(
      JSON.stringify({
        recommendations: finalRecommendations,
        type: 'hybrid',
        contentBasedCount: contentBasedRecommendations.length,
        collaborativeCount: collaborativeRecommendations.length,
        activityCount: recommendationsMap.get('activity')?.length || 0,
        metrics: {
          executionTimeMs: endTime - startTime,
          useHnsw,
          useHybridSearch,
          useActivityContext
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        recommendations: [],
        type: 'error',
        message: 'Error retrieving recommendations'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})

// Legacy function for backward compatibility
const mergeAndRankRecommendations = (contentBased: any[], collaborative: any[]) => {
  // Create a map to combine duplicate recommendations
  const recommendationMap = new Map()
  
  // Process content-based recommendations
  contentBased.forEach(rec => {
    recommendationMap.set(rec.id, {
      ...rec,
      contentScore: rec.similarity,
      collaborativeScore: 0,
      finalScore: rec.similarity * CONTENT_BASED_WEIGHT
    })
  })
  
  // Process collaborative recommendations
  collaborative.forEach(rec => {
    if (recommendationMap.has(rec.id)) {
      // Combine with existing content-based recommendation
      const existing = recommendationMap.get(rec.id)
      existing.collaborativeScore = rec.similarity
      existing.finalScore = (existing.contentScore * CONTENT_BASED_WEIGHT) + 
                            (rec.similarity * COLLABORATIVE_WEIGHT)
      
      // Combine explanations
      existing.explanation = `${existing.explanation} and ${rec.explanation.toLowerCase()}`
    } else {
      // Add new collaborative recommendation
      recommendationMap.set(rec.id, {
        ...rec,
        contentScore: 0,
        collaborativeScore: rec.similarity,
        finalScore: rec.similarity * COLLABORATIVE_WEIGHT
      })
    }
  })
  
  // Convert to array and sort by final score
  return Array.from(recommendationMap.values())
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, MAX_RECOMMENDATIONS)
}
