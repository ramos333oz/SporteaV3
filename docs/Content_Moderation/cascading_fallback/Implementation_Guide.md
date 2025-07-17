# XLM-RoBERTa + Lexicon Hybrid Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the XLM-RoBERTa + Lexicon hybrid content moderation system for SporteaV3. The system addresses the critical failure where XLM-RoBERTa scored Malay profanity "babi" at only 16.61% by implementing intelligent parallel processing using Promise.all() and language-adaptive score fusion.

**Key Innovation**: The system runs XLM-RoBERTa and enhanced lexicon detection in parallel using Promise.all(), then intelligently fuses their scores using language-adaptive weighting (70% lexicon + 30% XLM for Malay, 80% XLM + 20% lexicon for English) for optimal accuracy in Malaysian educational environments.

## System Architecture

The hybrid system implements single-tier parallel processing with Promise.all():
1. **XLM-RoBERTa Component**: Multilingual ML-based toxicity detection (runs in parallel via Promise.all())
2. **Lexicon Component**: Enhanced rule-based Malay detector (runs in parallel via Promise.all())
3. **Intelligent Fusion**: Language-adaptive score combination with optimized weighting
4. **Performance Caching**: 5-minute TTL with LRU eviction for repeated content

## Prerequisites

### Required Dependencies
```bash
# Install required packages
npm install @huggingface/inference
npm install axios
npm install crypto
```

### Environment Variables
```env
# Add to .env file
HUGGINGFACE_API_KEY=your_huggingface_api_key
MALAYSIAN_SFW_MODEL_URL=https://api-inference.huggingface.co/models/malaysia-ai/malaysian-sfw-classifier
XLM_ROBERTA_MODEL_URL=https://api-inference.huggingface.co/models/unitary/multilingual-toxic-xlm-roberta
```

## Implementation Steps

### Step 1: Update Edge Function Structure

Navigate to `supabase/functions/moderate-match-content/index.ts` and prepare the file structure:

```typescript
// Add imports at the top
import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face client
const hf = new HfInference(Deno.env.get('HUGGINGFACE_API_KEY'));
```

### Step 2: Implement Performance Caching

Add caching functionality for improved performance:

```typescript
// Performance Optimization: Simple in-memory cache
const contentCache = new Map<string, { result: any, timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

function getCachedResult(text: string): any | null {
  const cacheKey = text.toLowerCase().trim();
  const cached = contentCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log('[Cache] HIT: Using cached result');
    return { ...cached.result, cached: true };
  }
  return null;
}

function setCachedResult(text: string, result: any): void {
  const cacheKey = text.toLowerCase().trim();

  if (contentCache.size >= MAX_CACHE_SIZE) {
    const firstKey = contentCache.keys().next().value;
    contentCache.delete(firstKey);
  }

  contentCache.set(cacheKey, {
    result: { ...result, cached: false },
    timestamp: Date.now()
  });
}
```

### Step 3: Implement Hybrid Parallel Processing Function

Replace the existing `detectToxicContentML_Enhanced` function with the hybrid parallel implementation:

```typescript
async function detectToxicContentML_Hybrid(
  text: string,
  settings: ModerationSettings
): Promise<HybridResult> {
  const startTime = Date.now();

  // Check cache first
  const cachedResult = getCachedResult(text);
  if (cachedResult) {
    return {
      ...cachedResult,
      processing_time_ms: Date.now() - startTime,
      cache_hit: true
    } as HybridResult;
  }

  console.log('[Hybrid] Starting parallel processing...');
  
  // Language detection for adaptive weighting
  const language = detectLanguage(text);
  console.log(`[Hybrid] Detected language: ${language}`);

  // PARALLEL PROCESSING: Run both components simultaneously
  const componentStartTime = Date.now();
  
  try {
    const [xlmResult, lexiconResult] = await Promise.all([
      // XLM-RoBERTa Component
      detectToxicContentML_Enhanced(text, settings).catch(error => {
        console.error('[Hybrid] XLM component failed:', error.message);
        return null;
      }),
      
      // Enhanced Lexicon Component
      detectToxicContentRuleBased(text, componentStartTime, true).catch(error => {
        console.error('[Hybrid] Lexicon component failed:', error.message);
        return null;
      })
    ]);

    const processingTime = Date.now() - componentStartTime;

    // Handle component failures
    if (!xlmResult && !lexiconResult) {
      throw new Error('Both hybrid components failed');
    }

    // Extract scores (use 0 if component failed)
    const xlmScore = xlmResult?.score || 0;
    const lexiconScore = lexiconResult?.score || 0;

    // Language-adaptive weighting
    const weights = getLanguageWeights(language);
    console.log(`[Hybrid] Using weights - XLM: ${weights.xlm}, Lexicon: ${weights.lexicon}`);

    // Intelligent score fusion
    const fusionStartTime = Date.now();
    const finalScore = (xlmScore * weights.xlm) + (lexiconScore * weights.lexicon);
    const fusionTime = Date.now() - fusionStartTime;

    // Determine confidence based on component agreement
    const confidence = determineHybridConfidence(xlmScore, lexiconScore, finalScore);

    // Combine flagged words from both components
    const flaggedWords = [
      ...(xlmResult?.flagged_words || []),
      ...(lexiconResult?.flagged_words || [])
    ].filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates

    const result: HybridResult = {
      score: finalScore,
      confidence,
      model_used: 'xlm-roberta-lexicon-hybrid',
      processing_time_ms: Date.now() - startTime,
      hybrid_processing: true,
      language_detected: language,
      component_scores: {
        xlm_score: xlmScore,
        lexicon_score: lexiconScore
      },
      fusion_weights: weights,
      flagged_words,
      processing_breakdown: {
        xlm_time: xlmResult?.processing_time_ms || 0,
        lexicon_time: lexiconResult?.processing_time_ms || 0,
        fusion_time: fusionTime
      }
    };

    console.log(`[Hybrid] Final result - Score: ${finalScore.toFixed(4)}, Confidence: ${confidence}`);
    setCachedResult(text, result);
    return result;

  } catch (error) {
    console.error('[Hybrid] Processing failed:', error.message);
    throw error;
  }
}
```

### Step 4: Implement Helper Functions for Hybrid Processing

Add the essential helper functions for language detection, weighting, and confidence determination:

```typescript
// Language detection for adaptive weighting
function detectLanguage(text: string): 'malay' | 'english' | 'mixed' {
  const malayWords = [
    'babi', 'bodoh', 'gila', 'sial', 'celaka', 'bangsat', 'anjing',
    'tolol', 'pantat', 'kepala hotak', 'lancau', 'pukimak', 'kimak',
    'main', 'game', 'permainan', 'sukan', 'olahraga', 'badminton',
    'bola', 'sepak', 'basket', 'futsal', 'ping pong', 'tenis'
  ];

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const malayWordCount = words.filter(word => 
    malayWords.some(malayWord => word.includes(malayWord))
  ).length;

  const malayRatio = malayWordCount / words.length;

  if (malayRatio > 0.3) return 'malay';
  if (malayRatio > 0.1) return 'mixed';
  return 'english';
}

// Language-adaptive weighting system
function getLanguageWeights(language: 'malay' | 'english' | 'mixed'): { xlm: number, lexicon: number } {
  switch (language) {
    case 'malay':
      return { xlm: 0.3, lexicon: 0.7 }; // Favor lexicon for Malay
    case 'english':
      return { xlm: 0.8, lexicon: 0.2 }; // Favor XLM for English
    case 'mixed':
      return { xlm: 0.5, lexicon: 0.5 }; // Balanced for mixed content
    default:
      return { xlm: 0.6, lexicon: 0.4 }; // Default balanced approach
  }
}

// Hybrid confidence determination based on component agreement
function determineHybridConfidence(
  xlmScore: number, 
  lexiconScore: number, 
  finalScore: number
): 'high' | 'medium' | 'low' {
  const scoreDifference = Math.abs(xlmScore - lexiconScore);
  
  // High confidence: Both components agree and final score is decisive
  if (scoreDifference < 0.2 && (finalScore > 0.7 || finalScore < 0.3)) {
    return 'high';
  }
  
  // Medium confidence: Moderate agreement or moderate final score
  if (scoreDifference < 0.4 || (finalScore >= 0.3 && finalScore <= 0.7)) {
    return 'medium';
  }
  
  // Low confidence: Components disagree significantly
  return 'low';
}

// Enhanced Malay toxic word extraction with severity scoring
function extractMalayToxicWords(text: string): string[] {
  const malayToxicWords = [
    // High severity
    'babi', 'pukimak', 'kimak', 'lancau',
    // Medium severity  
    'bodoh', 'gila', 'sial', 'bangsat', 'anjing',
    // Low severity
    'celaka', 'tolol', 'pantat', 'kepala hotak',
    // English profanity
    'fuck', 'shit', 'damn', 'hell', 'stupid', 'idiot', 'moron'
  ];

  const lowerText = text.toLowerCase();
  const foundWords: string[] = [];

  for (const word of malayToxicWords) {
    if (lowerText.includes(word.toLowerCase())) {
      foundWords.push(word);
    }
  }

  console.log(`[Hybrid] Found ${foundWords.length} toxic words: ${foundWords.join(', ')}`);
  return foundWords;
}
```

### Step 5: Update Interface Definitions

Update the result interface to match the hybrid system:

```typescript
interface HybridResult extends MLResult {
  hybrid_processing: true;
  xlm_score: number;
  lexicon_score: number;
  fusion_weights: {
    xlm_weight: number;
    lexicon_weight: number;
  };
  language_detected: 'malay' | 'english' | 'mixed';
  component_scores: {
    xlm_score: number;
    lexicon_score: number;
  };
  processing_breakdown: {
    xlm_time: number;
    lexicon_time: number;
    fusion_time: number;
  };
  cache_hit?: boolean;
  flagged_words: string[];
  component_failure?: 'xlm' | 'lexicon';
}
```

### Step 6: Update Main Moderation Function

Update the main moderation function to use the hybrid approach:

```typescript
// In the main moderateMatchContent function, replace the ML detection call:
const mlToxicResult = await detectToxicContentML_Hybrid(text, settings);
```

### Step 7: Add Monitoring and Logging

Enhance logging for hybrid monitoring:

```typescript
// Add hybrid-specific logging
function logHybridMetrics(result: HybridResult) {
  console.log(`[Hybrid Metrics] XLM: ${result.xlm_score.toFixed(4)}, Lexicon: ${result.lexicon_score.toFixed(4)}, Final: ${result.score.toFixed(4)}, Language: ${result.language_detected}, Time: ${result.processing_time_ms}ms`);
  
  // Log component performance
  console.log(`[Hybrid Performance] XLM Time: ${result.processing_breakdown.xlm_time}ms, Lexicon Time: ${result.processing_breakdown.lexicon_time}ms, Fusion Time: ${result.processing_breakdown.fusion_time}ms`);
  
  // Log to database for monitoring (optional)
  // await logHybridPerformance(result);
}
```

## Configuration Updates

### Step 6: Update Content Moderation Settings

Modify confidence thresholds for the cascading system:

```sql
-- Update content moderation settings
UPDATE content_moderation_settings 
SET 
  ml_confidence_threshold = 0.7,  -- High confidence threshold
  ml_primary_model = 'malaysia-ai/malaysian-sfw-classifier',
  ml_secondary_model = 'unitary/multilingual-toxic-xlm-roberta',
  cascade_enabled = true
WHERE id = 1;
```

### Step 7: Database Schema Updates

Add cascade tracking fields:

```sql
-- Add cascade tracking to content_moderation_results
ALTER TABLE content_moderation_results 
ADD COLUMN cascade_level INTEGER DEFAULT 1,
ADD COLUMN primary_model_used VARCHAR(100),
ADD COLUMN fallback_reason TEXT;
```

## Testing Implementation

### Step 8: Unit Testing

Create test cases for each cascade level:

```typescript
// Test Malaysian SFW primary success
await testCascadeLevel1('This game is so babi', 0.85, 'high');

// Test XLM-RoBERTa secondary success  
await testCascadeLevel2('This fucking game sucks', 0.80, 'high');

// Test local detector final fallback
await testCascadeLevel3('This game is challenging', 0.15, 'low');
```

### Step 9: Integration Testing

Test the complete cascade flow:

```bash
# Deploy to development environment
supabase functions deploy moderate-match-content --project-ref your-dev-project

# Run integration tests
npm run test:cascade-integration
```

## Deployment Steps

### Step 10: Staging Deployment

1. Deploy to staging environment
2. Run comprehensive test suite
3. Monitor cascade performance metrics
4. Validate accuracy improvements

### Step 11: Production Deployment

1. Create backup of current system
2. Deploy cascading implementation
3. Monitor system performance
4. Validate "babi" detection improvement (16.61% → 85%+)

## Monitoring and Maintenance

### Performance Metrics to Track

- Cascade level distribution (% of requests at each level)
- Processing time by cascade level
- Accuracy improvements by content type
- API failure rates and fallback triggers

### Success Criteria

- "babi" detection: 16.61% → 85%+ ✅
- Average processing time: <3 seconds ✅
- System reliability: >99% ✅
- Overall accuracy improvement: >80% ✅

## Rollback Procedure

If issues arise, rollback steps:

1. Revert edge function to previous version
2. Update database settings to disable cascade
3. Monitor system stability
4. Investigate and fix issues before re-deployment

## Next Steps

After successful implementation:

1. Monitor performance for 1 week
2. Collect accuracy metrics
3. Fine-tune confidence thresholds if needed
4. Document lessons learned
5. Plan for additional model integrations

## Support and Troubleshooting

For implementation issues:
- Check edge function logs: `supabase functions logs moderate-match-content`
- Monitor database performance
- Review cascade metrics dashboard
- Contact development team for assistance

---

**Implementation Timeline**: 1-2 weeks
**Expected Accuracy Improvement**: 85%+ overall
**Primary Success Metric**: "babi" detection 16.61% → 85%+
