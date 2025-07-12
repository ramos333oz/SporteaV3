import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface UserData {
  id: string
  full_name: string
  faculty: string
  gender: string
  sport_preferences: any[]
  skill_levels: any
  available_days: string[]
  play_style: string
  age?: number
}

interface NormalizedSportPreference {
  sport_id: string
  sport_name: string
  skill_level: string
}

/**
 * Generate simplified 128-dimension user vector
 * 
 * VECTOR SCHEMA (128 dimensions):
 * - Sports (0-87): 11 sports × 8 dimensions each = 88 dimensions
 * - Faculty (88-95): 8 faculty types = 8 dimensions  
 * - Skill Level (96-103): 4 skill levels = 8 dimensions
 * - Schedule (104-119): 7 days + 9 time slots = 16 dimensions
 * - Enhanced (120-127): Gender, play style, age = 8 dimensions
 */
function generateUserVector128(userData: UserData, normalizedSports: NormalizedSportPreference[]): number[] {
  const vector = new Array(128).fill(0)
  
  console.log('=== V3 USER VECTOR GENERATION ===')
  console.log('User ID:', userData.id)
  console.log('User Name:', userData.full_name)
  console.log('Normalized Sports:', normalizedSports)
  
  // Sports preferences (dimensions 0-87) - 8 dimensions per sport for isolation
  const sportMapping: { [key: string]: number } = {
    'Basketball': 0,     // dimensions 0-7
    'Badminton': 8,      // dimensions 8-15  
    'Football': 16,      // dimensions 16-23
    'Tennis': 24,        // dimensions 24-31
    'Volleyball': 32,    // dimensions 32-39
    'Table Tennis': 40,  // dimensions 40-47
    'Futsal': 48,        // dimensions 48-55
    'Frisbee': 56,       // dimensions 56-63
    'Hockey': 64,        // dimensions 64-71
    'Rugby': 72,         // dimensions 72-79
    'Squash': 80         // dimensions 80-87
  }
  
  // Process normalized sport preferences
  normalizedSports.forEach(sport => {
    const startDim = sportMapping[sport.sport_name]
    if (startDim !== undefined) {
      // FIXED: Sport preferences indicate INTEREST (1.0), not skill level
      // Skill level affects skill dimensions (96-103), not sport dimensions

      // Fill 8 dimensions for this sport with maximum values for sport interest
      for (let i = 0; i < 8; i++) {
        vector[startDim + i] = 1.0 - (i * 0.01) // Slight decay for uniqueness, but still high values
      }

      console.log(`✅ ${sport.sport_name} (${sport.skill_level}) encoded at dimensions ${startDim}-${startDim + 7} with FULL INTEREST (1.0)`)
    }
  })
  
  // Faculty (dimensions 88-95)
  const facultyMapping: { [key: string]: number } = {
    'ENGINEERING': 88,
    'COMPUTER SCIENCES': 89,
    'BUSINESS': 90,
    'MEDICINE': 91,
    'LAW': 92,
    'ARTS': 93,
    'SCIENCE': 94,
    'OTHER': 95
  }
  
  if (userData.faculty && facultyMapping[userData.faculty] !== undefined) {
    vector[facultyMapping[userData.faculty]] = 1.0
    console.log(`✅ Faculty ${userData.faculty} encoded at dimension ${facultyMapping[userData.faculty]}`)
  }
  
  // Skill level (dimensions 96-103) - Based on overall skill assessment
  const avgSkillLevel = calculateAverageSkillLevel(userData.skill_levels, normalizedSports)
  const skillMapping: { [key: string]: number } = {
    'beginner': 96,
    'intermediate': 97,
    'advanced': 98,
    'professional': 99
  }

  if (skillMapping[avgSkillLevel] !== undefined) {
    // Use skill strength for skill dimensions (this is where skill level matters)
    const skillStrength = getSkillStrength(avgSkillLevel)
    vector[skillMapping[avgSkillLevel]] = skillStrength
    console.log(`✅ Overall skill level ${avgSkillLevel} encoded at dimension ${skillMapping[avgSkillLevel]} with strength ${skillStrength}`)
  }
  
  // Schedule (dimensions 104-119) - Available days
  if (userData.available_days && userData.available_days.length > 0) {
    const dayMapping: { [key: string]: number } = {
      'monday': 104, 'tuesday': 105, 'wednesday': 106, 'thursday': 107,
      'friday': 108, 'saturday': 109, 'sunday': 110
    }
    
    userData.available_days.forEach(day => {
      if (dayMapping[day] !== undefined) {
        vector[dayMapping[day]] = 1.0
      }
    })
    console.log(`✅ Available days encoded: ${userData.available_days.join(', ')}`)
  }
  
  // Enhanced attributes (dimensions 120-127)
  // Gender preference
  if (userData.gender === 'Male') {
    vector[120] = 1.0
  } else if (userData.gender === 'Female') {
    vector[121] = 1.0
  }
  
  // Play style
  if (userData.play_style === 'casual') {
    vector[122] = 1.0
  } else if (userData.play_style === 'competitive') {
    vector[123] = 1.0
  }
  
  // Age group (if available)
  if (userData.age) {
    if (userData.age < 20) vector[124] = 1.0      // Young
    else if (userData.age < 25) vector[125] = 1.0 // Student
    else if (userData.age < 30) vector[126] = 1.0 // Young adult
    else vector[127] = 1.0                        // Adult
  }
  
  console.log(`✅ Enhanced attributes encoded: gender=${userData.gender}, play_style=${userData.play_style}`)
  
  // Normalize vector
  const normalizedVector = normalizeVector(vector)
  
  // Final summary
  const nonZeroCount = normalizedVector.filter(v => v !== 0).length
  console.log(`=== V3 VECTOR SUMMARY ===`)
  console.log(`Vector dimensions: 128`)
  console.log(`Non-zero dimensions: ${nonZeroCount}`)
  console.log(`Sports encoded: ${normalizedSports.length}`)
  console.log('=== END V3 VECTOR DEBUG ===')
  
  return normalizedVector
}

// Helper functions
function getSkillStrength(level: string): number {
  const mapping: { [key: string]: number } = {
    'beginner': 0.5,
    'intermediate': 0.75,
    'advanced': 0.9,
    'professional': 1.0
  }
  return mapping[level] || 0.75
}

function calculateAverageSkillLevel(skillLevels: any, normalizedSports: NormalizedSportPreference[]): string {
  // Use normalized sports skill levels if available
  if (normalizedSports && normalizedSports.length > 0) {
    const levels = normalizedSports.map(sport => sport.skill_level)
    const weights = { 'beginner': 1, 'intermediate': 2, 'advanced': 3, 'professional': 4 }
    const avgWeight = levels.reduce((sum, level) => sum + (weights[level] || 2), 0) / levels.length
    
    if (avgWeight < 1.5) return 'beginner'
    if (avgWeight < 2.5) return 'intermediate'
    if (avgWeight < 3.5) return 'advanced'
    return 'professional'
  }
  
  // Fallback to skill_levels object
  if (!skillLevels || Object.keys(skillLevels).length === 0) return 'intermediate'
  
  const levels = Object.values(skillLevels) as string[]
  const weights = { 'beginner': 1, 'intermediate': 2, 'advanced': 3, 'professional': 4 }
  const avgWeight = levels.reduce((sum, level) => sum + (weights[level] || 2), 0) / levels.length
  
  if (avgWeight < 1.5) return 'beginner'
  if (avgWeight < 2.5) return 'intermediate'
  if (avgWeight < 3.5) return 'advanced'
  return 'professional'
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  if (magnitude === 0) return vector
  
  return vector.map(val => val / magnitude)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== GENERATE USER VECTORS V3 START ===')
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

    let requestBody
    try {
      requestBody = await req.json()
      console.log('Request body:', requestBody)
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { userId } = requestBody

    if (!userId) {
      console.error('Missing userId in request')
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('Supabase URL available:', !!supabaseUrl)
    console.log('Service role key available:', !!supabaseKey)

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Processing user vector generation for user: ${userId}`)

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      throw new Error(`User not found: ${userError?.message}`)
    }

    // Normalize sport preferences first
    const { error: normalizeError } = await supabase.rpc('normalize_user_sport_preferences', {
      user_id_param: userId
    })

    if (normalizeError) {
      console.warn('Sport normalization failed:', normalizeError.message)
    }

    // Fetch normalized sport preferences
    const { data: normalizedSports, error: sportsError } = await supabase
      .from('sport_preferences_normalized')
      .select('*')
      .eq('user_id', userId)

    if (sportsError) {
      console.warn('Failed to fetch normalized sports:', sportsError.message)
    }

    // Generate 128-dimension vector
    const vector = generateUserVector128(userData, normalizedSports || [])

    // Store in user_vectors_v3 table with proper conflict resolution
    const { error: insertError } = await supabase
      .from('user_vectors_v3')
      .upsert({
        user_id: userId,
        vector_data: vector,
        sport_preferences_normalized: normalizedSports || [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (insertError) {
      throw new Error(`Failed to store user vector: ${insertError.message}`)
    }

    console.log(`✅ Successfully generated and stored 128-dimension vector for user ${userId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User vector generated successfully',
        vector_dimensions: 128,
        sports_count: normalizedSports?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== ERROR GENERATING USER VECTOR ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('=== END ERROR ===')

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
