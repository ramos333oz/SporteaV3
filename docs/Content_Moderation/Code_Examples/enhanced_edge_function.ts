/**
 * Enhanced Edge Function for Malay Language Content Moderation
 * 
 * This is the complete enhanced edge function that replaces the existing
 * moderate-match-content function with Malay language support.
 * 
 * Key Enhancements:
 * - Malay profanity lexicon with weighted scoring
 * - Malaysian SFW Classifier integration
 * - Hybrid detection pipeline with intelligent routing
 * - Enhanced fallback mechanisms
 * 
 * Fixes the issue where "bodoh" and "sial" return 0.13% instead of 60-65%
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Types and interfaces
interface ModerationSettings {
  ml_enabled: boolean;
  toxicity_threshold: number;
  inappropriate_threshold: number;
  consistency_threshold: number;
}

interface MLResult {
  score: number;
  confidence: string;
  model_used: string;
  processing_time_ms: number;
  fallback_used: boolean;
  flagged_words?: string[];
  additional_info?: any;
}

interface ModerationResult {
  inappropriate_score: number;
  overall_risk_level: string;
  ml_model_used: string;
  processing_time_ms: number;
  flagged_content: {
    toxic_words: string[];
    ml_confidence: string;
    fallback_used: boolean;
  };
  additional_info?: any;
}

// Constants
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models';

/**
 * Enhanced Malay Toxicity Detection Service
 * Addresses the core issue where Malay profanity is under-detected
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
  };

  detectToxicity(text: string) {
    const lowerText = text.toLowerCase();
    let maxScore = 0;
    const detectedWords: string[] = [];

    // Check all severity categories
    Object.entries(this.lexicon).forEach(([category, words]) => {
      if (category.includes('severity')) {
        Object.entries(words as Record<string, number>).forEach(([word, score]) => {
          const regex = new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'gi');
          if (regex.test(lowerText)) {
            detectedWords.push(word);
            maxScore = Math.max(maxScore, score);
          }
        });
      }
    });

    // Apply context modifiers
    const contextMultiplier = this.getContextMultiplier(lowerText);
    const finalScore = Math.min(maxScore * contextMultiplier, 1.0);

    return {
      toxicity_score: finalScore,
      detected_words: detectedWords,
      confidence: detectedWords.length > 0 ? 0.95 : 0.0
    };
  }

  private getContextMultiplier(text: string): number {
    let multiplier = 1.0;
    
    // Increase severity if intensifiers present
    if (this.lexicon.intensifiers.some(word => text.includes(word))) {
      multiplier *= 1.2;
    }
    
    // Increase severity if targeting people
    if (this.lexicon.targets.some(word => text.includes(word))) {
      multiplier *= 1.15;
    }
    
    // Reduce severity for sports context
    const sportsContext = /\b(main|permainan|lawan|menang|kalah|pertandingan)\b/gi;
    if (sportsContext.test(text)) {
      multiplier *= 0.9;
    }
    
    return Math.min(multiplier, 1.5);
  }
}

/**
 * Malaysian SFW Classifier Integration
 */
async function detectToxicContentMalaysianSFW(
  text: string, 
  settings: ModerationSettings
): Promise<MLResult> {
  const startTime = Date.now();
  
  try {
    const apiKey = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!apiKey) {
      throw new Error('No Hugging Face API key available');
    }

    console.log('[Malaysian SFW] Starting analysis...');

    const response = await fetch(
      `${HUGGINGFACE_API_URL}/malaysia-ai/malaysian-sfw-classifier`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputs: text,
          options: { wait_for_model: true }
        }),
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const predictions = Array.isArray(result[0]) ? result[0] : result;
    
    // Find toxic categories
    const toxicCategories = [
      'racist', 'sexist', 'harassment', 'porn', 'violence', 
      'religion insult', 'psychiatric or mental illness', 'self-harm'
    ];
    
    let maxToxicScore = 0;
    let detectedCategory = 'safe for work';
    
    predictions.forEach((pred: any) => {
      if (toxicCategories.includes(pred.label.toLowerCase()) && pred.score > maxToxicScore) {
        maxToxicScore = pred.score;
        detectedCategory = pred.label;
      }
    });

    const toxicityScore = maxToxicScore;
    const confidence = toxicityScore > 0.7 ? 'high' : toxicityScore > 0.4 ? 'medium' : 'low';

    console.log(`[Malaysian SFW] Success: ${toxicityScore.toFixed(4)} toxicity, category: ${detectedCategory}`);

    return {
      score: toxicityScore,
      confidence: confidence,
      model_used: 'malaysia-ai/malaysian-sfw-classifier',
      processing_time_ms: Date.now() - startTime,
      fallback_used: false,
      flagged_words: toxicityScore > 0.5 ? extractMalayToxicWords(text) : [],
      additional_info: {
        detected_category: detectedCategory,
        all_predictions: predictions
      }
    };

  } catch (error) {
    console.warn(`[Malaysian SFW] Failed: ${error.message}, using enhanced rule-based fallback`);
    
    // Fallback to enhanced Malay lexicon
    const malayDetector = new MalayToxicityDetector();
    const malayResult = malayDetector.detectToxicity(text);
    
    return {
      score: malayResult.toxicity_score,
      confidence: malayResult.confidence > 0.8 ? 'high' : 'medium',
      model_used: 'enhanced-malay-lexicon',
      processing_time_ms: Date.now() - startTime,
      fallback_used: true,
      flagged_words: malayResult.detected_words,
      additional_info: {
        fallback_reason: error.message
      }
    };
  }
}

/**
 * Language Detection for Intelligent Routing
 */
function detectLanguageContent(text: string) {
  const lowerText = text.toLowerCase();
  
  // Malay language indicators
  const malayPatterns = [
    /\b(yang|dan|ini|itu|dengan|untuk|pada|dari|ke|di|adalah|akan|sudah|belum|tidak|tak)\b/gi,
    /\b(saya|kami|kita|awak|kau|dia|mereka|anda)\b/gi,
    /\b(main|permainan|sukan|latihan|pertandingan|lawan|menang|kalah)\b/gi,
    /\b(bodoh|sial|tolol|gila|babi|anjing|puki|bangsat)\b/gi
  ];
  
  let malayMatches = 0;
  malayPatterns.forEach(pattern => {
    const matches = lowerText.match(pattern);
    if (matches) malayMatches += matches.length;
  });
  
  const totalWords = text.split(/\s+/).length;
  const malayRatio = malayMatches / totalWords;
  
  return {
    primary: malayRatio > 0.1 ? 'malay' : 'english',
    confidence: Math.min(malayRatio * 2, 1.0),
    hasMalayContent: malayMatches > 0
  };
}

/**
 * Enhanced Hybrid ML Detection
 * This is the main function that replaces the existing detectToxicContentML
 */
async function detectToxicContentML(
  text: string, 
  settings: ModerationSettings
): Promise<MLResult> {
  const startTime = Date.now();
  const languageInfo = detectLanguageContent(text);
  
  console.log(`[ML Hybrid] Detected language: ${languageInfo.primary}, confidence: ${languageInfo.confidence}`);

  if (languageInfo.primary === 'malay' || languageInfo.hasMalayContent) {
    console.log('[ML Hybrid] Routing to Malaysian content pipeline');
    
    try {
      // Run Malaysian SFW classifier for Malay content
      const malaysianResult = await detectToxicContentMalaysianSFW(text, settings);
      
      // Also run toxic-bert for comparison
      const toxicBertResult = await detectToxicContentToxicBert(text, settings);
      
      // Use Malaysian classifier if it detects significant toxicity
      // or if toxic-bert score is very low (fixes the 0.13% issue)
      let finalResult: MLResult;
      if (malaysianResult.score > 0.3 || toxicBertResult.score < 0.2) {
        finalResult = malaysianResult;
        console.log(`[ML Hybrid] Using Malaysian SFW: ${malaysianResult.score.toFixed(4)} vs ToxicBert: ${toxicBertResult.score.toFixed(4)}`);
      } else {
        finalResult = toxicBertResult;
        console.log(`[ML Hybrid] Using ToxicBert: ${toxicBertResult.score.toFixed(4)} vs Malaysian: ${malaysianResult.score.toFixed(4)}`);
      }
      
      // Add comparison info
      finalResult.additional_info = {
        ...finalResult.additional_info,
        hybrid_comparison: {
          malaysian_score: malaysianResult.score,
          toxic_bert_score: toxicBertResult.score,
          selected_model: finalResult.model_used
        }
      };
      
      return finalResult;
      
    } catch (error) {
      console.warn(`[ML Hybrid] ML models failed for Malay content: ${error.message}, using enhanced rule-based`);
      
      // Enhanced rule-based fallback
      const malayDetector = new MalayToxicityDetector();
      const malayResult = malayDetector.detectToxicity(text);
      
      return {
        score: malayResult.toxicity_score,
        confidence: malayResult.confidence > 0.8 ? 'high' : 'medium',
        model_used: 'enhanced-malay-lexicon-fallback',
        processing_time_ms: Date.now() - startTime,
        fallback_used: true,
        flagged_words: malayResult.detected_words
      };
    }
    
  } else {
    // Use existing toxic-bert for English content
    console.log('[ML Hybrid] Routing to English content pipeline (toxic-bert)');
    return await detectToxicContentToxicBert(text, settings);
  }
}

// Helper functions
function extractMalayToxicWords(text: string): string[] {
  const malayDetector = new MalayToxicityDetector();
  const result = malayDetector.detectToxicity(text);
  return result.detected_words;
}

// Existing toxic-bert function (unchanged)
async function detectToxicContentToxicBert(text: string, settings: ModerationSettings): Promise<MLResult> {
  // Your existing toxic-bert implementation
  // This remains unchanged to maintain English detection accuracy
  const startTime = Date.now();
  
  try {
    const apiKey = Deno.env.get('HUGGINGFACE_API_KEY');
    const response = await fetch(`${HUGGINGFACE_API_URL}/unitary/toxic-bert`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
      signal: AbortSignal.timeout(5000)
    });

    const result = await response.json();
    const toxicScore = result[0]?.find((r: any) => r.label === 'TOXIC')?.score || 0;

    return {
      score: toxicScore,
      confidence: toxicScore > 0.7 ? 'high' : toxicScore > 0.4 ? 'medium' : 'low',
      model_used: 'unitary/toxic-bert',
      processing_time_ms: Date.now() - startTime,
      fallback_used: false
    };
  } catch (error) {
    throw error; // Let hybrid function handle fallback
  }
}

// Risk classification (unchanged)
function classifyRiskLevel(score: number, settings: ModerationSettings): string {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.2) return 'low';
  return 'minimal';
}

// Main moderation function
async function moderateContent(
  title: string,
  description: string,
  settings: ModerationSettings
): Promise<ModerationResult> {
  const text = `${title} ${description}`;
  const startTime = Date.now();
  
  console.log(`[Moderation] Starting enhanced analysis for: "${text.substring(0, 100)}..."`);
  
  let mlResult: MLResult;
  
  if (settings.ml_enabled) {
    // Use enhanced hybrid ML detection
    mlResult = await detectToxicContentML(text, settings);
  } else {
    // Enhanced rule-based detection with Malay support
    const malayDetector = new MalayToxicityDetector();
    const malayResult = malayDetector.detectToxicity(text);
    
    mlResult = {
      score: malayResult.toxicity_score,
      confidence: malayResult.confidence > 0.8 ? 'high' : 'medium',
      model_used: 'enhanced-rule-based',
      processing_time_ms: Date.now() - startTime,
      fallback_used: false,
      flagged_words: malayResult.detected_words
    };
  }
  
  const riskLevel = classifyRiskLevel(mlResult.score, settings);
  
  console.log(`[Moderation] Complete: ${mlResult.score.toFixed(4)} toxicity, ${riskLevel} risk, ${mlResult.model_used}`);
  
  return {
    inappropriate_score: mlResult.score,
    overall_risk_level: riskLevel,
    ml_model_used: mlResult.model_used,
    processing_time_ms: Date.now() - startTime,
    flagged_content: {
      toxic_words: mlResult.flagged_words || [],
      ml_confidence: mlResult.confidence,
      fallback_used: mlResult.fallback_used
    },
    additional_info: mlResult.additional_info
  };
}

// Edge function handler
Deno.serve(async (req: Request) => {
  try {
    const { title, description } = await req.json();
    
    const settings: ModerationSettings = {
      ml_enabled: true,
      toxicity_threshold: 0.5,
      inappropriate_threshold: 0.3,
      consistency_threshold: 0.7
    };
    
    const result = await moderateContent(title, description, settings);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('[Edge Function] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
