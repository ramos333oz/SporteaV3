import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchData {
  id: string
  title: string
  description: string
  sport_id: string
  host_id: string
}

interface ModerationResult {
  inappropriate_score: number
  consistency_score: number
  sports_validation_score: number
  overall_risk_level: 'minimal' | 'low' | 'medium' | 'high'
  auto_approved: boolean
  requires_review: boolean
  flagged_content: any
  model_confidence: any
  processing_time_ms: number
}

interface ModerationSettings {
  high_risk_threshold: number
  medium_risk_threshold: number
  low_risk_threshold: number
  auto_reject_high_risk: boolean
  auto_approve_minimal_risk: boolean
  toxic_model_weight: number
  consistency_model_weight: number
  sports_validation_weight: number
  moderation_enabled: boolean
  strict_mode: boolean
}

/**
 * Enhanced sports terminology dictionary with Malay language support and weighted scoring
 */
const SPORTS_KEYWORDS = {
  // English Sports Names (High Weight)
  'basketball': 0.9, 'football': 0.9, 'soccer': 0.9, 'tennis': 0.9,
  'badminton': 0.9, 'volleyball': 0.9, 'swimming': 0.9, 'running': 0.9,
  'cycling': 0.8, 'golf': 0.8, 'baseball': 0.8, 'cricket': 0.8,
  'rugby': 0.8, 'hockey': 0.8, 'boxing': 0.8, 'wrestling': 0.8,

  // Malay Sports Names (High Weight)
  'bola keranjang': 0.9, 'bola sepak': 0.9, 'tenis': 0.9,
  'bola tampar': 0.9, 'renang': 0.9, 'larian': 0.9,
  'basikal': 0.8, 'golf': 0.8, 'ragbi': 0.8, 'hoki': 0.8,

  // General Sports Terms (Medium Weight)
  'sport': 0.8, 'sports': 0.8, 'sukan': 0.8, 'olahraga': 0.8,
  'game': 0.7, 'match': 0.8, 'permainan': 0.7, 'perlawanan': 0.8,
  'tournament': 0.8, 'competition': 0.8, 'pertandingan': 0.8,
  'league': 0.7, 'liga': 0.7,

  // Team and People (Medium Weight)
  'team': 0.7, 'pasukan': 0.7, 'player': 0.7, 'pemain': 0.7,
  'athlete': 0.7, 'atlet': 0.7, 'coach': 0.7, 'jurulatih': 0.7,

  // Training and Activities (Medium Weight)
  'training': 0.7, 'latihan': 0.7, 'practice': 0.6, 'amalan': 0.6,
  'workout': 0.6, 'senaman': 0.6, 'fitness': 0.6, 'kecergasan': 0.6,
  'exercise': 0.6, 'bersenam': 0.6,

  // Actions (Lower Weight)
  'play': 0.5, 'main': 0.5, 'compete': 0.6, 'bertanding': 0.6,
  'train': 0.6, 'berlatih': 0.6, 'run': 0.5, 'lari': 0.5,
  'jump': 0.5, 'lompat': 0.5, 'throw': 0.5, 'lempar': 0.5,

  // Equipment (Lower Weight)
  'ball': 0.5, 'bola': 0.5, 'racket': 0.6, 'raket': 0.6,
  'equipment': 0.5, 'peralatan': 0.5, 'gear': 0.5,

  // Facilities (Medium Weight)
  'court': 0.7, 'gelanggang': 0.7, 'field': 0.7, 'padang': 0.7,
  'stadium': 0.8, 'stadium': 0.8, 'gym': 0.6, 'gimnasium': 0.6,

  // Skill Levels (Lower Weight)
  'beginner': 0.4, 'pemula': 0.4, 'intermediate': 0.4, 'pertengahan': 0.4,
  'advanced': 0.4, 'lanjutan': 0.4, 'professional': 0.5, 'profesional': 0.5
}

/**
 * Enhanced toxic content detection with Malay language support
 * Includes sports context awareness to prevent false positives
 */
async function detectToxicContent(text: string): Promise<{ score: number, flagged: string[] }> {
  const toxicPatterns = [
    // English explicit profanity (High severity)
    /\b(fuck|shit|damn|hell|bitch|asshole|bastard|cunt)\b/gi,

    // Malay explicit profanity (High severity)
    /\b(puki|pantat|bodoh|bangsat|sial|celaka|keparat)\b/gi,

    // English hate speech (Medium severity)
    /\b(hate|stupid|idiot|loser|suck|terrible|awful|worst|pathetic)\b/gi,

    // Malay hate speech (Medium severity)
    /\b(benci|tolol|gila|teruk|busuk|sampah|hina)\b/gi,

    // Threatening language - English (High severity)
    /\b(kill|murder|destroy|hurt|harm|attack|die|death)\b/gi,

    // Threatening language - Malay (High severity)
    /\b(bunuh|mati|hancur|sakiti|serang|mampus)\b/gi,

    // Discriminatory language (Medium severity)
    /\b(retard|disabled|handicapped|freak|weirdo)\b/gi
  ]

  // Sports context whitelist - competitive terms that are acceptable in sports
  const sportsWhitelist = [
    /\b(beat|crush|destroy|kill|murder|attack|fight|battle|war|dominate|demolish)\s+(the\s+)?(opponent|enemy|competition|team|player)\b/gi,
    /\b(killer|deadly|crushing|devastating|brutal)\s+(shot|serve|play|move|strategy)\b/gi,
    /\b(fight|battle|war)\s+(for|to|until)\s+(victory|win|championship)\b/gi
  ]

  let score = 0
  const flagged: string[] = []

  // Check if text contains sports context
  const hasSportsContext = Object.keys(SPORTS_KEYWORDS).some(keyword =>
    text.toLowerCase().includes(keyword.toLowerCase())
  )

  for (const pattern of toxicPatterns) {
    const matches = text.match(pattern)
    if (matches) {
      // Check if matches are in sports context (whitelist)
      let validMatches = matches

      if (hasSportsContext) {
        validMatches = matches.filter(match => {
          // Check if this match is in acceptable sports context
          const isWhitelisted = sportsWhitelist.some(whitelistPattern => {
            const contextMatch = text.match(whitelistPattern)
            return contextMatch && contextMatch.some(ctx =>
              ctx.toLowerCase().includes(match.toLowerCase())
            )
          })
          return !isWhitelisted
        })
      }

      if (validMatches.length > 0) {
        // Severity scoring
        const severity = pattern.source.includes('kill|murder|bunuh|mati') ? 0.4 :
                        pattern.source.includes('fuck|puki|pantat') ? 0.3 : 0.2

        score += validMatches.length * severity
        flagged.push(...validMatches.map(m => m.toLowerCase()))
      }
    }
  }

  // Normalize score to 0-1 range
  score = Math.min(score, 1.0)

  return { score, flagged: [...new Set(flagged)] }
}

/**
 * Enhanced sports content validation with Malay language support
 * Uses weighted keyword scoring for more accurate relevance detection
 */
async function validateSportsContent(title: string, description: string): Promise<number> {
  const fullText = `${title} ${description}`.toLowerCase()

  let sportsScore = 0
  let totalWeight = 0
  let keywordCount = 0

  // Check each keyword and apply its weight
  for (const [keyword, weight] of Object.entries(SPORTS_KEYWORDS)) {
    if (fullText.includes(keyword.toLowerCase())) {
      sportsScore += weight
      totalWeight += weight
      keywordCount++
    }
  }

  // Normalize score based on total weight found
  let normalizedScore = totalWeight > 0 ? sportsScore / totalWeight : 0

  // Bonus scoring for multiple keywords (indicates stronger sports relevance)
  if (keywordCount >= 3) normalizedScore += 0.15
  if (keywordCount >= 5) normalizedScore += 0.10
  if (keywordCount >= 7) normalizedScore += 0.05

  // Penalty for very short content
  if (fullText.length < 20) {
    normalizedScore *= 0.7
  }

  // Bonus for sports-specific patterns
  const sportsPatterns = [
    /\b(join|gabung)\s+(us|kami|kita)\s+(for|untuk)\b/gi,
    /\b(all\s+skill\s+levels|semua\s+tahap\s+kemahiran)\b/gi,
    /\b(bring\s+your\s+own|bawa\s+sendiri)\b/gi,
    /\b(training\s+session|sesi\s+latihan)\b/gi
  ]

  for (const pattern of sportsPatterns) {
    if (pattern.test(fullText)) {
      normalizedScore += 0.05
    }
  }

  return Math.min(normalizedScore, 1.0)
}



/**
 * Calculate overall risk level based on simplified 2-component system
 * New weights: Toxic Content 75%, Sports Relevance 25%
 * Removed: Title-Description Consistency component
 */
function calculateRiskLevel(
  inappropriateScore: number,
  sportsScore: number,
  settings: ModerationSettings
): { riskLevel: 'minimal' | 'low' | 'medium' | 'high', overallScore: number } {

  // Simplified 2-component weighted risk score
  // Toxic Content Detection: 75% weight (increased from 60%)
  // Sports Relevance Detection: 25% weight (increased from 15%)
  const overallScore = (
    (inappropriateScore * 0.75) +
    ((1 - sportsScore) * 0.25)
  )

  // Determine risk level based on thresholds
  let riskLevel: 'minimal' | 'low' | 'medium' | 'high'

  if (overallScore >= settings.high_risk_threshold) {
    riskLevel = 'high'
  } else if (overallScore >= settings.medium_risk_threshold) {
    riskLevel = 'medium'
  } else if (overallScore >= settings.low_risk_threshold) {
    riskLevel = 'low'
  } else {
    riskLevel = 'minimal'
  }

  // Apply strict mode adjustments
  if (settings.strict_mode) {
    if (riskLevel === 'minimal') riskLevel = 'low'
    if (riskLevel === 'low') riskLevel = 'medium'
  }

  return { riskLevel, overallScore }
}

/**
 * Main content moderation function
 */
async function moderateContent(
  matchData: MatchData,
  settings: ModerationSettings
): Promise<ModerationResult> {
  const startTime = Date.now()
  
  console.log(`[Moderation] Processing match: ${matchData.id}`)
  console.log(`[Moderation] Title: "${matchData.title}"`)
  console.log(`[Moderation] Description: "${matchData.description?.substring(0, 100)}..."`)
  
  // Run simplified 2-component moderation checks
  const [toxicResult, sportsScore] = await Promise.all([
    detectToxicContent(`${matchData.title} ${matchData.description || ''}`),
    validateSportsContent(matchData.title, matchData.description || '')
  ])

  console.log(`[Moderation] Toxic score: ${toxicResult.score} (75% weight)`)
  console.log(`[Moderation] Sports score: ${sportsScore} (25% weight)`)
  console.log(`[Moderation] Flagged toxic content:`, toxicResult.flagged)

  // Calculate overall risk using simplified 2-component system
  const { riskLevel, overallScore } = calculateRiskLevel(
    toxicResult.score,
    sportsScore,
    settings
  )
  
  console.log(`[Moderation] Overall risk: ${riskLevel} (${overallScore.toFixed(3)})`)
  
  // Determine automatic actions
  const autoApproved = riskLevel === 'minimal' && settings.auto_approve_minimal_risk
  const requiresReview = riskLevel !== 'minimal' || !settings.auto_approve_minimal_risk
  
  const processingTime = Date.now() - startTime
  
  return {
    inappropriate_score: Number(toxicResult.score.toFixed(4)),
    consistency_score: null, // Removed in simplified 2-component system
    sports_validation_score: Number(sportsScore.toFixed(4)),
    overall_risk_level: riskLevel,
    auto_approved: autoApproved,
    requires_review: requiresReview,
    flagged_content: {
      toxic_words: toxicResult.flagged,
      risk_factors: {
        high_toxicity: toxicResult.score > 0.7,
        non_sports_content: sportsScore < 0.2,
        malay_content_detected: /\b(sukan|latihan|permainan|bola|larian)\b/i.test(`${matchData.title} ${matchData.description || ''}`)
      }
    },
    model_confidence: {
      toxic_detection: toxicResult.score > 0.5 ? 'high' : 'medium',
      sports_validation: sportsScore > 0.7 ? 'high' : 'medium',
      system_version: '2.0-simplified'
    },
    processing_time_ms: processingTime
  }
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

    console.log(`[Moderation] Starting moderation for match: ${matchId}`)

    // Fetch match data
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('id, title, description, sport_id, host_id')
      .eq('id', matchId)
      .single()

    if (matchError || !matchData) {
      throw new Error(`Failed to fetch match data: ${matchError?.message}`)
    }

    // Fetch moderation settings
    const { data: settings, error: settingsError } = await supabase
      .from('content_moderation_settings')
      .select('*')
      .limit(1)
      .single()

    if (settingsError || !settings) {
      throw new Error(`Failed to fetch moderation settings: ${settingsError?.message}`)
    }

    // Check if moderation is enabled
    if (!settings.moderation_enabled) {
      console.log('[Moderation] Moderation disabled, auto-approving')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Moderation disabled - auto approved',
          auto_approved: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Perform content moderation
    const moderationResult = await moderateContent(matchData, settings)

    // Store moderation results
    const { data: storedResult, error: storeError } = await supabase
      .from('content_moderation_results')
      .insert({
        match_id: matchId,
        inappropriate_score: moderationResult.inappropriate_score,
        consistency_score: moderationResult.consistency_score,
        sports_validation_score: moderationResult.sports_validation_score,
        overall_risk_level: moderationResult.overall_risk_level,
        auto_approved: moderationResult.auto_approved,
        requires_review: moderationResult.requires_review,
        flagged_content: moderationResult.flagged_content,
        model_confidence: moderationResult.model_confidence,
        processing_time_ms: moderationResult.processing_time_ms
      })
      .select()
      .single()

    if (storeError) {
      throw new Error(`Failed to store moderation results: ${storeError.message}`)
    }

    // Queue for admin review if needed
    if (moderationResult.requires_review) {
      const { error: queueError } = await supabase
        .from('admin_review_queue')
        .insert({
          match_id: matchId,
          moderation_result_id: storedResult.id,
          status: 'pending'
        })

      if (queueError) {
        console.error('[Moderation] Failed to queue for review:', queueError.message)
      } else {
        console.log(`[Moderation] Queued for admin review with ${moderationResult.overall_risk_level} priority`)
      }
    }

    // Handle high-risk content
    if (moderationResult.overall_risk_level === 'high' && settings.auto_reject_high_risk) {
      // Update match status to rejected/cancelled
      await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('id', matchId)

      // Send notification to user
      await supabase
        .from('notifications')
        .insert({
          user_id: matchData.host_id,
          type: 'content_violation',
          title: 'Match Content Violation',
          content: 'Your match has been automatically rejected due to content policy violations. Please review our community guidelines and try again.',
          is_read: false
        })

      console.log(`[Moderation] High-risk content auto-rejected: ${matchId}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Content moderation completed',
        result: {
          risk_level: moderationResult.overall_risk_level,
          auto_approved: moderationResult.auto_approved,
          requires_review: moderationResult.requires_review,
          processing_time_ms: moderationResult.processing_time_ms
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Moderation] Error:', error.message)
    return new Response(
      JSON.stringify({ 
        error: 'Content moderation failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
