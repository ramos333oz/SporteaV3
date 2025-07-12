import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchData {
  id: string
  title: string
  sport_id: string
  host_id: string
  location_id: string
  skill_level: string
  description: string
  start_time: string
  sports?: { name: string }
  locations?: { name: string, campus: string }
  host?: { faculty: string, gender: string, play_style: string }
}

/**
 * Generate simplified 128-dimension match vector
 * 
 * VECTOR SCHEMA (128 dimensions):
 * - Sports (0-87): 11 sports × 8 dimensions each = 88 dimensions
 * - Faculty (88-95): 8 faculty types = 8 dimensions  
 * - Skill Level (96-103): 4 skill levels = 8 dimensions
 * - Schedule (104-119): 7 days + 9 time slots = 16 dimensions
 * - Enhanced (120-127): Gender, play style, location = 8 dimensions
 */
function generateMatchVector128(matchData: MatchData): number[] {
  const vector = new Array(128).fill(0)
  
  console.log('=== V3 MATCH VECTOR GENERATION ===')
  console.log('Match ID:', matchData.id)
  console.log('Match Title:', matchData.title)
  console.log('Sport:', matchData.sports?.name)
  console.log('Skill Level:', matchData.skill_level)
  
  // Sports encoding (dimensions 0-87) - 8 dimensions per sport
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
  
  const sportName = matchData.sports?.name || 'Unknown'
  const sportIndex = sportMapping[sportName]
  
  if (sportIndex !== undefined) {
    // Fill 8 dimensions for this sport with maximum strength
    for (let i = 0; i < 8; i++) {
      vector[sportIndex + i] = 1.0 * (1.0 - (i * 0.01)) // Slight decay for uniqueness
    }
    console.log(`✅ Sport ${sportName} encoded at dimensions ${sportIndex}-${sportIndex + 7}`)
  } else {
    console.log(`⚠️ Unknown sport: ${sportName}`)
  }
  
  // Faculty encoding (dimensions 88-95) - Based on host faculty
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
  
  if (matchData.host?.faculty && facultyMapping[matchData.host.faculty] !== undefined) {
    vector[facultyMapping[matchData.host.faculty]] = 1.0
    console.log(`✅ Host faculty ${matchData.host.faculty} encoded at dimension ${facultyMapping[matchData.host.faculty]}`)
  }
  
  // Skill level encoding (dimensions 96-103)
  const skillMapping: { [key: string]: number } = {
    'beginner': 96,
    'intermediate': 97,
    'advanced': 98,
    'professional': 99
  }
  
  const skillLevel = matchData.skill_level?.toLowerCase() || 'intermediate'
  if (skillMapping[skillLevel] !== undefined) {
    vector[skillMapping[skillLevel]] = 1.0
    console.log(`✅ Skill level ${skillLevel} encoded at dimension ${skillMapping[skillLevel]}`)
  }
  
  // Schedule encoding (dimensions 104-119)
  const startTime = new Date(matchData.start_time)
  const dayOfWeek = startTime.getDay() // 0 = Sunday, 1 = Monday, etc.
  const hour = startTime.getHours()
  
  // Day of week encoding (dimensions 104-110)
  const dayMapping = [110, 104, 105, 106, 107, 108, 109] // Sunday=110, Monday=104, etc.
  if (dayOfWeek >= 0 && dayOfWeek < 7) {
    vector[dayMapping[dayOfWeek]] = 1.0
    console.log(`✅ Day of week ${dayOfWeek} encoded at dimension ${dayMapping[dayOfWeek]}`)
  }
  
  // Time slot encoding (dimensions 111-119) - Group hours into time periods
  const timeSlots = [
    { start: 6, end: 9, dim: 111 },   // Early morning
    { start: 9, end: 12, dim: 112 },  // Morning
    { start: 12, end: 14, dim: 113 }, // Lunch
    { start: 14, end: 17, dim: 114 }, // Afternoon
    { start: 17, end: 19, dim: 115 }, // Evening
    { start: 19, end: 22, dim: 116 }, // Night
    { start: 22, end: 24, dim: 117 }, // Late night
    { start: 0, end: 6, dim: 118 }    // Very early
  ]
  
  for (const slot of timeSlots) {
    if (hour >= slot.start && hour < slot.end) {
      vector[slot.dim] = 1.0
      console.log(`✅ Time slot ${slot.start}-${slot.end} encoded at dimension ${slot.dim}`)
      break
    }
  }
  
  // Enhanced attributes (dimensions 120-127)
  // Host gender
  if (matchData.host?.gender === 'Male') {
    vector[120] = 1.0
  } else if (matchData.host?.gender === 'Female') {
    vector[121] = 1.0
  }
  
  // Play style detection from title/description
  const title = matchData.title?.toLowerCase() || ''
  const description = matchData.description?.toLowerCase() || ''
  const hostPlayStyle = matchData.host?.play_style?.toLowerCase() || ''
  
  if (title.includes('competitive') || description.includes('competitive') || 
      title.includes('tournament') || description.includes('tournament') ||
      hostPlayStyle === 'competitive') {
    vector[123] = 1.0 // Competitive
    console.log(`✅ Competitive play style detected`)
  } else {
    vector[122] = 1.0 // Casual (default)
    console.log(`✅ Casual play style (default)`)
  }
  
  // Location type (dimensions 124-127)
  const locationName = matchData.locations?.name?.toLowerCase() || ''
  if (locationName.includes('court')) {
    vector[124] = 1.0 // Court
  } else if (locationName.includes('field')) {
    vector[125] = 1.0 // Field
  } else if (locationName.includes('pool')) {
    vector[126] = 1.0 // Pool
  } else {
    vector[127] = 1.0 // Other
  }
  
  console.log(`✅ Enhanced attributes encoded: gender=${matchData.host?.gender}, location_type=${locationName}`)
  
  // Normalize vector
  const normalizedVector = normalizeVector(vector)
  
  // Final summary
  const nonZeroCount = normalizedVector.filter(v => v !== 0).length
  console.log(`=== V3 MATCH VECTOR SUMMARY ===`)
  console.log(`Vector dimensions: 128`)
  console.log(`Non-zero dimensions: ${nonZeroCount}`)
  console.log(`Sport: ${sportName}`)
  console.log(`Skill: ${skillLevel}`)
  console.log('=== END V3 MATCH VECTOR DEBUG ===')
  
  return normalizedVector
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
    const { matchId } = await req.json()

    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'matchId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Processing match vector generation for match: ${matchId}`)

    // Fetch match data with related information
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        sports(name),
        locations(name, campus),
        host:host_id(faculty, gender, play_style)
      `)
      .eq('id', matchId)
      .single()

    if (matchError || !matchData) {
      throw new Error(`Match not found: ${matchError?.message}`)
    }

    // Generate 128-dimension vector
    const vector = generateMatchVector128(matchData)

    // Store in match_vectors_v3 table
    const { error: insertError } = await supabase
      .from('match_vectors_v3')
      .upsert({
        match_id: matchId,
        vector_data: vector,
        sport_id: matchData.sport_id
      })

    if (insertError) {
      throw new Error(`Failed to store match vector: ${insertError.message}`)
    }

    console.log(`✅ Successfully generated and stored 128-dimension vector for match ${matchId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Match vector generated successfully',
        vector_dimensions: 128,
        sport: matchData.sports?.name || 'Unknown'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating match vector:', error.message)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
