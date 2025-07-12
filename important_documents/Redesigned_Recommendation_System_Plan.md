# Redesigned Recommendation System Plan

## Executive Summary

This document outlines a complete redesign of the Sportea recommendation system, moving from a complex vector-based approach to a simpler, more logical two-part solution:

1. **Simplified Direct Preference Matching** for user-match recommendations
2. **ML-Powered Content Moderation System** for administrative oversight

## Current System Problems

### Issues with Vector-Based Approach
- **Conceptual Flaw**: Badminton = Badminton gives 0.6 similarity instead of 1.0
- **Poor Explainability**: Users can't understand why they got specific match percentages
- **Maintenance Complexity**: Vector generation, normalization, and similarity calculations are hard to debug
- **Inaccurate Results**: Categorical data forced through vector similarity produces misleading scores

### Why This Redesign is Necessary
- **User Confusion**: Current 56% match for same sport preference is counterintuitive
- **Business Logic**: Direct preference matching is more aligned with user expectations
- **Performance**: Simpler calculations mean faster recommendations
- **Scalability**: Easier to add new matching criteria without vector regeneration

## Part 1: Simplified Recommendation System

### Core Concept: Weighted Direct Matching

Replace vector similarity with direct preference matching using weighted scoring:

```
Total Match Score = Sports Match (40%) + Faculty Match (25%) + Skill Match (20%) + Schedule Match (10%) + Location Match (5%)
Maximum Score: 100%
```

### Detailed Scoring Breakdown

#### 1. Sports Match (40% weight)
- **Perfect Match**: User sport preference exactly matches match sport → +40%
- **No Match**: Different sports → +0%
- **Logic**: If user likes Badminton and match is Badminton = 40% contribution

#### 2. Faculty Match (25% weight)
- **Same Faculty**: User and match host from same faculty → +25%
- **Different Faculty**: Different faculties → +12.5% (partial points for cross-faculty interaction)
- **Logic**: Encourages faculty mixing while rewarding same-faculty connections

#### 3. Skill Level Compatibility (20% weight)
- **Perfect Match**: Exact skill level match → +20%
- **Compatible**: Adjacent skill levels (beginner-intermediate, intermediate-advanced) → +15%
- **Challenging**: One level gap (beginner-advanced) → +10%
- **Incompatible**: Large skill gaps (beginner-professional) → +0%

#### 4. Schedule Overlap (10% weight)
- **Perfect Overlap**: User available during exact match time → +10%
- **Partial Overlap**: User available during part of match time → +5%
- **No Overlap**: User not available during match time → +0%

#### 5. Location Preference (5% weight)
- **Preferred Location**: Match at user's preferred venue/area → +5%
- **Acceptable Location**: Match within reasonable distance → +2.5%
- **Distant Location**: Match far from user preference → +0%

### Example Calculations

**Example 1: Perfect Match**
- User: Badminton, Engineering, Intermediate, Available 2-4 PM, Prefers Indoor Courts
- Match: Badminton, Engineering Host, Intermediate Level, 2-4 PM, Indoor Court
- Score: 40% + 25% + 20% + 10% + 5% = **100% Match**

**Example 2: Good Match**
- User: Badminton, Engineering, Intermediate, Available 2-4 PM, Prefers Indoor Courts  
- Match: Badminton, Business Host, Advanced Level, 3-5 PM, Indoor Court
- Score: 40% + 12.5% + 15% + 5% + 5% = **77.5% Match**

**Example 3: Poor Match**
- User: Badminton, Engineering, Beginner, Available 2-4 PM, Prefers Indoor Courts
- Match: Football, Arts Host, Professional, 6-8 PM, Outdoor Field
- Score: 0% + 12.5% + 0% + 0% + 0% = **12.5% Match**

## Part 2: Simplified ML-Powered Content Moderation System

### Purpose and Scope

Implement a streamlined 2-component machine learning system for administrative content moderation to:
- Detect inappropriate match titles and descriptions with Malay language support
- Validate sports content relevance and terminology
- Provide admin dashboard alerts for manual review
- Auto-moderate based on confidence scores
- Maintain cultural sensitivity for Malaysian context

### Simplified 2-Component Architecture

#### 1. Streamlined Dual-Model Approach

**Simplified 2-Component Models:**
- **Multilingual Toxic Content Detection (75% weight)**: Enhanced inappropriate content detection with Malay language support
- **Sports Relevance Validation (25% weight)**: Streamlined sports terminology validation with multilingual keywords

#### 2. Enhanced Model Specifications

**A. Multilingual Toxic Content Classifier (75% Weight)**
```javascript
// Primary: Multilingual BERT for comprehensive language support
Model: Xenova/bert-base-multilingual-uncased-sentiment
Languages: English + Bahasa Malaysia + 102 other languages
Task: Toxic content detection with sports context awareness
Features:
  - Sports terminology whitelist (prevents false positives)
  - Cultural context for Malaysian users
  - Competitive sports language understanding
Output: Toxicity score (0-1) + flagged terms
```

**B. Sports Relevance Validator (25% Weight)**
```javascript
// Enhanced keyword-based classification with multilingual support
Implementation: Weighted keyword dictionary + pattern matching
Languages: English + Bahasa Malaysia
Features:
  - Weighted sports terminology (basketball: 0.9, training: 0.7)
  - Malay sports terms (bola keranjang, latihan, sukan)
  - Contextual pattern recognition
  - Multi-keyword bonus scoring
Output: Relevance score (0-1) + detected sports terms
```

**Removed Components:**
- ~~Title-Description Consistency Checker~~ (eliminated for simplification)
- ~~Spam Detection~~ (covered by toxic content detection)
- ~~Complex NER models~~ (replaced with efficient keyword matching)

### Simplified Implementation Architecture

#### 1. Streamlined Content Processing Pipeline

```
Match Creation → Content Extraction → 2-Component Analysis → Risk Assessment → Action Decision
```

**Processing Flow:**
1. Extract title + description text
2. Run toxic content detection (75% weight)
3. Run sports relevance validation (25% weight)
4. Calculate overall risk: `(toxic_score * 0.75) + ((1 - sports_score) * 0.25)`
5. Determine action based on risk level

#### 2. Updated Risk Assessment Matrix

| Risk Level | Criteria | Action |
|------------|----------|---------|
| **High** | Overall risk ≥ 0.80 | Auto-reject + urgent admin alert |
| **Medium** | Overall risk 0.50-0.79 | Queue for manual review (24h SLA) |
| **Low** | Overall risk 0.20-0.49 | Auto-approve with enhanced monitoring |
| **Minimal** | Overall risk < 0.20 | Auto-approve immediately |

**Risk Calculation Formula:**
```
Overall Risk = (Toxic Score × 0.75) + ((1 - Sports Score) × 0.25)
```

#### 3. Admin Dashboard Features

**Real-time Monitoring:**
- Flagged content queue
- Risk level distribution charts
- Model confidence trends
- False positive/negative tracking

**Manual Review Interface:**
- Side-by-side content comparison
- Model prediction explanations
- Quick approve/reject actions
- Feedback collection for model improvement

### Technical Implementation

#### 1. Model Deployment Strategy

**Option A: Cloud-based (Recommended)**
```python
# Using Hugging Face Transformers + FastAPI
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

class ContentModerator:
    def __init__(self):
        self.inappropriate_model = AutoModelForSequenceClassification.from_pretrained(
            "unitary/toxic-bert"
        )
        self.similarity_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def moderate_content(self, title: str, description: str):
        # Inappropriate content check
        inappropriate_score = self.check_inappropriate(title + " " + description)
        
        # Title-description consistency
        consistency_score = self.check_consistency(title, description)
        
        # Sports validation
        sports_validation = self.validate_sports_content(title, description)
        
        return self.calculate_risk_level(inappropriate_score, consistency_score, sports_validation)
```

**Option B: Edge Functions (Lightweight)**
```typescript
// Supabase Edge Function for real-time moderation
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { title, description } = await req.json()

  // Simplified 2-component moderation system
  const [toxicResult, sportsScore] = await Promise.all([
    detectToxicContentMultilingual(title + " " + description), // 75% weight
    validateSportsRelevance(title, description) // 25% weight
  ])

  // Calculate overall risk using new formula
  const overallRisk = (toxicResult.score * 0.75) + ((1 - sportsScore) * 0.25)

  return new Response(JSON.stringify({
    inappropriate_score: toxicResult.score,
    sports_validation_score: sportsScore,
    overall_risk_level: calculateRiskLevel(overallRisk),
    flagged_content: toxicResult.flagged,
    malay_content_detected: detectMalayContent(title + " " + description)
  }))
})
```

#### 2. Database Schema Updates

```sql
-- Simplified content moderation results table (2-component system)
CREATE TABLE content_moderation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id),
    inappropriate_score DECIMAL(3,2), -- Toxic content score (0-1)
    consistency_score DECIMAL(3,2), -- NULL in simplified system
    sports_validation_score DECIMAL(3,2), -- Sports relevance score (0-1)
    overall_risk_level TEXT CHECK (overall_risk_level IN ('minimal', 'low', 'medium', 'high')),
    auto_approved BOOLEAN DEFAULT false,
    requires_review BOOLEAN DEFAULT false,
    flagged_content JSONB, -- Toxic words and risk factors
    model_confidence JSONB, -- Confidence scores and system version
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin review queue
CREATE TABLE admin_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id),
    moderation_result_id UUID REFERENCES content_moderation_results(id),
    priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high
    assigned_admin UUID REFERENCES users(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
```

### Benefits of This Approach

#### 1. Recommendation System Benefits
- **Explainable**: Users see exactly why they got 85% match (same sport + compatible skill + different faculty)
- **Accurate**: Badminton = Badminton gives full sport points, not partial similarity
- **Fast**: Direct calculations instead of vector operations
- **Maintainable**: Easy to adjust weights and add new criteria
- **Intuitive**: Matches user mental model of compatibility

#### 2. Content Moderation Benefits
- **Proactive**: Catches inappropriate content before it goes live
- **Scalable**: Automated processing with human oversight
- **Accurate**: Multiple models reduce false positives/negatives
- **Transparent**: Clear risk levels and reasoning for decisions
- **Adaptive**: Models can be retrained with new data

### Migration Strategy

#### Phase 1: Implement Simplified Recommendations (Week 1-2)
1. Create new recommendation service with direct matching logic
2. Implement weighted scoring system
3. Add explainable match breakdowns
4. A/B test against current system

#### Phase 2: Deploy Content Moderation (Week 3-4)
1. Set up ML model infrastructure
2. Implement content processing pipeline
3. Create admin dashboard
4. Train models on existing content data

#### Phase 3: Full Deployment (Week 5-6)
1. Switch all users to new recommendation system
2. Enable content moderation for all new matches
3. Retire old vector-based system
4. Monitor and optimize performance

### Success Metrics

#### Recommendation System
- **User Satisfaction**: Survey scores on match relevance
- **Engagement**: Click-through rates on recommended matches
- **Conversion**: Join rates for recommended matches
- **Performance**: Response time improvements

#### Content Moderation
- **Accuracy**: False positive/negative rates
- **Coverage**: Percentage of content automatically processed
- **Efficiency**: Admin review time reduction
- **Safety**: Reduction in inappropriate content reports

### Database Schema Verification ✅

**Current Database Status (Verified July 12, 2025):**
- ✅ All core tables exist: `users`, `matches`, `sports`, `user_preferences`, `locations`
- ✅ Content moderation tables implemented: `content_moderation_results`, `admin_review_queue`
- ✅ Direct preference matching fields available: `sport_preferences`, `skill_levels`, `faculty`, etc.
- ✅ Legacy vector fields present but unused: `preference_vector`, `characteristic_vector`
- ✅ JSONB fields support flexible preference storage: `sport_preferences`, `time_preferences`, etc.

**Schema Alignment:**
- **Recommendation System**: Uses existing user preference fields for direct matching
- **Content Moderation**: Uses dedicated tables with simplified 2-component scoring
- **No Breaking Changes**: Legacy vector fields preserved but not used

## Conclusion

This redesigned system addresses the fundamental issues with our current approach while introducing powerful new capabilities:

1. **Simpler, more accurate recommendations** that users can understand and trust
2. **Simplified 2-component content moderation** with Malay language support
3. **Better separation of concerns** - direct preference matching for users, ML for content quality
4. **Improved maintainability** and scalability for future enhancements
5. **Database schema alignment** - all required tables and fields exist and are properly structured

The new system preserves the benefits of machine learning (for content moderation) while using it appropriately, rather than forcing categorical data through vector similarity calculations that don't match user expectations.

**Implementation Status:** Ready for deployment with existing database schema.
