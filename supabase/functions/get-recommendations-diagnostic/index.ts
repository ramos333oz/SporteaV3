import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Define CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, X-Client-Info, Content-Type, Authorization, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Constants for recommendation configuration
const CONTENT_BASED_WEIGHT = 0.5 // Weight for content-based filtering
const COLLABORATIVE_WEIGHT = 0.3 // Weight for collaborative filtering
const ACTIVITY_WEIGHT = 0.2 // Weight for activity-based scoring
const SIMILARITY_THRESHOLD = 0.3 // Minimum similarity threshold
const MAX_RECOMMENDATIONS = 20 // Maximum number of recommendations to return
const RRF_CONSTANT = 60 // Constant for Reciprocal Rank Fusion (RRF)

// Create Supabase client using environment variables
let supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
let supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Log environment variable status for debugging
console.log(`SUPABASE_URL environment variable ${supabaseUrl ? 'is set' : 'is NOT set'}`)
console.log(`SUPABASE_SERVICE_ROLE_KEY environment variable ${supabaseKey ? 'is set' : 'is NOT set (will cause auth issues)'}`)

// Fallback values for development/testing only
if (!supabaseUrl) {
  // You should set these in your Supabase dashboard > Settings > API > Edge Functions
  console.warn('⚠️ SUPABASE_URL not found, using development fallback - this should not happen in production')
  supabaseUrl = 'https://fcwwuiitsghknsvnsrxp.supabase.co' // Update this with your project URL if needed
}

if (!supabaseKey) {
  console.error('🛑 SUPABASE_SERVICE_ROLE_KEY not found - authentication will fail!')
}

// Helper functions for recommendations (duplicated from main function for diagnostic purposes)
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

/**
 * Diagnostic version of the get-recommendations Edge Function
 * This function logs detailed information about the request and validates input parameters
 * It also includes options to enable/disable features for performance comparison
 */
Deno.serve(async (req) => {
  console.log('Received request to get-recommendations-diagnostic')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request (CORS preflight)')
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // Log request information
  console.log(`Request method: ${req.method}`)
  console.log(`Request URL: ${req.url}`)
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      console.log(`Invalid method: ${req.method} - only POST allowed`)
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed',
          expectedMethod: 'POST',
          receivedMethod: req.method
        }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Validate environment variables before proceeding
    if (!supabaseUrl || !supabaseKey) {
      console.error(`Environment validation failed: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`)
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          message: 'Missing required environment variables',
          details: {
            supabaseUrl: !!supabaseUrl,
            supabaseKey: !!supabaseKey
          },
          recommendations: [],
          type: 'error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log request headers for diagnostics
    const headers = {}
    req.headers.forEach((value, key) => {
      // Exclude sensitive headers
      if (!['authorization', 'apikey'].includes(key.toLowerCase())) {
        headers[key] = value
      } else {
        headers[key] = '[REDACTED]'
      }
    })
    console.log('Request headers:', JSON.stringify(headers, null, 2))
    
    // Parse request body
    let body
    try {
      // Handle both direct body and body property if it exists
      body = await req.json()
      console.log('Received raw request body:', JSON.stringify(body, null, 2))
      
      // Some Supabase SDKs nest the payload inside a body property
      if (body && body.body && typeof body.body === 'object') {
        console.log('Detected nested body structure, using body.body instead')
        body = body.body
      }
      
      // Ensure we're working with an object
      if (typeof body !== 'object' || body === null) {
        throw new Error('Request body must be a JSON object')
      }
      
      console.log('Normalized request body:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.log('Error parsing request body:', parseError.message)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          message: parseError.message,
          diagnostic: 'Expected valid JSON object with userId and limit properties',
          received: typeof req.body === 'string' ? req.body.substring(0, 100) + '...' : 'non-string body'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Validate required parameters
    const validationErrors = []
    
    // Check if userId is present and valid
    if (!body.userId) {
      validationErrors.push('Missing required parameter: userId')
    } else if (typeof body.userId !== 'string') {
      validationErrors.push(`Invalid userId type: expected string, got ${typeof body.userId}`)
    }
    
    // Check if limit is valid if provided
    if (body.limit !== undefined) {
      const limitNum = Number(body.limit)
      if (isNaN(limitNum)) {
        validationErrors.push(`Invalid limit: not a number (${body.limit})`)
      } else if (limitNum < 1 || limitNum > 100) {
        validationErrors.push(`Invalid limit range: must be between 1 and 100, got ${limitNum}`)
      }
    }
    
    // Return validation errors if any
    if (validationErrors.length > 0) {
      console.log('Validation errors:', validationErrors)
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          validationErrors,
          receivedBody: body
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Extract parameters and configuration options
    const userId = body.userId
    const limit = body.limit || 10
    const useHnsw = body?.useHnsw !== undefined ? body.useHnsw : true
    const useHybridSearch = body?.useHybridSearch !== undefined ? body.useHybridSearch : true
    const useActivityContext = body?.useActivityContext !== undefined ? body.useActivityContext : true
    const runComparison = body?.runComparison === true
    
    // Log successful validation
    console.log('Input validation passed:', {
      userId,
      limit,
      useHnsw,
      useHybridSearch,
      useActivityContext,
      runComparison
    })

    // Create a supabase client for operations
    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('Supabase client created with URL:', supabaseUrl)
    
    // Test the Supabase connection to validate credentials
    try {
      // Simple query to verify connection works
      const { error: testError } = await supabase.from('recommendation_embeddings').select('count(*)', { count: 'exact', head: true })
      
      if (testError) {
        console.error('Supabase connection test failed:', testError)
        throw new Error(`Database connection failed: ${testError.message}`)
      }
      
      console.log('Supabase connection test successful')
    } catch (connectionError) {
      console.error('Failed to connect to Supabase:', connectionError)
      return new Response(
        JSON.stringify({
          error: 'Database connection failed',
          message: connectionError.message || 'Could not connect to the database',
          recommendations: [],
          type: 'error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If in mock mode, return diagnostic info with mock recommendations
    if (body.mockMode) {
      return new Response(
        JSON.stringify({ 
          message: 'Diagnostic successful (mock mode)',
          validationStatus: 'PASSED',
          receivedParameters: {
            userId,
            limit,
            useHnsw,
            useHybridSearch,
            useActivityContext,
            runComparison
          },
          recommendations: [
            { 
              id: 'diagnostic-match-1', 
              title: 'Diagnostic Match 1',
              recommendation_type: 'diagnostic',
              explanation: 'This is a mock recommendation from the diagnostic function' 
            },
            { 
              id: 'diagnostic-match-2', 
              title: 'Diagnostic Match 2',
              recommendation_type: 'diagnostic',
              explanation: 'This is a mock recommendation from the diagnostic function' 
            }
          ],
          type: 'diagnostic',
          message: 'Mock recommendations provided for testing'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Start performing actual recommendation operations
    console.log(`Getting real recommendations for user ${userId} with options: useHnsw=${useHnsw}, useHybridSearch=${useHybridSearch}, useActivityContext=${useActivityContext}`)
    
    // Get user's preference vector
    const userPreference = await getUserPreference(supabase, userId)
    if (!userPreference) {
      console.log(`User ${userId} has no preference vector`)
    }
    
    // Get matches the user is already part of (to exclude from recommendations)
    const excludeMatchIds = await getUserExistingMatches(supabase, userId)
    console.log(`User ${userId} is already part of ${excludeMatchIds.length} matches`)
    
    // If comparison mode is enabled, run both standard and enhanced algorithms
    if (runComparison) {
      console.log('Running recommendation comparison')
      
      // Start timing - original algorithm
      const startTimeOriginal = performance.now()
      
      // Get content-based recommendations - original (no HNSW)
      const contentBasedOriginal = await getContentBasedRecommendations(
        supabase, userId, userPreference, excludeMatchIds, false
      )
      
      // Get collaborative filtering recommendations
      const collaborativeOriginal = await getCollaborativeRecommendations(
        supabase, userId, excludeMatchIds
      )
      
      // Use old simple merging method
      const originalRecommendations = mergeAndRankRecommendations(
        contentBasedOriginal,
        collaborativeOriginal
      ).slice(0, limit)
      
      // End timing - original algorithm
      const endTimeOriginal = performance.now()
      const originalTime = endTimeOriginal - startTimeOriginal
      
      // Start timing - enhanced algorithm
      const startTimeEnhanced = performance.now()
      
      // Create a map to store recommendation lists by type
      const recommendationsMap = new Map<string, any[]>()
      
      // Get content-based recommendations with HNSW
      const contentBasedEnhanced = await getContentBasedRecommendations(
        supabase, userId, userPreference, excludeMatchIds, true
      )
      recommendationsMap.set('content-based', contentBasedEnhanced)
      
      // Get collaborative filtering recommendations
      const collaborativeEnhanced = await getCollaborativeRecommendations(
        supabase, userId, excludeMatchIds
      )
      recommendationsMap.set('collaborative', collaborativeEnhanced)
      
      // Get activity-based recommendations
      const activityRecommendations = await getActivityBasedRecommendations(
        supabase, userId, excludeMatchIds
      )
      recommendationsMap.set('activity', activityRecommendations)
      
      // Use Reciprocal Rank Fusion for sophisticated merging
      const enhancedRecommendations = reciprocalRankFusion(recommendationsMap).slice(0, limit)
      
      // End timing - enhanced algorithm
      const endTimeEnhanced = performance.now()
      const enhancedTime = endTimeEnhanced - startTimeEnhanced
      
      // Return comparison results
      return new Response(
        JSON.stringify({
          message: 'Recommendation comparison completed',
          comparisonResults: {
            originalAlgorithm: {
              recommendations: originalRecommendations,
              contentBasedCount: contentBasedOriginal.length,
              collaborativeCount: collaborativeOriginal.length,
              executionTimeMs: originalTime,
              description: 'Standard algorithm without HNSW indexing and 60/40 simple weighting'
            },
            enhancedAlgorithm: {
              recommendations: enhancedRecommendations,
              contentBasedCount: contentBasedEnhanced.length,
              collaborativeCount: collaborativeEnhanced.length,
              activityCount: activityRecommendations.length,
              executionTimeMs: enhancedTime,
              description: 'Enhanced algorithm with HNSW indexing, Reciprocal Rank Fusion, and activity context'
            },
            performanceImprovement: {
              timeDifferenceMs: originalTime - enhancedTime,
              percentageImprovement: ((originalTime - enhancedTime) / originalTime) * 100,
              recommendationOverlap: originalRecommendations.filter(o => 
                enhancedRecommendations.some(e => e.id === o.id)
              ).length
            }
          },
          type: 'comparison'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Standard recommendation mode with configurable options
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
    let activityRecommendations = []
    if (useActivityContext) {
      activityRecommendations = await getActivityBasedRecommendations(
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
      finalRecommendations = mergeAndRankRecommendations(
        contentBasedRecommendations,
        collaborativeRecommendations
      ).slice(0, limit)
    }
    
    // End timing
    const endTime = performance.now()
    
    return new Response(
      JSON.stringify({
        message: 'Real recommendations retrieved successfully',
        recommendations: finalRecommendations,
        diagnosticInfo: {
          userId,
          vectorPresent: !!userPreference,
          excludedMatchesCount: excludeMatchIds.length,
          contentBasedCount: contentBasedRecommendations.length,
          collaborativeCount: collaborativeRecommendations.length,
          activityCount: activityRecommendations.length,
          finalCount: finalRecommendations.length,
          metrics: {
            executionTimeMs: endTime - startTime,
            useHnsw,
            useHybridSearch,
            useActivityContext
          }
        },
        type: 'real'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    // Log error details
    console.error('Unhandled error in get-recommendations-diagnostic:', error)
    let errorMessage = error.message || 'Unknown error'
    let errorStack = error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null
    
    // Check for common error patterns and enhance the message
    if (errorMessage.includes('authentication')) {
      errorMessage = `Authentication error - please check SUPABASE_SERVICE_ROLE_KEY: ${errorMessage}`
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      errorMessage = `Network/connection error - please check SUPABASE_URL: ${errorMessage}`
    }
    
    // Return error response with detailed diagnostic information
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        errorType: error.constructor.name,
        stack: errorStack,
        recommendations: [],
        type: 'error',
        message: 'Diagnostic error response',
        supabaseInfo: {
          // Safely check if environment variables are set without revealing sensitive values
          urlConfigured: !!supabaseUrl,
          urlLength: supabaseUrl ? supabaseUrl.length : 0,
          keyConfigured: !!supabaseKey,
          keyLength: supabaseKey ? supabaseKey.length : 0,
          // Include truncated values for debugging (first few chars only)
          urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 8) + '...' : 'not-set',
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
