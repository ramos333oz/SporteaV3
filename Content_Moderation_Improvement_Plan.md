# Content Moderation Improvement Plan
## Solving Weak Performance Areas

Based on the testing results showing 40% pass rate, here are specific, actionable solutions to improve each weak performance area:

## 🚀 Immediate Solutions (No Model Training Required)

### 1. **Enhance Malay Keyword Database**

#### **Problem**: Missing critical Malay terms for drugs, sexual content, and discriminatory language

#### **Solution A: Update Edge Function Patterns**

**File**: `supabase/functions/moderate-match-content/index.ts`

Add these missing patterns to the `toxicPatterns` array:

```typescript
// Add after line 299 in the toxicPatterns array:

// Sexual content - English (High severity)
/\b(sex|porn|nude|naked|breast|penis|vagina|dick|pussy|cock|tits|ass|boobs)\b/gi,

// Sexual content - Malay (High severity)
/\b(tetek|pantat|pepek|puki|kontol|memek|telanjang|bogel|seks)\b/gi,

// Drug references - English (High severity)
/\b(drug|cocaine|heroin|marijuana|weed|ganja|ecstasy|meth|cannabis|dope|pot|hash)\b/gi,

// Drug references - Malay (High severity)
/\b(dadah|ganja|syabu|pil|ekstasi|ubat|hisap|isap|rokok)\b/gi,

// Discriminatory language - Malay (High severity)
/\b(bangsa|kaum|racist|perkauman|diskriminasi|benci|rasis)\b/gi,

// Religious inappropriate - Malay (Medium severity)
/\b(setan|syaitan|kafir|munafik|dosa|neraka|terkutuk)\b/gi
```

#### **Solution B: Update Fallback System**

**File**: `src/services/contentModerationService.js`

Update the `inappropriateKeywords` array in the `moderateContentFallback` function:

```javascript
// Replace lines 180-183 with:
const inappropriateKeywords = [
  // English basic
  'spam', 'promotion', 'advertisement', 'buy', 'sell', 'money',
  'inappropriate', 'offensive', 'hate', 'discrimination', 'fuck', 'shit',
  
  // Malay profanity
  'bodoh', 'tolol', 'gila', 'sial', 'celaka', 'bangsat', 'babi', 'anjing',
  'pukimak', 'kimak', 'lancau', 'pantat', 'tetek', 'pepek', 'puki',
  
  // Threatening language - Malay
  'bunuh', 'mati', 'hancur', 'sakiti', 'serang', 'mampus',
  
  // Drug references - Malay
  'dadah', 'ganja', 'syabu', 'pil', 'ekstasi',
  
  // Discriminatory - Malay
  'bangsa', 'kaum', 'racist', 'perkauman', 'diskriminasi'
];
```

### 2. **Recalibrate Risk Thresholds**

#### **Problem**: Single violations only trigger "low" risk instead of appropriate levels

#### **Solution A: Update Database Thresholds**

```sql
-- Execute this SQL to lower thresholds for better detection
UPDATE content_moderation_settings SET
  high_risk_threshold = 0.6,    -- Lower from 0.8
  medium_risk_threshold = 0.3,  -- Lower from 0.5
  low_risk_threshold = 0.15     -- Lower from 0.2
WHERE id = (SELECT id FROM content_moderation_settings LIMIT 1);
```

#### **Solution B: Adjust Scoring Weights**

**File**: `src/services/contentModerationService.js`

Update the scoring logic in `moderateContentFallback`:

```javascript
// Replace the keyword checking loop with weighted scoring:
for (const keyword of inappropriateKeywords) {
  if (content.includes(keyword)) {
    // Higher weights for severe violations
    if (['pukimak', 'kimak', 'bunuh', 'mati', 'dadah', 'ganja'].includes(keyword)) {
      toxicScore += 0.6; // High severity
    } else if (['tetek', 'pantat', 'bangsa', 'racist'].includes(keyword)) {
      toxicScore += 0.5; // Medium-high severity
    } else {
      toxicScore += 0.3; // Standard severity
    }
    flaggedKeywords.push(keyword);
  }
}
```

### 3. **Fix Technical Detection Issues**

#### **Problem**: Excessive capitalization and mixed-language detection not working

#### **Solution**: Improve Detection Logic

**File**: `src/services/contentModerationService.js`

```javascript
// Fix excessive capitalization detection (around line 193):
const capsRatio = (content.match(/[A-Z]/g) || []).length / content.replace(/\s/g, '').length;
if (capsRatio > 0.3 && content.length > 10) { // More sensitive threshold
  toxicScore += 0.3;
  flaggedKeywords.push('excessive_caps');
}

// Add repeated character detection:
if (/(.)\1{3,}/.test(content)) { // 4+ repeated chars
  toxicScore += 0.2;
  flaggedKeywords.push('repeated_chars');
}

// Add mixed language boost:
const hasEnglishProfanity = ['fuck', 'shit', 'damn'].some(word => content.includes(word));
const hasMalayProfanity = ['bodoh', 'sial', 'gila'].some(word => content.includes(word));
if (hasEnglishProfanity && hasMalayProfanity) {
  toxicScore += 0.2; // Boost for mixed language violations
  flaggedKeywords.push('mixed_language_violation');
}
```

### 4. **Implement Sports Context Whitelisting**

#### **Problem**: No sports context awareness in fallback system

#### **Solution**: Add Sports Context Detection

**File**: `src/services/contentModerationService.js`

```javascript
// Add this function before moderateContentFallback:
function hasSportsContext(content) {
  const sportsTerms = [
    'basketball', 'football', 'soccer', 'tennis', 'badminton', 'volleyball',
    'bola keranjang', 'bola sepak', 'tenis', 'badminton', 'bola tampar',
    'game', 'match', 'tournament', 'competition', 'training', 'practice',
    'permainan', 'pertandingan', 'latihan', 'sukan'
  ];
  
  return sportsTerms.some(term => content.toLowerCase().includes(term));
}

// Add sports whitelist checking in moderateContentFallback:
const sportsWhitelist = ['crush', 'destroy', 'kill', 'beat', 'demolish', 'hancur'];
const isInSportsContext = hasSportsContext(content);

for (const keyword of inappropriateKeywords) {
  if (content.includes(keyword)) {
    // Reduce penalty for sports competitive terms
    if (isInSportsContext && sportsWhitelist.includes(keyword)) {
      toxicScore += 0.1; // Minimal penalty in sports context
    } else {
      // Normal penalty logic...
    }
  }
}
```

## 🔧 Medium-Term Improvements

### 5. **Deploy Enhanced Edge Function**

**Action**: Deploy the updated edge function with new patterns

```bash
# Deploy the updated edge function
npx supabase functions deploy moderate-match-content
```

### 6. **Update Configuration Database**

**Action**: Apply the new threshold settings

```sql
-- Update model weights for better balance
UPDATE content_moderation_settings SET
  toxic_model_weight = 1.0,           -- 100% focus on toxicity
  consistency_model_weight = 0.0,     -- Disable consistency checking
  sports_validation_weight = 0.0,     -- Disable sports validation
  ml_confidence_threshold = 0.6       -- Lower ML confidence threshold
WHERE id = (SELECT id FROM content_moderation_settings LIMIT 1);
```

### 7. **Test and Validate Improvements**

**Action**: Re-run the testing script to validate improvements

```bash
# Run the updated test
node test-content-moderation-malay.js
```

**Expected Results After Improvements**:
- **Target Pass Rate**: ≥70% (up from 40%)
- **Drug Detection**: 100% (up from 0%)
- **Threatening Language**: 100% (up from 0%)
- **Discriminatory Content**: ≥80% (up from 0%)

## 🎯 Long-Term Strategy

### 8. **Continuous Learning System**

**Implementation**: Create feedback loop for ongoing improvements

```javascript
// Add to contentModerationService.js
async function logModerationFeedback(matchId, actualRisk, userFeedback) {
  await supabase
    .from('moderation_feedback')
    .insert({
      match_id: matchId,
      predicted_risk: actualRisk,
      user_feedback: userFeedback,
      created_at: new Date().toISOString()
    });
}
```

### 9. **Community Reporting Integration**

**Implementation**: Allow users to report missed inappropriate content

```javascript
// Add reporting function
async function reportInappropriateContent(matchId, reason, reportedBy) {
  await supabase
    .from('content_reports')
    .insert({
      match_id: matchId,
      report_reason: reason,
      reported_by: reportedBy,
      status: 'pending_review'
    });
}
```

## 📊 Success Metrics

After implementing these improvements, monitor these metrics:

1. **Detection Rate**: ≥70% for Malay inappropriate content
2. **False Positive Rate**: <10% for clean sports content  
3. **Response Time**: <2 seconds for content moderation
4. **User Satisfaction**: ≥85% approval rating for moderation decisions

## 🚀 Implementation Priority

**Week 1**: Immediate solutions (1-4)
**Week 2**: Medium-term improvements (5-7)  
**Week 3**: Testing and validation
**Week 4**: Long-term strategy implementation (8-9)

This plan addresses all identified weak areas without requiring ML model retraining, focusing on configuration and rule-based improvements that can be implemented immediately.
