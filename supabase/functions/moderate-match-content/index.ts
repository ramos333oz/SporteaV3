/**
 * Cascading Fallback Content Moderation Edge Function
 *
 * This enhanced edge function implements a 3-tier cascading fallback system
 * to address the critical failure where XLM-RoBERTa scored Malay profanity
 * "babi" at only 16.61% instead of the expected 85%+.
 *
 * Cascading Architecture:
 * - Primary: Malaysian SFW Classifier (specialized for Malaysian content)
 * - Secondary: XLM-RoBERTa (multilingual capabilities)
 * - Tertiary: Local Malay Detector (reliable fallback)
 *
 * Key Features:
 * - Multi-tier ML fallback with proper error handling
 * - <3 second processing time optimization
 * - Confidence-based tier selection
 * - Comprehensive logging and monitoring
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Performance Optimization: Simple in-memory cache for repeated content
const contentCache = new Map<string, { result: any, timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes cache TTL
const MAX_CACHE_SIZE = 100 // Prevent memory bloat

function getCachedResult(text: string): any | null {
  const cacheKey = text.toLowerCase().trim()
  const cached = contentCache.get(cacheKey)

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log('[Cache] HIT: Using cached result for content')
    return { ...cached.result, cached: true }
  }

  return null
}

function setCachedResult(text: string, result: any): void {
  const cacheKey = text.toLowerCase().trim()

  // Simple LRU: remove oldest entries if cache is full
  if (contentCache.size >= MAX_CACHE_SIZE) {
    const firstKey = contentCache.keys().next().value
    contentCache.delete(firstKey)
  }

  contentCache.set(cacheKey, {
    result: { ...result, cached: false },
    timestamp: Date.now()
  })

  console.log(`[Cache] SET: Cached result for content (cache size: ${contentCache.size})`)
}

// Cascading Fallback Configuration
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models'
const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY') || ''

// Tier-specific timeouts for <3 second total processing
const TIER_TIMEOUTS = {
  PRIMARY: 2000,    // Malaysian SFW - 2 seconds
  SECONDARY: 2000,  // XLM-RoBERTa - 2 seconds
  TERTIARY: 100     // Local Detector - 100ms
}

// Confidence thresholds for tier acceptance
const CONFIDENCE_THRESHOLDS = {
  MALAYSIAN_SFW: 0.7,    // High confidence threshold
  XLM_ROBERTA: 0.8,      // Higher confidence threshold
  LOCAL_DETECTOR: 0.8    // High confidence for local
}

const ENABLE_ML_MODELS = Deno.env.get('ENABLE_ML_MODELS') !== 'false'

interface MatchData {
  id: string
  title: string
  description: string
  sport_id: string
  host_id: string
}

interface ModerationResult {
  inappropriate_score: number
  consistency_score: number | null
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
  // New ML-specific settings
  ml_enabled?: boolean
  ml_confidence_threshold?: number
  ml_timeout_ms?: number
  ml_primary_model?: string
  ml_fallback_model?: string
  ml_tertiary_model?: string
  simplified_mode?: boolean
}

interface MLResult {
  score: number
  confidence: 'high' | 'medium' | 'low'
  model_used: string
  processing_time_ms: number
  fallback_used: boolean
  cascade_level: 1 | 2 | 3
  fallback_tier?: 'primary' | 'secondary' | 'tertiary'
  flagged_words: string[]
  fallback_reason?: string
  processing_breakdown?: {
    level1_time?: number
    level2_time?: number
    level3_time?: number
  }
  additional_info?: any
}

// Cascading error types for proper error handling
interface CascadeError extends Error {
  level: number
  model: string
  originalError?: Error
}

interface CascadeResult extends MLResult {
  primary_model_used: string
  secondary_model_used?: string
  tertiary_model_used?: string
  total_api_calls: number
  success_tier: 'primary' | 'secondary' | 'tertiary'
}

interface HuggingFaceResponse {
  label: string
  score: number
}

interface AdaptiveThresholds {
  high_risk: number
  medium_risk: number
  low_risk: number
  context_id: string | null
  learning_enabled: boolean
}

interface LearningContext {
  sport_id: string
  user_id: string
  title: string
  description: string
  content_length: number
  language_mix: string
  time_period: string
}

/**
 * Enhanced Malay Toxicity Detection Service
 * Addresses the core issue where Malay profanity is under-detected
 * FIXES: "bodoh" 0.13% → 65%, "sial" 0.13% → 60%
 */
class MalayToxicityDetector {
  private readonly lexicon = {
    // High severity (0.8-1.0) - Educational environment standards
    high_severity: {
      'puki': 0.95, 'pukimak': 0.98, 'kontol': 0.90, 'babi': 0.85,
      'anjing': 0.80, 'celaka': 0.82, 'bangsat': 0.88, 'lancau': 0.85,
      'kimak': 0.87, 'pantat': 0.83
    },

    // Medium severity (0.5-0.8) - FIXES THE 0.13% ISSUE
    medium_severity: {
      'bodoh': 0.65,    // Was 0.13%, now correctly 65%
      'sial': 0.60,     // Was 0.13%, now correctly 60%
      'tolol': 0.62, 'gila': 0.55, 'bengap': 0.58, 'bangang': 0.63,
      'hampeh': 0.57, 'bongok': 0.59, 'kepala hotak': 0.61
    },

    // Low severity (0.2-0.5)
    low_severity: {
      'celah': 0.30, 'hampas': 0.35, 'tak guna': 0.40,
      'lemah': 0.25, 'teruk': 0.28
    },

    // Context modifiers
    intensifiers: ['betul', 'sangat', 'memang', 'benar', 'amat'],
    targets: ['kau', 'korang', 'awak', 'dia', 'mereka']
  }

  detectToxicity(text: string) {
    const lowerText = text.toLowerCase()
    let maxScore = 0
    const detectedWords: string[] = []

    // Check all severity categories
    Object.entries(this.lexicon).forEach(([category, words]) => {
      if (category.includes('severity')) {
        Object.entries(words as Record<string, number>).forEach(([word, score]) => {
          const regex = new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'gi')
          if (regex.test(lowerText)) {
            detectedWords.push(word)
            maxScore = Math.max(maxScore, score)
          }
        })
      }
    })

    // Apply context modifiers
    const contextMultiplier = this.getContextMultiplier(lowerText)
    const finalScore = Math.min(maxScore * contextMultiplier, 1.0)

    return {
      toxicity_score: finalScore,
      detected_words: detectedWords,
      confidence: detectedWords.length > 0 ? 0.95 : 0.0
    }
  }

  private getContextMultiplier(text: string): number {
    let multiplier = 1.0

    // Increase severity if intensifiers present
    if (this.lexicon.intensifiers.some(word => text.includes(word))) {
      multiplier *= 1.2
    }

    // Increase severity if targeting people
    if (this.lexicon.targets.some(word => text.includes(word))) {
      multiplier *= 1.15
    }

    // Reduce severity for sports context
    const sportsContext = /\b(main|permainan|lawan|menang|kalah|pertandingan)\b/gi
    if (sportsContext.test(text)) {
      multiplier *= 0.9
    }

    return Math.min(multiplier, 1.5)
  }
}

/**
 * Malaysian SFW Classifier Integration - PRIMARY TIER
 * Specialized for Malaysian content moderation with high accuracy for Malay profanity
 */
async function callMalaysianSFW(text: string): Promise<MLResult> {
  const startTime = Date.now()

  try {
    console.log('[Malaysian SFW] Calling malaysia-ai/malaysian-sfw-classifier...')

    const response = await fetch(`${HUGGINGFACE_API_URL}/malaysia-ai/malaysian-sfw-classifier`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: {
          wait_for_model: true,
          use_cache: false
        }
      }),
      signal: AbortSignal.timeout(TIER_TIMEOUTS.PRIMARY)
    })

    if (!response.ok) {
      throw new Error(`Malaysian SFW API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('[Malaysian SFW] Raw response:', JSON.stringify(result))

    // Process response (assuming binary classification)
    let toxicScore = 0
    if (Array.isArray(result)) {
      const toxicResult = result.find(r =>
        r.label === 'TOXIC' || r.label === 'NSFW' || r.label === 'UNSAFE'
      )
      toxicScore = toxicResult?.score || 0
    } else if (result.label) {
      toxicScore = result.label === 'TOXIC' ? result.score : (1 - result.score)
    }

    const confidence = toxicScore >= CONFIDENCE_THRESHOLDS.MALAYSIAN_SFW ? 'high' :
                      toxicScore >= 0.4 ? 'medium' : 'low'

    console.log(`[Malaysian SFW] Success: ${toxicScore.toFixed(4)} toxic score, confidence: ${confidence}`)

    return {
      score: toxicScore,
      confidence,
      model_used: 'malaysia-ai/malaysian-sfw-classifier',
      processing_time_ms: Date.now() - startTime,
      fallback_used: false,
      cascade_level: 1,
      flagged_words: toxicScore > 0.5 ? extractMalayToxicWords(text) : []
    }

  } catch (error) {
    console.error(`[Malaysian SFW] API call failed: ${error.message}`)

    // Create cascade error for proper error handling
    const cascadeError = new Error(`Malaysian SFW failed: ${error.message}`) as CascadeError
    cascadeError.level = 1
    cascadeError.model = 'malaysia-ai/malaysian-sfw-classifier'
    cascadeError.originalError = error

    throw cascadeError
  }
}

/**
 * Language Detection for Intelligent Routing
 */
function detectLanguageContent(text: string) {
  const lowerText = text.toLowerCase()

  // Malay language indicators
  const malayPatterns = [
    /\b(yang|dan|ini|itu|dengan|untuk|pada|dari|ke|di|adalah|akan|sudah|belum|tidak|tak)\b/gi,
    /\b(saya|kami|kita|awak|kau|dia|mereka|anda)\b/gi,
    /\b(main|permainan|sukan|latihan|pertandingan|lawan|menang|kalah)\b/gi,
    /\b(bodoh|sial|tolol|gila|babi|anjing|puki|bangsat)\b/gi
  ]

  let malayMatches = 0
  malayPatterns.forEach(pattern => {
    const matches = lowerText.match(pattern)
    if (matches) malayMatches += matches.length
  })

  const totalWords = text.split(/\s+/).length
  const malayRatio = malayMatches / totalWords

  return {
    primary: malayRatio > 0.1 ? 'malay' : 'english',
    confidence: Math.min(malayRatio * 2, 1.0),
    hasMalayContent: malayMatches > 0
  }
}

function extractMalayToxicWords(text: string): string[] {
  const malayDetector = new MalayToxicityDetector()
  const result = malayDetector.detectToxicity(text)
  return result.detected_words
}

/**
 * Cascading Fallback ML Detection - MAIN FUNCTION
 * Implements 3-tier cascading system for optimal Malay content moderation
 */
async function detectToxicContentML(text: string, settings: ModerationSettings): Promise<CascadeResult> {
  const startTime = Date.now()

  // Performance Optimization: Check cache first
  const cachedResult = getCachedResult(text)
  if (cachedResult) {
    return {
      ...cachedResult,
      processing_time_ms: Date.now() - startTime,
      cache_hit: true
    } as CascadeResult
  }

  const processingBreakdown = {
    level1_time: 0,
    level2_time: 0,
    level3_time: 0
  }

  // Check if ML is enabled
  if (!ENABLE_ML_MODELS || !settings.ml_enabled) {
    console.log('[Cascade] ML models disabled, using rule-based fallback')
    const result = await detectToxicContentRuleBased(text, startTime)
    const finalResult = {
      ...result,
      cascade_level: 3,
      primary_model_used: 'rule-based-disabled',
      total_api_calls: 0,
      success_tier: 'tertiary',
      processing_breakdown: processingBreakdown
    } as CascadeResult

    // Cache the result for future requests
    setCachedResult(text, finalResult)
    return finalResult
  }

  console.log('[Cascade] Starting 3-tier cascading detection...')

  // TIER 1: Malaysian SFW Classifier (Primary) - TEMPORARILY DISABLED
  // Issue: Model requires custom_code and is not available via standard Inference API (404 error)
  // Skipping to Tier 2 for performance optimization
  console.log('[Cascade] Level 1: Malaysian SFW Classifier temporarily disabled (API access issue)')
  console.log('[Cascade] Level 1: Skipping to Level 2 (XLM-RoBERTa)...')
  processingBreakdown.level1_time = 0 // No time spent on disabled tier

  // TIER 1 (OPTIMIZED): XLM-RoBERTa with Malay Enhancement (Now Primary)
  try {
    console.log('[Cascade] Level 1: Attempting XLM-RoBERTa (optimized for Malay)...')
    const level1Start = Date.now()

    const xlmResult = await detectToxicContentML_Enhanced(text, settings)
    processingBreakdown.level1_time = Date.now() - level1Start

    // Enhanced confidence check for Malay content
    const malayWords = extractMalayToxicWords(text)
    const hasMalayToxic = malayWords.length > 0

    // Lower confidence threshold if Malay toxic words detected
    let finalScore = xlmResult.score
    let confidenceBoost = false

    if (hasMalayToxic && xlmResult.score < 0.5) {
      finalScore = Math.max(xlmResult.score, 0.65) // Boost to medium risk for Malay profanity
      confidenceBoost = true
      console.log(`[Cascade] Level 1: Malay boost applied - score ${xlmResult.score.toFixed(4)} → ${finalScore.toFixed(4)}`)
    }

    if (xlmResult.confidence === 'high' || (hasMalayToxic && xlmResult.confidence === 'medium')) {
      console.log(`[Cascade] Level 1 SUCCESS: ${xlmResult.confidence} confidence (${finalScore.toFixed(4)}) ${hasMalayToxic ? '+ Malay detection' : ''}`)
      const result = {
        ...xlmResult,
        score: finalScore,
        cascade_level: 1,
        primary_model_used: xlmResult.model_used,
        total_api_calls: 1,
        success_tier: 'primary',
        processing_breakdown: processingBreakdown,
        malay_boost_applied: confidenceBoost,
        flagged_words: hasMalayToxic ? malayWords : xlmResult.flagged_words || []
      } as CascadeResult

      // Cache successful result
      setCachedResult(text, result)
      return result
    }

    console.log(`[Cascade] Level 1: ${xlmResult.confidence} confidence (${finalScore.toFixed(4)}), using Level 2...`)

  } catch (error) {
    console.log(`[Cascade] Level 1 FAILED: ${error.message}, using Level 2...`)
    processingBreakdown.level1_time = Date.now() - startTime
  }

  // TIER 2: Enhanced Rule-based Malay Detector (Final Fallback)
  console.log('[Cascade] Level 2: Using enhanced rule-based fallback...')
  const level2Start = Date.now()

  const localResult = await detectToxicContentRuleBased(text, startTime, true)
  processingBreakdown.level2_time = Date.now() - level2Start

  console.log(`[Cascade] Level 2 COMPLETE: Final fallback result (${localResult.score.toFixed(4)})`)

  const finalResult = {
    ...localResult,
    cascade_level: 2,
    primary_model_used: 'unitary/multilingual-toxic-xlm-roberta',
    secondary_model_used: 'enhanced-rule-based-malay',
    total_api_calls: 1,
    success_tier: 'secondary',
    processing_breakdown: processingBreakdown,
    fallback_reason: 'Level 1 failed or low confidence',
    malaysian_sfw_status: 'disabled-api-access-issue'
  } as CascadeResult

  // Cache fallback result
  setCachedResult(text, finalResult)
  return finalResult
}

/**
 * Existing toxic-bert function (unchanged for English content)
 */
/**
 * Enhanced ML Detection Function - Supports Multiple Models
 * Now supports both Multilingual XLM-RoBERTa and Toxic-BERT with proper response parsing
 */
async function detectToxicContentML_Enhanced(text: string, settings: ModerationSettings): Promise<MLResult> {
  const startTime = Date.now()

  try {
    const apiKey = Deno.env.get('HUGGINGFACE_API_KEY')
    if (!apiKey) {
      throw new Error('No Hugging Face API key available')
    }

    const primaryModel = settings.ml_primary_model || 'unitary/multilingual-toxic-xlm-roberta'
    console.log(`[ML Enhanced] Attempting model: ${primaryModel}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), settings.ml_timeout_ms || ML_TIMEOUT_MS)

    const response = await fetch(`${HUGGINGFACE_API_URL}/${primaryModel}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: {
          wait_for_model: true,
          use_cache: false
        }
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    console.log(`[ML Enhanced] Raw response:`, JSON.stringify(result))

    // Handle nested array structure: [[{label, score}]] or [{label, score}]
    let predictions: any[]
    if (Array.isArray(result) && Array.isArray(result[0])) {
      predictions = result[0] // Nested array case
    } else if (Array.isArray(result)) {
      predictions = result // Direct array case
    } else {
      throw new Error('Unexpected response format')
    }

    console.log(`[ML Enhanced] Parsed predictions:`, JSON.stringify(predictions))

    // Find toxic score - handle different label formats
    let toxicScore = 0
    let detectedCategory = 'safe'

    // Look for 'toxic' label (case insensitive)
    const toxicResult = predictions.find((r: any) =>
      r.label && r.label.toLowerCase() === 'toxic'
    )

    if (toxicResult) {
      toxicScore = toxicResult.score || 0
      detectedCategory = toxicResult.label
      console.log(`[ML Enhanced] Found toxic label: ${detectedCategory} with score ${toxicScore.toFixed(4)}`)
    } else {
      // If no 'toxic' label found, use highest score
      const maxResult = predictions.reduce((max: any, current: any) =>
        (current.score || 0) > (max.score || 0) ? current : max
      , { score: 0, label: 'unknown' })

      toxicScore = maxResult.score || 0
      detectedCategory = maxResult.label || 'unknown'
      console.log(`[ML Enhanced] No toxic label found, using highest score: ${detectedCategory} with score ${toxicScore.toFixed(4)}`)
    }

    console.log(`[ML Enhanced] Final toxic score: ${toxicScore.toFixed(4)} from model: ${primaryModel}`)

    // Use cascading confidence thresholds for XLM-RoBERTa
    const confidence = toxicScore >= CONFIDENCE_THRESHOLDS.XLM_ROBERTA ? 'high' :
                      toxicScore >= 0.5 ? 'medium' : 'low'

    return {
      score: toxicScore,
      confidence,
      model_used: primaryModel,
      processing_time_ms: Date.now() - startTime,
      fallback_used: false,
      cascade_level: 2,
      fallback_tier: 'secondary',
      flagged_words: toxicScore > 0.4 ? extractToxicWords(text) : []
    }

  } catch (error) {
    console.error(`[ML Enhanced] Primary model error (${settings.ml_primary_model || 'unitary/multilingual-toxic-xlm-roberta'}): ${error.message}`)

    // TIER 2: Try secondary fallback model (Toxic-BERT)
    if (settings.ml_fallback_model && settings.ml_fallback_model !== settings.ml_primary_model) {
      console.log(`[ML Enhanced] Attempting secondary fallback: ${settings.ml_fallback_model}`)

      try {
        const apiKey = Deno.env.get('HUGGINGFACE_API_KEY')
        if (!apiKey) {
          throw new Error('No Hugging Face API key available for fallback')
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), settings.ml_timeout_ms || ML_TIMEOUT_MS)

        const response = await fetch(`${HUGGINGFACE_API_URL}/${settings.ml_fallback_model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text,
            options: {
              wait_for_model: true,
              use_cache: false
            }
          }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Secondary fallback HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        console.log(`[ML Enhanced] Secondary fallback result:`, result)

        const toxicScore = Array.isArray(result) && result[0]?.length > 0
          ? result[0].find((item: any) => item.label === 'TOXIC')?.score || 0
          : 0

        console.log(`[ML Enhanced] Secondary fallback toxicity score: ${toxicScore}`)

        return {
          score: toxicScore,
          confidence: toxicScore > 0.7 ? 'high' : toxicScore > 0.4 ? 'medium' : 'low',
          model_used: settings.ml_fallback_model,
          processing_time_ms: Date.now() - startTime,
          fallback_used: true,
          fallback_tier: 'secondary',
          flagged_words: toxicScore > 0.4 ? extractToxicWords(text) : []
        }

      } catch (fallbackError) {
        console.error(`[ML Enhanced] Secondary fallback error (${settings.ml_fallback_model}): ${fallbackError.message}`)

        // TIER 3: Try tertiary fallback (Xenova/local processing)
        console.log(`[ML Enhanced] Attempting tertiary fallback: local processing`)

        try {
          const malayDetector = new MalayToxicityDetector()
          const malayResult = malayDetector.detectToxicity(text)

          console.log(`[ML Enhanced] Tertiary fallback (local) result: ${malayResult.toxicity_score}`)

          return {
            score: malayResult.toxicity_score,
            confidence: malayResult.confidence > 0.8 ? 'high' : 'medium',
            model_used: 'enhanced-malay-lexicon-local',
            processing_time_ms: Date.now() - startTime,
            fallback_used: true,
            fallback_tier: 'tertiary',
            flagged_words: malayResult.detected_words
          }

        } catch (tertiaryError) {
          console.error(`[ML Enhanced] Tertiary fallback error: ${tertiaryError.message}`)
          throw new Error(`All ML tiers failed: Primary(${error.message}), Secondary(${fallbackError.message}), Tertiary(${tertiaryError.message})`)
        }
      }
    } else {
      // No secondary fallback configured, go directly to tertiary
      console.log(`[ML Enhanced] No secondary fallback configured, attempting tertiary fallback: local processing`)

      try {
        const malayDetector = new MalayToxicityDetector()
        const malayResult = malayDetector.detectToxicity(text)

        console.log(`[ML Enhanced] Tertiary fallback (local) result: ${malayResult.toxicity_score}`)

        return {
          score: malayResult.toxicity_score,
          confidence: malayResult.confidence > 0.8 ? 'high' : 'medium',
          model_used: 'enhanced-malay-lexicon-local',
          processing_time_ms: Date.now() - startTime,
          fallback_used: true,
          fallback_tier: 'tertiary',
          flagged_words: malayResult.detected_words
        }

      } catch (tertiaryError) {
        console.error(`[ML Enhanced] Tertiary fallback error: ${tertiaryError.message}`)
        throw new Error(`Primary and tertiary ML tiers failed: Primary(${error.message}), Tertiary(${tertiaryError.message})`)
      }
    }
  }
}

async function detectToxicContentToxicBert(text: string, settings: ModerationSettings): Promise<MLResult> {
  // Use the enhanced ML function for better compatibility
  return await detectToxicContentML_Enhanced(text, settings)
}

/**
 * Rule-based toxic content detection (fallback when ML fails)
 */
async function detectToxicContentRuleBased(text: string, startTime: number, isFallback = false): Promise<MLResult> {
  console.log(`[ML] Using enhanced rule-based detection ${isFallback ? '(ML fallback)' : '(ML disabled)'}`)

  // Use enhanced Malay detector first
  const malayDetector = new MalayToxicityDetector()
  const malayResult = malayDetector.detectToxicity(text)

  // Use traditional detection for comparison
  const traditionalResult = await detectToxicContent(text)

  // Use the higher score to ensure proper detection
  const finalScore = Math.max(malayResult.toxicity_score, traditionalResult.score)
  const allFlaggedWords = [...malayResult.detected_words, ...traditionalResult.flagged]

  console.log(`[Enhanced Rule-Based] Malay score: ${malayResult.toxicity_score.toFixed(4)}, Traditional score: ${traditionalResult.score.toFixed(4)}, Final: ${finalScore.toFixed(4)}`)

  // Use cascading confidence thresholds for local detector
  const confidence = finalScore >= CONFIDENCE_THRESHOLDS.LOCAL_DETECTOR ? 'high' :
                    finalScore >= 0.6 ? 'medium' : 'low'

  return {
    score: finalScore,
    confidence,
    model_used: 'enhanced-rule-based-malay',
    processing_time_ms: Date.now() - startTime,
    fallback_used: isFallback,
    cascade_level: 3,
    fallback_tier: 'tertiary',
    flagged_words: [...new Set(allFlaggedWords)]
  }
}

/**
 * XLM-RoBERTa + Lexicon Confidence-Based Content Moderation - MAIN FUNCTION
 * Implements confidence-based fallback for optimal content moderation
 *
 * Key Features:
 * - Primary: XLM-RoBERTa for multilingual toxicity detection
 * - Fallback: Enhanced lexicon for Malaysian profanity when XLM confidence is low
 * - Confidence-based decision tree (medium+ confidence uses XLM, low confidence uses lexicon)
 * - Performance caching with 5-minute TTL
 * - Graceful degradation when XLM fails
 * - ~3.5 second total processing time
 */

interface ConfidenceResult extends MLResult {
  confidence_processing: true;
  primary_model: 'xlm-roberta' | 'lexicon';
  xlm_attempted: boolean;
  xlm_confidence?: 'high' | 'medium' | 'low';
  xlm_score?: number;
  lexicon_score?: number;
  fallback_reason?: 'low_confidence' | 'xlm_failed' | 'xlm_timeout';
  processing_breakdown: {
    xlm_time: number;
    lexicon_time: number;
    total_time: number;
  };
  cache_hit?: boolean;
  flagged_words: string[];
}

async function detectToxicContentML_Confidence(text: string, settings: ModerationSettings): Promise<ConfidenceResult> {
  const startTime = Date.now();

  // Performance Optimization: Check cache first
  const cachedResult = getCachedResult(text);
  if (cachedResult) {
    console.log('[Confidence] Cache HIT: Using cached result');
    return {
      ...cachedResult,
      processing_time_ms: Date.now() - startTime,
      cache_hit: true
    } as ConfidenceResult;
  }

  console.log('[Confidence] Starting confidence-based content moderation...');

  let xlmResult: MLResult | null = null;
  let xlmTime = 0;
  let lexiconTime = 0;
  let fallbackReason: 'low_confidence' | 'xlm_failed' | 'xlm_timeout' | undefined;

  // STEP 1: Try XLM-RoBERTa first
  console.log('[Confidence] Attempting XLM-RoBERTa primary detection...');
  const xlmStartTime = Date.now();

  try {
    xlmResult = await Promise.race([
      detectToxicContentML_Enhanced(text, settings),
      new Promise<MLResult>((_, reject) =>
        setTimeout(() => reject(new Error('XLM-RoBERTa timeout after 4 seconds')), 4000)
      )
    ]);
    xlmTime = Date.now() - xlmStartTime;

    console.log(`[Confidence] XLM-RoBERTa result: score=${xlmResult.score.toFixed(4)}, confidence=${xlmResult.confidence}, time=${xlmTime}ms`);

    // STEP 2: Check XLM confidence level
    if (xlmResult.confidence === 'high' || xlmResult.confidence === 'medium') {
      console.log(`[Confidence] XLM confidence is ${xlmResult.confidence} - using XLM result`);

      const result: ConfidenceResult = {
        score: xlmResult.score,
        confidence: xlmResult.confidence,
        model_used: 'xlm-roberta-confidence-primary',
        processing_time_ms: Date.now() - startTime,
        confidence_processing: true,
        primary_model: 'xlm-roberta',
        xlm_attempted: true,
        xlm_confidence: xlmResult.confidence,
        xlm_score: xlmResult.score,
        processing_breakdown: {
          xlm_time: xlmTime,
          lexicon_time: 0,
          total_time: Date.now() - startTime
        },
        cache_hit: false,
        flagged_words: xlmResult.flagged_words || []
      };

      // Cache the result for future requests
      setCachedResult(text, result);
      return result;
    } else {
      // XLM confidence is low
      console.log(`[Confidence] XLM confidence is ${xlmResult.confidence} - falling back to lexicon`);
      fallbackReason = 'low_confidence';
    }

  } catch (error) {
    xlmTime = Date.now() - xlmStartTime;
    console.error(`[Confidence] XLM-RoBERTa failed: ${error.message}`);

    if (error.message.includes('timeout')) {
      fallbackReason = 'xlm_timeout';
    } else {
      fallbackReason = 'xlm_failed';
    }
  }

  // STEP 3: Fallback to Lexicon
  console.log(`[Confidence] Using lexicon fallback (reason: ${fallbackReason})`);
  const lexiconStartTime = Date.now();

  try {
    const lexiconResult = await detectToxicContentRuleBased(text, lexiconStartTime, true);
    lexiconTime = Date.now() - lexiconStartTime;

    console.log(`[Confidence] Lexicon result: score=${lexiconResult.score.toFixed(4)}, time=${lexiconTime}ms`);

    const result: ConfidenceResult = {
      score: lexiconResult.score,
      confidence: lexiconResult.confidence,
      model_used: 'lexicon-confidence-fallback',
      processing_time_ms: Date.now() - startTime,
      confidence_processing: true,
      primary_model: 'lexicon',
      xlm_attempted: true,
      xlm_confidence: xlmResult?.confidence,
      xlm_score: xlmResult?.score,
      lexicon_score: lexiconResult.score,
      fallback_reason: fallbackReason,
      processing_breakdown: {
        xlm_time: xlmTime,
        lexicon_time: lexiconTime,
        total_time: Date.now() - startTime
      },
      cache_hit: false,
      flagged_words: lexiconResult.flagged_words || []
    };

    // Cache the result for future requests
    setCachedResult(text, result);

    console.log(`[Confidence] Processing complete in ${result.processing_time_ms}ms (XLM: ${xlmTime}ms, Lexicon: ${lexiconTime}ms)`);
    console.log(`[Confidence] Used ${result.primary_model} as primary model (fallback reason: ${fallbackReason || 'none'})`);

    return result;

  } catch (error) {
    console.error(`[Confidence] Critical error - both XLM and lexicon failed: ${error.message}`);

    // Last resort fallback
    return {
      score: 0.5, // Conservative moderate score when everything fails
      confidence: 'low',
      model_used: 'emergency-fallback',
      processing_time_ms: Date.now() - startTime,
      confidence_processing: true,
      primary_model: 'lexicon',
      xlm_attempted: true,
      fallback_reason: 'xlm_failed',
      processing_breakdown: {
        xlm_time: xlmTime,
        lexicon_time: lexiconTime,
        total_time: Date.now() - startTime
      },
      cache_hit: false,
      flagged_words: []
    };
  }
}

/**
 * Helper Functions for Confidence-Based Processing
 */

function detectLanguage(text: string): 'malay' | 'english' | 'mixed' {
  const malayWords = [
    'adalah', 'dengan', 'untuk', 'yang', 'ini', 'itu', 'dan', 'atau', 'tidak', 'ada',
    'saya', 'kamu', 'dia', 'kami', 'mereka', 'akan', 'sudah', 'sedang', 'boleh',
    'main', 'permainan', 'sukan', 'bola', 'badminton', 'futsal', 'basketball',
    'nak', 'tak', 'dah', 'lah', 'jer', 'pun', 'gak', 'gila', 'bodoh', 'sial'
  ];

  const words = text.toLowerCase().split(/\s+/);
  const malayWordCount = words.filter(word => malayWords.includes(word)).length;
  const malayRatio = malayWordCount / words.length;

  if (malayRatio >= 0.3) return 'malay';
  if (malayRatio > 0.1) return 'mixed';
  return 'english';
}

/**
 * Extract potentially toxic words from text for detailed reporting
 */
function extractToxicWords(text: string): string[] {
  const toxicPatterns = [
    /\b(fuck|shit|damn|hell|ass|bitch|bastard|crap)\b/gi,
    /\b(puki|pantat|bodoh|bangsat|sial|celaka|keparat)\b/gi,
    /\b(hate|stupid|idiot|loser|pathetic)\b/gi,
    /\b(kill|murder|destroy|die|death)\b/gi
  ]

  const flagged: string[] = []

  for (const pattern of toxicPatterns) {
    const matches = text.match(pattern)
    if (matches) {
      flagged.push(...matches.map(m => m.toLowerCase()))
    }
  }

  return [...new Set(flagged)]
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
  'basikal': 0.8, 'ragbi': 0.8, 'hoki': 0.8,

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
  'stadium': 0.8, 'gym': 0.6, 'gimnasium': 0.6,

  // Skill Levels (Lower Weight)
  'beginner': 0.4, 'pemula': 0.4, 'intermediate': 0.4, 'pertengahan': 0.4,
  'advanced': 0.4, 'lanjutan': 0.4, 'professional': 0.5, 'profesional': 0.5
}

/**
 * Enhanced toxic content detection with Malay language support
 * Includes sports context awareness to prevent false positives
 * EDUCATIONAL ENVIRONMENT: Stricter scoring for university setting
 */
async function detectToxicContent(text: string): Promise<{ score: number, flagged: string[] }> {
  const toxicPatterns = [
    // English explicit profanity (VERY HIGH severity - educational environment)
    /\b(fuck|fucking|shit|damn|hell|bitch|asshole|bastard|cunt)\b/gi,

    // Malay explicit profanity (VERY HIGH severity - educational environment)
    /\b(puki|pukimak|pantat|bodoh|bangsat|sial|celaka|keparat|babi|kontol|anjing)\b/gi,

    // English hate speech (HIGH severity - educational environment)
    /\b(hate|stupid|idiot|loser|suck|terrible|awful|worst|pathetic)\b/gi,

    // Malay hate speech (HIGH severity - educational environment)
    /\b(benci|tolol|gila|teruk|busuk|sampah|hina|jir|anak)\b/gi,

    // Threatening language - English (VERY HIGH severity)
    /\b(kill|murder|destroy|hurt|harm|attack|die|death)\b/gi,

    // Threatening language - Malay (VERY HIGH severity)
    /\b(bunuh|mati|hancur|sakiti|serang|mampus)\b/gi,

    // Discriminatory language (HIGH severity - educational environment)
    /\b(retard|disabled|handicapped|freak|weirdo)\b/gi,

    // Sexual content - English (VERY HIGH severity - educational environment)
    /\b(sex|porn|nude|naked|breast|penis|vagina|dick|pussy|cock|tits|ass|boobs)\b/gi,

    // Sexual content - Malay (VERY HIGH severity - educational environment)
    /\b(tetek|pepek|memek|telanjang|bogel|seks)\b/gi,

    // Drug references - English (VERY HIGH severity - educational environment)
    /\b(drug|cocaine|heroin|marijuana|weed|ganja|ecstasy|meth|cannabis|dope|pot|hash)\b/gi,

    // Drug references - Malay (VERY HIGH severity - educational environment)
    /\b(dadah|ganja|syabu|pil|ekstasi|ubat|hisap|isap|rokok)\b/gi,

    // Discriminatory language - Malay (VERY HIGH severity - educational environment)
    /\b(bangsa|kaum|racist|perkauman|diskriminasi|benci|rasis)\b/gi,

    // Religious inappropriate - Malay (HIGH severity - educational environment)
    /\b(setan|syaitan|kafir|munafik|dosa|neraka|terkutuk)\b/gi
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
        // EDUCATIONAL ENVIRONMENT: Stricter severity scoring
        let severity = 0.2 // Default severity

        // VERY HIGH severity (0.5 each) - explicit profanity, sexual, drugs, threats
        if (pattern.source.includes('fuck|fucking|shit|puki|pukimak|babi|kontol|anjing|sex|porn|drug|kill|murder|bunuh|mati')) {
          severity = 0.5
        }
        // HIGH severity (0.35 each) - hate speech, discrimination
        else if (pattern.source.includes('hate|stupid|idiot|benci|tolol|racist|perkauman|retard|jir|anak')) {
          severity = 0.35
        }
        // MEDIUM severity (0.25 each) - mild inappropriate language
        else if (pattern.source.includes('terrible|awful|worst|pathetic|teruk|busuk')) {
          severity = 0.25
        }

        score += validMatches.length * severity
        flagged.push(...validMatches.map(m => m.toLowerCase()))
      }
    }
  }

  // EDUCATIONAL ENVIRONMENT: Multiple profanity escalation
  const explicitWords = flagged.filter(word =>
    ['fuck', 'fucking', 'shit', 'puki', 'pukimak', 'babi', 'kontol', 'anjing', 'jir', 'anak', 'bitch', 'asshole', 'bastard', 'cunt'].includes(word)
  )

  // Escalate score for multiple explicit profanity (educational environment)
  if (explicitWords.length >= 2) {
    score += 0.3 // Significant boost for multiple explicit words
    console.log(`[Toxicity] Multiple explicit profanity detected (${explicitWords.length} words), boosting score by 0.3`)
  }

  // Normalize score to 0-1 range
  score = Math.min(score, 1.0)

  console.log(`[Toxicity] Final toxic score: ${score.toFixed(4)}, flagged words: [${flagged.join(', ')}]`)
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
 * Configuration-driven risk level calculation
 * Supports both simplified mode (100% toxic) and legacy multi-component mode
 * Reads weights from database settings for dynamic configuration
 */
function calculateRiskLevelConfigurable(
  toxicScore: number,
  sportsScore: number,
  settings: ModerationSettings
): { riskLevel: 'minimal' | 'low' | 'medium' | 'high', overallScore: number } {

  let overallScore: number

  // Simplified mode: 100% toxic content focus (user preference)
  if (settings.simplified_mode) {
    console.log(`[Risk Calculation] Using simplified mode (100% toxic focus)`)
    overallScore = toxicScore * 1.0
  } else {
    // Legacy mode: configurable weights from database
    const toxicWeight = settings.toxic_model_weight || 1.0
    const sportsWeight = settings.sports_validation_weight || 0.0
    const consistencyWeight = settings.consistency_model_weight || 0.0

    console.log(`[Risk Calculation] Using configurable weights - Toxic: ${toxicWeight}, Sports: ${sportsWeight}, Consistency: ${consistencyWeight}`)

    overallScore = (
      (toxicScore * toxicWeight) +
      ((1 - sportsScore) * sportsWeight) +
      (0 * consistencyWeight) // Consistency removed in v3.0
    )
  }

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
    console.log(`[Risk Calculation] Applying strict mode adjustments`)
    if (riskLevel === 'minimal') riskLevel = 'low'
    if (riskLevel === 'low') riskLevel = 'medium'
  }

  console.log(`[Risk Calculation] Final score: ${overallScore.toFixed(4)}, Risk level: ${riskLevel}`)
  return { riskLevel, overallScore }
}

/**
 * Legacy risk calculation function (deprecated)
 * Kept for backward compatibility
 */
function calculateRiskLevel(
  inappropriateScore: number,
  sportsScore: number,
  settings: ModerationSettings
): { riskLevel: 'minimal' | 'low' | 'medium' | 'high', overallScore: number } {
  console.warn('[DEPRECATED] Using legacy calculateRiskLevel, consider using calculateRiskLevelConfigurable')
  return calculateRiskLevelConfigurable(inappropriateScore, sportsScore, settings)
}

/**
 * Main content moderation function with ML integration
 * Implements toxic-only focus (100% weight) as per user preference
 */
async function moderateContent(
  matchData: MatchData,
  settings: ModerationSettings
): Promise<ModerationResult> {
  const startTime = Date.now()

  console.log(`[Moderation v3.0] Processing match: ${matchData.id}`)
  console.log(`[Moderation] Title: "${matchData.title}"`)
  console.log(`[Moderation] Description: "${matchData.description?.substring(0, 100)}..."`)
  console.log(`[Moderation] ML Enabled: ${settings.ml_enabled}`)
  console.log(`[Moderation] Simplified Mode: ${settings.simplified_mode}`)

  const fullText = `${matchData.title} ${matchData.description || ''}`

  // Use confidence-based ML-powered toxic detection as primary method
  const mlToxicResult = await detectToxicContentML_Confidence(fullText, settings)

  console.log(`[Moderation] Confidence Processing: ${mlToxicResult.confidence_processing}`)
  console.log(`[Moderation] ML Toxic score: ${mlToxicResult.score.toFixed(4)}`)
  console.log(`[Moderation] Primary model used: ${mlToxicResult.primary_model}`)
  console.log(`[Moderation] XLM attempted: ${mlToxicResult.xlm_attempted}`)
  if (mlToxicResult.xlm_confidence) {
    console.log(`[Moderation] XLM confidence: ${mlToxicResult.xlm_confidence}`)
  }
  if (mlToxicResult.fallback_reason) {
    console.log(`[Moderation] Fallback reason: ${mlToxicResult.fallback_reason}`)
  }
  console.log(`[Moderation] Processing time: ${mlToxicResult.processing_time_ms}ms (XLM: ${mlToxicResult.processing_breakdown.xlm_time}ms, Lexicon: ${mlToxicResult.processing_breakdown.lexicon_time}ms)`)
  console.log(`[Moderation] Total API calls: ${mlToxicResult.total_api_calls}`)
  console.log(`[Moderation] ML Processing time: ${mlToxicResult.processing_time_ms}ms`)
  if (mlToxicResult.fallback_reason) {
    console.log(`[Moderation] Fallback reason: ${mlToxicResult.fallback_reason}`)
  }

  // Sports validation (optional based on configuration)
  let sportsScore = 0
  if (settings.sports_validation_weight > 0 && !settings.simplified_mode) {
    sportsScore = await validateSportsContent(matchData.title, matchData.description || '')
    console.log(`[Moderation] Sports score: ${sportsScore} (${settings.sports_validation_weight * 100}% weight)`)
  } else {
    console.log(`[Moderation] Sports validation disabled (simplified mode: ${settings.simplified_mode})`)
  }

  // Calculate overall risk using configuration-driven weights
  const { riskLevel, overallScore } = calculateRiskLevelConfigurable(
    mlToxicResult.score,
    sportsScore,
    settings
  )

  console.log(`[Moderation] Overall risk: ${riskLevel} (${overallScore.toFixed(4)})`)
  console.log(`[Moderation] Weights - Toxic: ${settings.toxic_model_weight}, Sports: ${settings.sports_validation_weight}`)

  // Determine automatic actions based on documented risk-based workflow
  const autoApproved = riskLevel === 'minimal' && settings.auto_approve_minimal_risk
  const requiresReview = riskLevel === 'medium' || riskLevel === 'high'

  // Risk-based workflow implementation:
  // - MINIMAL (0-20%): Auto-approve, no admin review
  // - LOW (20-50%): Auto-approve but monitor
  // - MEDIUM (50-80%): Visible while under admin review
  // - HIGH (80%+): Hidden from public, admin review required

  const processingTime = Date.now() - startTime
  
  return {
    inappropriate_score: Number(mlToxicResult.score.toFixed(4)),
    consistency_score: null, // Removed in v3.0 (toxic-only focus)
    sports_validation_score: Number(sportsScore.toFixed(4)),
    overall_risk_level: riskLevel,
    auto_approved: autoApproved,
    requires_review: requiresReview,
    flagged_content: {
      toxic_words: mlToxicResult.flagged_words,
      model_used: mlToxicResult.model_used,
      fallback_used: mlToxicResult.fallback_used,
      // Cascade-specific information
      cascade_level: mlToxicResult.cascade_level,
      success_tier: mlToxicResult.success_tier,
      primary_model_used: mlToxicResult.primary_model_used,
      secondary_model_used: mlToxicResult.secondary_model_used,
      tertiary_model_used: mlToxicResult.tertiary_model_used,
      total_api_calls: mlToxicResult.total_api_calls,
      fallback_reason: mlToxicResult.fallback_reason,
      processing_breakdown: mlToxicResult.processing_breakdown,
      risk_factors: {
        high_toxicity: mlToxicResult.score > (settings.ml_confidence_threshold || 0.7),
        medium_toxicity: mlToxicResult.score > 0.4 && mlToxicResult.score <= (settings.ml_confidence_threshold || 0.7),
        non_sports_content: sportsScore < 0.2,
        ml_processing_failed: mlToxicResult.fallback_used,
        malay_content_detected: /\b(sukan|latihan|permainan|bola|larian)\b/i.test(`${matchData.title} ${matchData.description || ''}`)
      }
    },
    model_confidence: {
      toxic_detection: mlToxicResult.confidence,
      ml_model_used: mlToxicResult.model_used,
      ml_processing_time: mlToxicResult.processing_time_ms,
      sports_validation: sportsScore > 0.7 ? 'high' : 'medium',
      system_version: '3.0-confidence-based-fallback',
      // Confidence-based metadata
      confidence_processing: mlToxicResult.confidence_processing,
      primary_model: mlToxicResult.primary_model,
      xlm_attempted: mlToxicResult.xlm_attempted,
      xlm_confidence: mlToxicResult.xlm_confidence,
      xlm_score: mlToxicResult.xlm_score,
      lexicon_score: mlToxicResult.lexicon_score,
      fallback_reason: mlToxicResult.fallback_reason,
      processing_breakdown: mlToxicResult.processing_breakdown,
      configuration_mode: settings.simplified_mode ? 'toxic-only' : 'multi-component',
      // Cascade-specific confidence metrics
      cascade_level: mlToxicResult.cascade_level,
      success_tier: mlToxicResult.success_tier,
      tier_confidence: {
        primary: mlToxicResult.cascade_level >= 1 ? 'attempted' : 'skipped',
        secondary: mlToxicResult.cascade_level >= 2 ? 'attempted' : 'skipped',
        tertiary: mlToxicResult.cascade_level >= 3 ? 'used' : 'not_needed'
      }
    },
    processing_time_ms: processingTime
  }
}

/**
 * Get adaptive thresholds for a specific context
 */
async function getAdaptiveThresholds(context: LearningContext, supabaseClient: any): Promise<AdaptiveThresholds> {
  try {
    console.log('[Adaptive] Getting thresholds for context:', context);

    // Find best matching context
    const contextMatch = await findBestContextMatch(context, supabaseClient);

    if (contextMatch) {
      return {
        high_risk: contextMatch.high_risk_threshold,
        medium_risk: contextMatch.medium_risk_threshold,
        low_risk: contextMatch.low_risk_threshold,
        context_id: contextMatch.id,
        learning_enabled: contextMatch.learning_enabled
      };
    }

    // Fallback to static thresholds
    const { data: settings } = await supabaseClient
      .from('content_moderation_settings')
      .select('high_risk_threshold, medium_risk_threshold, low_risk_threshold')
      .single();

    return {
      high_risk: settings?.high_risk_threshold || 0.8,
      medium_risk: settings?.medium_risk_threshold || 0.5,
      low_risk: settings?.low_risk_threshold || 0.2,
      context_id: null,
      learning_enabled: false
    };
  } catch (error) {
    console.error('[Adaptive] Error getting thresholds:', error);
    // Safety fallback
    return {
      high_risk: 0.8,
      medium_risk: 0.5,
      low_risk: 0.2,
      context_id: null,
      learning_enabled: false
    };
  }
}

/**
 * Find the best matching context for given parameters
 */
async function findBestContextMatch(context: LearningContext, supabaseClient: any) {
  const { sport_id, user_id, content_length, language_mix } = context;

  // Priority: sport > user reputation > language > time
  const contextQueries = [
    { type: 'sport_category', identifier: sport_id },
    { type: 'user_reputation', identifier: await getUserReputationLevel(user_id, supabaseClient) },
    { type: 'language_mix', identifier: language_mix || detectLanguageMix(context.title, context.description) },
    { type: 'time_period', identifier: getCurrentTimePeriod() }
  ];

  for (const query of contextQueries) {
    if (query.identifier) {
      const { data } = await supabaseClient
        .from('threshold_contexts')
        .select('*')
        .eq('context_type', query.type)
        .eq('context_identifier', query.identifier)
        .eq('learning_enabled', true)
        .single();

      if (data) return data;
    }
  }

  return null;
}

/**
 * Get user reputation level for context matching
 */
async function getUserReputationLevel(userId: string, supabaseClient: any): Promise<string> {
  try {
    const { count } = await supabaseClient
      .from('matches')
      .select('*', { count: 'exact' })
      .eq('host_id', userId)
      .eq('status', 'completed');

    if (count >= 10) return 'experienced_user';
    if (count >= 5) return 'regular_user';
    return 'new_user';
  } catch {
    return 'new_user';
  }
}

/**
 * Detect language mix in content
 */
function detectLanguageMix(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  const malayWords = /\b(sukan|latihan|permainan|bola|larian|badminton|futsal|sepak|takraw)\b/g;
  const malayMatches = (text.match(malayWords) || []).length;
  const totalWords = text.split(/\s+/).length;

  if (malayMatches / totalWords > 0.3) return 'malay_primary';
  if (malayMatches > 0) return 'mixed_language';
  return 'english_primary';
}

/**
 * Get current time period for context
 */
function getCurrentTimePeriod(): string {
  const hour = new Date().getHours();
  if (hour >= 19 && hour <= 22) return 'peak_hours';
  if (hour >= 7 && hour <= 18) return 'day_hours';
  return 'off_hours';
}

/**
 * Calculate risk level using adaptive thresholds
 */
function calculateRiskLevelAdaptive(
  toxicScore: number,
  sportsScore: number,
  adaptiveThresholds: AdaptiveThresholds,
  settings: ModerationSettings
): { riskLevel: string; overallScore: number } {

  let overallScore: number;

  if (settings.simplified_mode) {
    overallScore = toxicScore * 1.0;
  } else {
    const toxicWeight = settings.toxic_model_weight || 1.0;
    const sportsWeight = settings.sports_validation_weight || 0.0;

    overallScore = (
      (toxicScore * toxicWeight) +
      ((1 - sportsScore) * sportsWeight)
    );
  }

  // Use adaptive thresholds instead of static ones
  const highThreshold = adaptiveThresholds.high_risk;
  const mediumThreshold = adaptiveThresholds.medium_risk;
  const lowThreshold = adaptiveThresholds.low_risk;

  console.log(`[Adaptive Risk] Score: ${overallScore.toFixed(4)}, Thresholds: H:${highThreshold} M:${mediumThreshold} L:${lowThreshold}`);

  let riskLevel: string;
  if (overallScore >= highThreshold) {
    riskLevel = 'high';
  } else if (overallScore >= mediumThreshold) {
    riskLevel = 'medium';
  } else if (overallScore >= lowThreshold) {
    riskLevel = 'low';
  } else {
    riskLevel = 'minimal';
  }

  return { riskLevel, overallScore };
}

/**
 * Enhanced moderation function with adaptive threshold support
 */
async function moderateContentAdaptive(
  matchData: MatchData,
  settings: ModerationSettings,
  adaptiveThresholds: AdaptiveThresholds,
  supabaseClient: any
): Promise<ModerationResult> {
  const startTime = Date.now()

  console.log(`[Adaptive Moderation] Processing match: ${matchData.id}`)
  console.log(`[Adaptive Moderation] Using adaptive thresholds:`, adaptiveThresholds)

  // Existing ML processing with confidence-based approach...
  const mlToxicResult = await detectToxicContentML_Confidence(
    `${matchData.title} ${matchData.description || ''}`,
    settings
  );

  let sportsScore = 0;
  if (settings.sports_validation_weight > 0 && !settings.simplified_mode) {
    sportsScore = await validateSportsContent(matchData.title, matchData.description || '');
  }

  // Use adaptive risk calculation
  const { riskLevel, overallScore } = calculateRiskLevelAdaptive(
    mlToxicResult.score,
    sportsScore,
    adaptiveThresholds,
    settings
  );

  // Determine actions based on documented risk-based workflow
  const hasToxicWords = mlToxicResult.flagged_words && mlToxicResult.flagged_words.length > 0;

  // Risk-based workflow implementation:
  // - MINIMAL (0-20%): Auto-approve, no admin review
  // - LOW (20-50%): Auto-approve but monitor
  // - MEDIUM (50-80%): Visible while under admin review
  // - HIGH (80%+): Hidden from public, admin review required
  const requiresReview = riskLevel === 'medium' || riskLevel === 'high' || hasToxicWords;
  const autoApproved = riskLevel === 'minimal' && settings.auto_approve_minimal_risk && !hasToxicWords;

  const processingTime = Date.now() - startTime;

  // Store moderation result with adaptive metadata
  const result: ModerationResult = {
    inappropriate_score: Number(mlToxicResult.score.toFixed(4)),
    consistency_score: null,
    sports_validation_score: Number(sportsScore.toFixed(4)),
    overall_risk_level: riskLevel as 'minimal' | 'low' | 'medium' | 'high',
    auto_approved: autoApproved,
    requires_review: requiresReview,
    flagged_content: {
      toxic_words: mlToxicResult.flagged_words,
      model_used: mlToxicResult.model_used,
      fallback_used: mlToxicResult.fallback_used,
      adaptive_thresholds_used: adaptiveThresholds,
      context_id: adaptiveThresholds.context_id,
      learning_enabled: adaptiveThresholds.learning_enabled
    },
    model_confidence: {
      toxic_detection: mlToxicResult.confidence,
      ml_model_used: mlToxicResult.model_used,
      adaptive_context: adaptiveThresholds.context_id,
      learning_enabled: adaptiveThresholds.learning_enabled,
      system_version: '3.0-confidence-adaptive-learning',
      // Confidence-based metadata
      confidence_processing: mlToxicResult.confidence_processing,
      primary_model: mlToxicResult.primary_model,
      xlm_attempted: mlToxicResult.xlm_attempted,
      xlm_confidence: mlToxicResult.xlm_confidence,
      xlm_score: mlToxicResult.xlm_score,
      lexicon_score: mlToxicResult.lexicon_score,
      fallback_reason: mlToxicResult.fallback_reason,
      processing_breakdown: mlToxicResult.processing_breakdown
    },
    processing_time_ms: processingTime
  };

  // Store additional adaptive learning metadata if needed
  if (adaptiveThresholds.context_id) {
    await supabaseClient
      .from('content_moderation_results')
      .update({
        threshold_context_used: adaptiveThresholds.context_id,
        adaptive_thresholds_applied: adaptiveThresholds,
        learning_metadata: {
          context_type: 'adaptive',
          learning_enabled: adaptiveThresholds.learning_enabled,
          thresholds_used: adaptiveThresholds
        }
      })
      .eq('match_id', matchData.id);
  }

  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
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

    // Fetch ML-enhanced moderation settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('content_moderation_settings')
      .select(`
        *,
        ml_enabled,
        ml_confidence_threshold,
        ml_timeout_ms,
        ml_primary_model,
        ml_fallback_model,
        simplified_mode
      `)
      .limit(1)
      .single()

    if (settingsError || !settings) {
      console.error('[Settings] Error fetching moderation settings:', settingsError)
      // Use default settings if database fetch fails
      console.log('[Settings] Using default ML-enabled settings as fallback')
      const defaultSettings: ModerationSettings = {
        high_risk_threshold: 0.4,  // Lowered for educational environment
        medium_risk_threshold: 0.25, // Lowered for educational environment
        low_risk_threshold: 0.1,   // Lowered for educational environment
        auto_reject_high_risk: true,
        auto_approve_minimal_risk: true,
        toxic_model_weight: 1.0,
        consistency_model_weight: 0.0,
        sports_validation_weight: 0.0,
        moderation_enabled: true,
        strict_mode: true,  // Enable strict mode for educational environment
        ml_enabled: true,
        ml_confidence_threshold: 0.5, // Confidence threshold for XLM-RoBERTa acceptance
        ml_timeout_ms: 4000, // XLM-RoBERTa timeout (matches confidence-based implementation)
        ml_primary_model: 'unitary/multilingual-toxic-xlm-roberta',
        ml_fallback_model: 'enhanced-lexicon', // Lexicon-based fallback (not toxic-bert)
        ml_tertiary_model: 'local-processing', // Emergency fallback
        simplified_mode: true
      }

      const moderationResult = await moderateContent(matchData, defaultSettings)

      // Store results even with default settings
      await supabase
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

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Content moderation completed with default ML settings',
          data: moderationResult,
          warning: 'Used default settings due to database error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Settings] Loaded ML configuration:', {
      ml_enabled: settings.ml_enabled,
      simplified_mode: settings.simplified_mode,
      toxic_weight: settings.toxic_model_weight,
      sports_weight: settings.sports_validation_weight,
      ml_primary_model: settings.ml_primary_model || 'unitary/multilingual-toxic-xlm-roberta'
    })

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

    // Build context for adaptive thresholds
    const context: LearningContext = {
      sport_id: matchData.sport_id,
      user_id: matchData.host_id,
      title: matchData.title,
      description: matchData.description || '',
      content_length: (matchData.title + ' ' + (matchData.description || '')).length,
      language_mix: detectLanguageMix(matchData.title, matchData.description || ''),
      time_period: getCurrentTimePeriod()
    };

    // Get adaptive thresholds
    const adaptiveThresholds = await getAdaptiveThresholds(context, supabase);

    // Perform content moderation with adaptive thresholds
    const moderationResult = await moderateContentAdaptive(matchData, settings, adaptiveThresholds, supabase)

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

    // Handle risk-based workflow according to documentation
    if (moderationResult.overall_risk_level === 'high') {
      // HIGH RISK (80%+): Hide from public, send detailed notification
      await supabase
        .from('matches')
        .update({
          status: 'cancelled',
          moderation_status: 'rejected',
          rejection_reason: 'High-risk content detected: Inappropriate language or toxic behavior'
        })
        .eq('id', matchId)

      // Send detailed notification to user explaining violation
      await supabase
        .from('notifications')
        .insert({
          user_id: matchData.host_id,
          type: 'content_violation',
          title: 'Match Content Violation - High Risk',
          content: `Your match "${matchData.title}" has been automatically hidden due to high-risk content (${(moderationResult.inappropriate_score * 100).toFixed(1)}% toxicity detected). Please review our community guidelines and create a new match with appropriate content.`,
          is_read: false
        })

      console.log(`[Moderation] High-risk match ${matchId} automatically hidden from public`)

    } else if (moderationResult.overall_risk_level === 'medium') {
      // MEDIUM RISK (50-80%): Keep visible while under admin review
      await supabase
        .from('matches')
        .update({
          moderation_status: 'pending_review',
          review_reason: 'Medium-risk content requires admin review'
        })
        .eq('id', matchId)

      console.log(`[Moderation] Medium-risk match ${matchId} kept visible pending admin review`)

    } else if (moderationResult.overall_risk_level === 'low') {
      // LOW RISK (20-50%): Auto-approve but monitor
      await supabase
        .from('matches')
        .update({
          moderation_status: 'auto_approved_monitored'
        })
        .eq('id', matchId)

      console.log(`[Moderation] Low-risk match ${matchId} auto-approved with monitoring`)

    } else {
      // MINIMAL RISK (0-20%): Auto-approve, no intervention
      await supabase
        .from('matches')
        .update({
          moderation_status: 'auto_approved'
        })
        .eq('id', matchId)

      console.log(`[Moderation] Minimal-risk match ${matchId} auto-approved`)
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
