import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Scoring weights (must total 100%)
const WEIGHTS = {
  SPORTS: 0.40,      // 40% - Most important factor
  FACULTY: 0.25,     // 25% - Encourages community building
  SKILL: 0.20,       // 20% - Ensures compatible gameplay
  SCHEDULE: 0.10,    // 10% - Time availability
  LOCATION: 0.05     // 5% - Venue preference
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, limit = 10, offset = 0, minScore = 0.15 } = await req.json()

    console.log(`=== SIMPLIFIED RECOMMENDATIONS START ===`)
    console.log(`User: ${userId}, Limit: ${limit}, Min Score: ${minScore}`)

    // Get user profile with preferences
    const userProfile = await getUserProfile(userId)
    if (!userProfile) {
      throw new Error('User profile not found')
    }

    // Get available matches (excluding user's own matches)
    const availableMatches = await getAvailableMatches(userId)
    if (!availableMatches || availableMatches.length === 0) {
      console.log('No available matches found')
      return new Response(
        JSON.stringify({ 
          recommendations: [], 
          metadata: { count: 0, total_available: 0, type: 'simplified_direct_matching' }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${availableMatches.length} available matches`)

    // Calculate match scores using direct preference matching
    const scoredMatches = []
    
    for (const match of availableMatches) {
      const matchScore = calculateMatchScore(userProfile, match)
      
      if (matchScore.totalScore >= minScore) {
        scoredMatches.push({
          ...match,
          similarity_score: matchScore.totalScore,
          score_breakdown: matchScore.breakdown,
          explanation: generateExplanation(matchScore.breakdown)
        })
      }
    }

    // Sort by total score (highest first)
    scoredMatches.sort((a, b) => b.similarity_score - a.similarity_score)

    // Apply limit and offset
    const paginatedResults = scoredMatches.slice(offset, offset + limit)

    console.log(`Generated ${scoredMatches.length} recommendations, returning ${paginatedResults.length}`)
    console.log(`=== SIMPLIFIED RECOMMENDATIONS END ===`)

    return new Response(
      JSON.stringify({
        recommendations: paginatedResults,
        metadata: {
          count: paginatedResults.length,
          total_available: scoredMatches.length,
          type: 'simplified_direct_matching',
          algorithm: 'Direct preference matching with weighted scoring',
          weights: {
            sports: '40%',
            faculty: '25%',
            skill: '20%',
            schedule: '10%',
            location: '5%'
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in simplified recommendations:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Calculate match score using direct preference matching
 */
function calculateMatchScore(userProfile: any, match: any) {
  const breakdown = {
    sports: calculateSportsScore(userProfile, match),
    faculty: calculateFacultyScore(userProfile, match),
    skill: calculateSkillScore(userProfile, match),
    schedule: calculateScheduleScore(userProfile, match),
    location: calculateLocationScore(userProfile, match)
  }

  // Calculate weighted total score
  const totalScore = 
    (breakdown.sports * WEIGHTS.SPORTS) +
    (breakdown.faculty * WEIGHTS.FACULTY) +
    (breakdown.skill * WEIGHTS.SKILL) +
    (breakdown.schedule * WEIGHTS.SCHEDULE) +
    (breakdown.location * WEIGHTS.LOCATION)

  return {
    totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
    breakdown
  }
}

/**
 * Sports matching: Direct preference comparison
 */
function calculateSportsScore(userProfile: any, match: any): number {
  const userSports = userProfile.sport_preferences || []
  const matchSport = match.sport_name

  // Check if user has this sport in their preferences
  const hasMatchingSport = userSports.some((sport: any) => 
    sport.sport_name === matchSport || sport.sport_id === match.sport_id
  )

  return hasMatchingSport ? 1.0 : 0.0
}

/**
 * Faculty matching: Same faculty gets full points, different gets partial
 */
function calculateFacultyScore(userProfile: any, match: any): number {
  const userFaculty = userProfile.faculty
  const hostFaculty = match.host_faculty

  if (!userFaculty || !hostFaculty) {
    return 0.5 // Neutral score if faculty info missing
  }

  if (userFaculty === hostFaculty) {
    return 1.0 // Same faculty
  } else {
    return 0.5 // Different faculty (still gets partial points for diversity)
  }
}

/**
 * Skill level compatibility matrix
 */
function calculateSkillScore(userProfile: any, match: any): number {
  const userSkillLevels = userProfile.skill_levels || {}
  const matchSport = match.sport_name
  const matchSkillRequirement = match.skill_level || 'intermediate'

  // Get user's skill level for this specific sport
  let userSkillLevel = userSkillLevels[matchSport] || 'intermediate'

  // Skill compatibility matrix
  const skillMatrix: { [key: string]: { [key: string]: number } } = {
    'beginner': {
      'beginner': 1.0,
      'intermediate': 0.75,
      'advanced': 0.5,
      'professional': 0.0
    },
    'intermediate': {
      'beginner': 0.75,
      'intermediate': 1.0,
      'advanced': 0.75,
      'professional': 0.5
    },
    'advanced': {
      'beginner': 0.5,
      'intermediate': 0.75,
      'advanced': 1.0,
      'professional': 0.75
    },
    'professional': {
      'beginner': 0.0,
      'intermediate': 0.5,
      'advanced': 0.75,
      'professional': 1.0
    }
  }

  return skillMatrix[userSkillLevel]?.[matchSkillRequirement] || 0.5
}

/**
 * Schedule overlap calculation
 */
function calculateScheduleScore(userProfile: any, match: any): number {
  const userAvailableDays = userProfile.available_days || []
  const matchDate = new Date(match.start_time)
  const matchDay = matchDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

  // Check if user is available on the match day
  const isAvailableOnDay = userAvailableDays.includes(matchDay)

  if (!isAvailableOnDay) {
    return 0.0 // User not available on this day
  }

  // TODO: Add time-specific availability checking
  // For now, if available on the day, give full points
  return 1.0
}

/**
 * Location preference matching
 */
function calculateLocationScore(userProfile: any, match: any): number {
  // For now, give neutral score since we don't have detailed location preferences
  // TODO: Implement location preference system
  return 0.5
}

/**
 * Generate human-readable explanation of match score
 */
function generateExplanation(breakdown: any): string {
  const explanations = []

  if (breakdown.sports === 1.0) {
    explanations.push(`Same sport preference (${Math.round(breakdown.sports * WEIGHTS.SPORTS * 100)}%)`)
  } else {
    explanations.push(`Different sport (0%)`)
  }

  if (breakdown.faculty === 1.0) {
    explanations.push(`Same faculty (${Math.round(breakdown.faculty * WEIGHTS.FACULTY * 100)}%)`)
  } else if (breakdown.faculty === 0.5) {
    explanations.push(`Different faculty (${Math.round(breakdown.faculty * WEIGHTS.FACULTY * 100)}%)`)
  }

  if (breakdown.skill >= 0.75) {
    explanations.push(`Compatible skill level (${Math.round(breakdown.skill * WEIGHTS.SKILL * 100)}%)`)
  } else if (breakdown.skill >= 0.5) {
    explanations.push(`Moderate skill compatibility (${Math.round(breakdown.skill * WEIGHTS.SKILL * 100)}%)`)
  } else {
    explanations.push(`Skill level mismatch (${Math.round(breakdown.skill * WEIGHTS.SKILL * 100)}%)`)
  }

  if (breakdown.schedule === 1.0) {
    explanations.push(`Available during match time (${Math.round(breakdown.schedule * WEIGHTS.SCHEDULE * 100)}%)`)
  } else {
    explanations.push(`Schedule conflict (0%)`)
  }

  return explanations.join(', ')
}

/**
 * Get user profile with preferences
 */
async function getUserProfile(userId: string) {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) throw userError

    // Get sport preferences
    const { data: sportPrefs, error: sportError } = await supabase
      .from('sport_preferences_normalized')
      .select('*')
      .eq('user_id', userId)

    if (sportError) {
      console.log('No sport preferences found for user:', userId)
    }

    return {
      ...user,
      sport_preferences: sportPrefs || []
    }

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * Get available matches (excluding user's own matches and past matches)
 */
async function getAvailableMatches(userId: string) {
  try {
    const now = new Date().toISOString()

    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        sports(name),
        users!matches_host_id_fkey(faculty),
        locations(name, campus)
      `)
      .neq('host_id', userId) // Exclude user's own matches
      .gte('start_time', now) // Only future matches
      .eq('status', 'active')
      .order('start_time', { ascending: true })

    if (error) throw error

    // Transform data for easier processing
    return matches.map((match: any) => ({
      ...match,
      sport_name: match.sports?.name,
      host_faculty: match.users?.faculty,
      venue_name: match.locations?.name,
      venue_location: match.locations?.campus
    }))

  } catch (error) {
    console.error('Error fetching available matches:', error)
    return []
  }
}
