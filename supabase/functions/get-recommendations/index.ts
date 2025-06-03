// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_supabase_edge

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Constants for recommendation configuration
const CONTENT_BASED_WEIGHT = 0.6 // Weight for content-based filtering
const COLLABORATIVE_WEIGHT = 0.4 // Weight for collaborative filtering
const SIMILARITY_THRESHOLD = 0.3 // Minimum similarity threshold
const MAX_RECOMMENDATIONS = 20 // Maximum number of recommendations to return

// Get user preference vector
const getUserPreference = async (supabase: any, userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('preference_vector')
    .eq('id', userId)
    .single()
  
  if (error) {
    throw new Error(`Error fetching user preference: ${error.message}`)
  }
  
  return data.preference_vector
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
const getContentBasedRecommendations = async (supabase: any, userId: string, userPreference: any, excludeMatchIds: string[]) => {
  if (!userPreference) {
    return []
  }
  
  // Call the match_similar_vector function
  const { data, error } = await supabase.rpc(
    'match_similar_vector',
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

// Merge and rank recommendations
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

// Handle HTTP requests
Deno.serve(async (req) => {
  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get user ID from request
    const { userId, limit = 10 } = await req.json()
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: userId' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Get user's preference vector
    const userPreference = await getUserPreference(supabase, userId)
    
    // Get matches the user is already part of (to exclude from recommendations)
    const excludeMatchIds = await getUserExistingMatches(supabase, userId)
    
    // Get content-based recommendations
    const contentBasedRecommendations = await getContentBasedRecommendations(
      supabase,
      userId,
      userPreference,
      excludeMatchIds
    )
    
    // Get collaborative filtering recommendations
    const collaborativeRecommendations = await getCollaborativeRecommendations(
      supabase,
      userId,
      excludeMatchIds
    )
    
    // Merge and rank recommendations
    const finalRecommendations = mergeAndRankRecommendations(
      contentBasedRecommendations,
      collaborativeRecommendations
    ).slice(0, limit)
    
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
          message: 'Generic recommendations provided based on sport preferences'
        }),
        { headers: { 'Content-Type': 'application/json' } }
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
          recommendation_type: rec.recommendation_type,
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
        collaborativeCount: collaborativeRecommendations.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
