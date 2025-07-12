# Content Moderation AI Models Research Report

## Executive Summary

This report provides comprehensive research on AI models for the simplified 2-component content moderation system, with specific focus on Malay language support and sports content compatibility.

## Simplified System Architecture

### New 2-Component System
1. **Toxic Content Detection (75% weight)** - Increased from 60%
2. **Sports Relevance Detection (25% weight)** - Increased from 15%
3. **Removed: Title-Description Consistency** - Eliminated to simplify system

### Updated Risk Calculation Formula
```javascript
overall_risk_score = (
  (toxic_score * 0.75) + 
  ((1 - sports_relevance_score) * 0.25)
)
```

## AI Model Recommendations

### 1. Toxic Content Detection (75% Weight)

#### Primary Recommendation: Multilingual BERT (mBERT)
**Model**: `Xenova/bert-base-multilingual-uncased-sentiment`

**Justification**:
- ✅ **Malay Language Support**: Trained on 104 languages including Bahasa Malaysia
- ✅ **Transformers.js Compatible**: Available as Xenova model for browser/serverless use
- ✅ **Sports Context Aware**: Can be fine-tuned to understand competitive sports terminology
- ✅ **Proven Performance**: Widely used for multilingual sentiment and toxicity detection
- ✅ **Lightweight**: Optimized for serverless environments

**Technical Specifications**:
```javascript
// Implementation in Edge Function
const toxicClassifier = await pipeline(
  'text-classification', 
  'Xenova/bert-base-multilingual-uncased-sentiment',
  { device: 'cpu', dtype: 'q4' } // Quantized for performance
);
```

#### Alternative Option: XLM-RoBERTa
**Model**: `Xenova/xlm-roberta-base` (if available)

**Justification**:
- ✅ **Superior Multilingual Performance**: Better than mBERT for many languages
- ✅ **Robust Architecture**: More parameters and better training
- ⚠️ **Larger Model Size**: May impact serverless performance
- ⚠️ **Availability**: Need to verify Xenova conversion exists

#### Fallback: Rule-Based + Dictionary Approach
**Implementation**: Enhanced pattern matching with Malay toxic words

**Justification**:
- ✅ **Guaranteed Malay Support**: Custom Malay profanity/toxic word dictionary
- ✅ **Sports Context**: Custom whitelist for competitive sports terms
- ✅ **Lightweight**: Minimal computational overhead
- ✅ **Reliable**: No model loading dependencies
- ❌ **Limited Sophistication**: Cannot understand context as well as AI models

### 2. Sports Relevance Detection (25% Weight)

#### Primary Recommendation: Keyword-Based Classification
**Implementation**: Enhanced sports terminology dictionary with scoring

**Justification**:
- ✅ **Multilingual Support**: Easy to add Malay sports terms
- ✅ **Lightweight**: Perfect for serverless environments
- ✅ **Customizable**: Easy to update with new sports terminology
- ✅ **Reliable**: No model dependencies or failures
- ✅ **Fast**: Instant classification without ML inference

**Technical Implementation**:
```javascript
const SPORTS_KEYWORDS = {
  // English terms
  'basketball': 0.9, 'football': 0.9, 'tennis': 0.9,
  'training': 0.7, 'practice': 0.7, 'game': 0.8,
  
  // Malay terms
  'bola keranjang': 0.9, 'bola sepak': 0.9, 'tenis': 0.9,
  'latihan': 0.7, 'amalan': 0.7, 'permainan': 0.8,
  'sukan': 0.9, 'olahraga': 0.8
};
```

#### Alternative: Zero-Shot Classification
**Model**: `Xenova/distilbert-base-uncased-finetuned-sst-2-english` with sports labels

**Justification**:
- ✅ **AI-Powered**: More sophisticated than keyword matching
- ✅ **Flexible**: Can classify into multiple sports categories
- ❌ **English Only**: Limited Malay language support
- ❌ **Computational Overhead**: Slower than keyword approach

## Malay Language Considerations

### Toxic Content Detection in Malay
**Challenges**:
- Limited pre-trained models specifically for Malay toxicity detection
- Need to handle code-switching (English-Malay mixed text)
- Cultural context differences in what's considered offensive

**Solutions**:
1. **Multilingual BERT**: Best available option with Malay support
2. **Custom Dictionary**: Supplement with Malay-specific toxic terms
3. **Hybrid Approach**: Combine AI model with rule-based Malay detection

### Sports Terminology in Malay
**Common Malay Sports Terms**:
```javascript
const MALAY_SPORTS_TERMS = {
  // Sports names
  'bola keranjang': 'basketball',
  'bola sepak': 'football/soccer', 
  'bola tampar': 'volleyball',
  'badminton': 'badminton',
  'renang': 'swimming',
  'larian': 'running',
  
  // General terms
  'sukan': 'sports',
  'latihan': 'training',
  'pertandingan': 'competition',
  'pasukan': 'team',
  'pemain': 'player',
  'jurulatih': 'coach'
};
```

## Technical Implementation Strategy

### Phase 1: Immediate Implementation (Rule-Based)
```javascript
// Simplified 2-component system with rule-based approach
async function moderateContent(title, description) {
  const fullText = `${title} ${description}`;
  
  // 1. Toxic Content Detection (75%)
  const toxicScore = detectToxicContent(fullText);
  
  // 2. Sports Relevance Detection (25%)
  const sportsScore = calculateSportsRelevance(fullText);
  
  // Calculate overall risk
  const overallRisk = (toxicScore * 0.75) + ((1 - sportsScore) * 0.25);
  
  return {
    toxic_score: toxicScore,
    sports_relevance_score: sportsScore,
    overall_risk_score: overallRisk,
    risk_level: calculateRiskLevel(overallRisk)
  };
}
```

### Phase 2: AI Model Integration
```javascript
// Enhanced system with multilingual BERT
async function moderateContentAI(title, description) {
  const fullText = `${title} ${description}`;
  
  // 1. AI-powered toxic detection (75%)
  const toxicResult = await toxicClassifier(fullText);
  const toxicScore = toxicResult[0].label === 'NEGATIVE' ? 
    toxicResult[0].score : 1 - toxicResult[0].score;
  
  // 2. Enhanced sports detection (25%)
  const sportsScore = calculateSportsRelevanceEnhanced(fullText);
  
  // Calculate overall risk
  const overallRisk = (toxicScore * 0.75) + ((1 - sportsScore) * 0.25);
  
  return {
    toxic_score: toxicScore,
    sports_relevance_score: sportsScore,
    overall_risk_score: overallRisk,
    risk_level: calculateRiskLevel(overallRisk)
  };
}
```

## Performance Considerations

### Serverless Optimization
1. **Model Quantization**: Use `dtype: 'q4'` for 4-bit quantization
2. **Lazy Loading**: Load models only when needed
3. **Caching**: Cache model instances between invocations
4. **Timeout Handling**: Fallback to rule-based if AI models timeout

### Malay Language Performance
1. **Preprocessing**: Normalize Malay text (remove diacritics)
2. **Code-switching**: Handle mixed English-Malay content
3. **Cultural Context**: Adjust thresholds for Malay cultural norms

## Recommended Implementation Plan

### Step 1: Update Current System (Immediate)
1. Remove title-description consistency component
2. Update weights: Toxic 75%, Sports 25%
3. Enhance sports keyword dictionary with Malay terms
4. Update risk calculation formula

### Step 2: Enhance Toxic Detection (Short-term)
1. Integrate `Xenova/bert-base-multilingual-uncased-sentiment`
2. Add Malay toxic word dictionary as fallback
3. Implement hybrid scoring (AI + rules)

### Step 3: Optimize Performance (Medium-term)
1. Fine-tune model for sports context
2. Implement advanced caching strategies
3. Add comprehensive Malay language support

## Success Metrics

### Performance Targets
- **Processing Time**: <3 seconds (including AI inference)
- **False Positive Rate**: <5% for sports content
- **Malay Language Accuracy**: >85% for common terms
- **System Availability**: >99.5% uptime

### Quality Metrics
- **Toxic Detection Accuracy**: >90% for English and Malay
- **Sports Relevance Accuracy**: >95% for sports content
- **Cultural Sensitivity**: Appropriate for Malaysian context

## Conclusion

The simplified 2-component system with enhanced Malay language support provides:

1. **Reduced Complexity**: Easier to maintain and debug
2. **Better Performance**: Faster processing with fewer components
3. **Malay Language Support**: Comprehensive coverage for local content
4. **Sports Context Awareness**: Prevents false positives on competitive terms
5. **Scalable Architecture**: Ready for future AI model upgrades

**Recommended Next Steps**:
1. Implement simplified 2-component system immediately
2. Deploy with rule-based approach for reliability
3. Gradually integrate AI models for enhanced accuracy
4. Monitor performance and adjust thresholds based on real usage

---

*Research completed on July 12, 2025*  
*Ready for implementation with SporteaV3 content moderation system*
