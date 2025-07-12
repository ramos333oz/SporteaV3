# New Recommendation System Plan - SporteaV3

## Executive Summary

This document outlines the complete rebuild of SporteaV3's recommendation system to address critical issues with the current implementation including cross-sport contamination, unpredictable behavior, and non-explainable scoring. The new system will use simplified vector embeddings with HNSW indexing to provide explainable, measurable, and predictable recommendations.

## Current Supabase Backend Analysis

### Database Structure Overview
Based on comprehensive analysis of your Supabase database, here's the current state:

**Core Tables:**
- `users` (4 users with 384-dim vectors) - Main user data with embedded preferences
- `matches` (69 matches with 384-dim vectors) - Match data with characteristic vectors
- `sports` (11 sports) - Basketball, Badminton, Football, Tennis, etc.
- `locations` - Venue information with facilities and campus data
- `participants` - Match participation tracking

**Current Vector Storage:**
- `users.preference_vector` - 384-dimension user vectors (4 users have vectors)
- `matches.characteristic_vector` - 384-dimension match vectors (69 matches have vectors)
- `user_vectors` - Empty table (not currently used)
- `recommendation_embeddings` - 1 record (minimal usage)

**Recommendation Infrastructure:**
- `recommendation_feedback` - 35 feedback records (active user feedback system)
- `recommendation_scores` - Empty (not currently used)
- `user_recommendation_cache` - Empty (not currently used)
- `embedding_queue` - Queue system for vector processing

**User Preference Data Structure:**
```json
// Current sport_preferences format (inconsistent):
// Format 1: UUID array ["dd400853-7ce6-47bc-aee6-2ee241530f79"]
// Format 2: Object array [{"id": 1, "name": "Football", "level": "Beginner"}]
// Format 3: Object array [{"id": "1752299512095", "name": "Badminton", "level": "Intermediate"}]

// Other user data:
{
  "faculty": "ENGINEERING" | "COMPUTER SCIENCES",
  "gender": "Male" | "Female",
  "skill_levels": {"badminton": "beginner", "basketball": "intermediate"},
  "available_days": ["monday", "tuesday", ...],
  "play_style": "casual" | "competitive"
}
```

### Critical Issues Identified
1. **Cross-Sport Contamination**: Removing badminton preferences affects football recommendations
2. **Unpredictable Behavior**: Removing preferences increases scores instead of decreasing them
3. **Multiple Conflicting Implementations**: 3 different cosine similarity functions with inconsistent logic
4. **Complex Vector Schema**: 384-dimension vectors with unclear attribute boundaries
5. **Configuration Chaos**: Multiple conflicting feature flags in recommendationService.js
6. **Data Inconsistency**: Sport preferences stored in 3 different formats
7. **Underutilized Tables**: Several recommendation tables are empty despite infrastructure
8. **Edge Function Complexity**: Multiple functions with complex interactions causing bugs

### Current System Components (To Be Replaced)
- `src/services/recommendationService.js` - Multiple conflicting algorithms
- `supabase/functions/generate-user-embeddings-v2/` - Complex 384-dimension vector generation
- `supabase/functions/generate-match-embeddings/` - Match vector processing
- `supabase/functions/process-embedding-queue/` - Queue processing system
- Multiple cosine similarity SQL functions with different weights

## New System Design Principles

### Core Principles
1. **Simplicity Over Complexity**: Single, clear algorithm with predictable behavior
2. **Explainable Scoring**: Each attribute contributes a known, measurable percentage
3. **Sport Isolation**: Sport preferences only affect that sport's recommendations
4. **Predictable Behavior**: Removing preferences decreases relevant scores
5. **Measurable Results**: 90-100% similarity for perfect attribute matches
6. **Mathematical Transparency**: Clear formulas that can be validated and tested

### Technical Architecture
1. **Vector Embeddings**: Use pgvector with HNSW indexing for similarity calculations
2. **Normalized Vectors**: Ensure consistent similarity score ranges (0-100%)
3. **Attribute Isolation**: Separate vector dimensions for each attribute type
4. **Single Similarity Function**: One cosine similarity calculation with clear weighting
5. **Real-time Processing**: Direct calculation without complex queue systems

## New Vector Schema Design

### Simplified 128-Dimension Vector Structure
```
Total Dimensions: 128
├── Sports Preferences (0-63): 64 dimensions
│   ├── Sport 1 (Badminton): 8 dimensions
│   ├── Sport 2 (Football): 8 dimensions  
│   ├── Sport 3 (Basketball): 8 dimensions
│   ├── Sport 4 (Tennis): 8 dimensions
│   ├── Sport 5 (Volleyball): 8 dimensions
│   ├── Sport 6 (Swimming): 8 dimensions
│   ├── Sport 7 (Futsal): 8 dimensions
│   └── Sport 8 (Table Tennis): 8 dimensions
├── Faculty Matching (64-79): 16 dimensions
├── Skill Level (80-95): 16 dimensions
├── Schedule Compatibility (96-111): 16 dimensions
└── Enhanced Attributes (112-127): 16 dimensions
    ├── Age Group: 4 dimensions
    ├── Gender Preference: 4 dimensions
    ├── Play Style: 4 dimensions
    └── Location Preference: 4 dimensions
```

### Attribute Weighting Strategy
- **Sports Preferences**: 40% (Primary matching factor)
- **Faculty Matching**: 25% (Important for networking)
- **Skill Level**: 20% (Ensures balanced matches)
- **Schedule Compatibility**: 10% (Practical consideration)
- **Enhanced Attributes**: 5% (Fine-tuning factors)

## Implementation Plan (Adapted to Your Supabase Structure)

### Phase 1: Data Normalization & Schema Setup (Week 1)
1. **Data Backup & Normalization**
   - Backup existing 4 user vectors and 69 match vectors
   - Create `sport_preferences_normalized` table
   - Run normalization function on existing users
   - Validate data consistency across 3 sport preference formats

2. **Create V3 Tables**
   - `user_vectors_v3` - Store simplified 128-dimension user vectors
   - `match_vectors_v3` - Store simplified 128-dimension match vectors
   - `recommendation_logs_v3` - Enhanced tracking with sport isolation verification
   - `sport_preferences_normalized` - Standardized sport preference format

3. **Create Single Similarity Function**
   - `calculate_simple_cosine_similarity_v3()` - One function with clear attribute weighting
   - Rename existing functions to _backup instead of dropping

4. **Set Up HNSW Indexes**
   - Optimize for cosine similarity searches on 128-dimension vectors
   - Parallel to existing 384-dimension indexes

### Phase 2: Vector Generation System (Week 2)
1. **User Vector Generation**
   - Create `generate-simple-user-vectors-v3` edge function
   - Use normalized sport preferences from `sport_preferences_normalized`
   - Map your 11 sports to isolated 8-dimension blocks
   - Handle your faculty structure (ENGINEERING, COMPUTER SCIENCES)

2. **Match Vector Generation**
   - Create `generate-simple-match-vectors-v3` edge function
   - Use existing `matches` table structure with `sport_id` references
   - Convert match attributes to 128-dimension vectors
   - Maintain consistency with user vector schema

3. **Migration Strategy**
   - Process existing 4 users through new vector generation
   - Process existing 69 matches through new vector generation
   - Validate vectors against current recommendation feedback data

### Phase 3: Recommendation Engine (Week 3)
1. **Parallel Recommendation Service**
   - Create `recommendationServiceV3.js` alongside existing service
   - Single algorithm path using v3 tables
   - Utilize existing `recommendation_feedback` table for validation

2. **Explainable Scoring**
   - Break down similarity scores by attribute category
   - Leverage existing feedback system to validate explanations
   - Show percentage contribution of each factor

3. **Sport-Specific Filtering**
   - Ensure Basketball preferences only affect Basketball matches
   - Test with your existing sports: Basketball, Badminton, Football, etc.
   - Implement proper isolation between all 11 sports

### Phase 4: Testing & Validation (Week 4)
1. **Individual Attribute Testing**
   - Test each attribute's contribution independently
   - Use existing user data (Omar, Azmil, Test Users) for validation
   - Compare v3 results with existing recommendation_feedback data

2. **Edge Case Testing**
   - Test with users who have no sport preferences
   - Test with users who have mixed preference formats
   - Test preference removal scenarios using existing user accounts

3. **Performance Testing**
   - Compare 128-dim vs 384-dim HNSW performance
   - Test with existing 69 matches dataset
   - Validate query response times

4. **Migration Validation**
   - A/B test v3 vs current system using existing users
   - Validate sport isolation using existing Basketball/Badminton users
   - Use existing recommendation_feedback to measure improvement

## Testing Methodology

### Systematic Attribute Testing
1. **Sport Preference Testing**
   - Set only badminton preference → Only badminton matches should score high
   - Remove badminton preference → Badminton match scores should decrease
   - Add football preference → Football matches should score high, badminton unchanged

2. **Faculty Testing**
   - Same faculty → Should contribute 25% to similarity score
   - Different faculty → Should contribute lower percentage

3. **Skill Level Testing**
   - Matching skill levels → Should contribute 20% to similarity score
   - Mismatched skill levels → Should contribute lower percentage

4. **Schedule Testing**
   - Overlapping availability → Should contribute 10% to similarity score
   - No overlap → Should contribute 0% to similarity score

### Validation Criteria
- Perfect attribute match → 90-100% similarity in that category
- Partial match → 50-70% similarity in that category  
- No match → 0-20% similarity in that category
- Removing preferences → Decreases relevant scores, doesn't affect others
- Adding preferences → Increases relevant scores, doesn't affect others

## Success Metrics

### Technical Metrics
- Query response time < 100ms for 10 recommendations
- 90-100% similarity for perfect attribute matches
- 0% cross-sport contamination
- Predictable behavior in 100% of test cases

### User Experience Metrics
- Explainable recommendations (users understand why they got each recommendation)
- Relevant recommendations (users find suggestions useful)
- Consistent behavior (same inputs produce same outputs)

## Risk Mitigation

### Potential Risks
1. **Performance Impact**: New vector calculations might be slower
   - Mitigation: Use HNSW indexing and optimized queries
   
2. **Data Migration**: Moving from 384 to 128 dimensions
   - Mitigation: Parallel system deployment with gradual migration
   
3. **User Disruption**: Recommendation changes might confuse users
   - Mitigation: A/B testing and gradual rollout

## Next Steps

1. **Immediate Actions**
   - Create database migration scripts
   - Set up development environment for testing
   - Begin implementation of Phase 1

2. **Research & Development**
   - Validate vector schema with sample data
   - Test HNSW performance with 128-dimension vectors
   - Create comprehensive test suite

3. **Documentation**
   - Create detailed API documentation
   - Document vector schema and attribute mappings
   - Prepare user-facing explanation of new recommendation logic

## Detailed Technical Specifications

### Database Schema Changes

#### Strategy: Parallel System Implementation
Instead of replacing existing tables, we'll create new v3 tables alongside current ones for safe migration:

#### New Tables
```sql
-- User vectors with simplified 128-dimension schema (parallel to existing user_vectors)
CREATE TABLE user_vectors_v3 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vector_data vector(128) NOT NULL,
    sport_preferences_normalized JSONB NOT NULL, -- Standardized format
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Match vectors with simplified 128-dimension schema (parallel to matches.characteristic_vector)
CREATE TABLE match_vectors_v3 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    vector_data vector(128) NOT NULL,
    sport_id UUID NOT NULL REFERENCES sports(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id)
);

-- Enhanced recommendation tracking (utilize existing recommendation_feedback structure)
CREATE TABLE recommendation_logs_v3 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    match_id UUID NOT NULL REFERENCES matches(id),
    similarity_score FLOAT NOT NULL,
    attribute_breakdown JSONB NOT NULL, -- {"sports": 0.4, "faculty": 0.25, "skill": 0.2, "schedule": 0.1, "enhanced": 0.05}
    sport_isolation_verified BOOLEAN DEFAULT FALSE, -- Track cross-sport contamination prevention
    user_feedback TEXT,
    algorithm_version TEXT DEFAULT 'v3_simplified',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sport preferences normalization lookup (solve data inconsistency)
CREATE TABLE sport_preferences_normalized (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    sport_id UUID NOT NULL REFERENCES sports(id),
    sport_name TEXT NOT NULL, -- Normalized sport name
    skill_level TEXT NOT NULL, -- beginner, intermediate, advanced, professional
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, sport_id)
);
```

#### HNSW Indexes
```sql
-- Optimized HNSW index for cosine similarity on user vectors
CREATE INDEX user_vectors_v3_hnsw_idx
ON user_vectors_v3 USING hnsw (vector_data vector_cosine_ops)
WITH (m=16, ef_construction=64);

-- Optimized HNSW index for cosine similarity on match vectors
CREATE INDEX match_vectors_v3_hnsw_idx
ON match_vectors_v3 USING hnsw (vector_data vector_cosine_ops)
WITH (m=16, ef_construction=64);
```

### Single Similarity Function
```sql
CREATE OR REPLACE FUNCTION calculate_simple_cosine_similarity(
    user_id_param UUID,
    match_vector_param vector(128)
) RETURNS TABLE (
    similarity_score FLOAT,
    sports_contribution FLOAT,
    faculty_contribution FLOAT,
    skill_contribution FLOAT,
    schedule_contribution FLOAT,
    enhanced_contribution FLOAT
) AS $$
DECLARE
    user_vector vector(128);
    weighted_dot_product FLOAT := 0;
    weighted_norm_user FLOAT := 0;
    weighted_norm_match FLOAT := 0;
    final_similarity FLOAT := 0;

    -- Attribute contributions
    sports_score FLOAT := 0;
    faculty_score FLOAT := 0;
    skill_score FLOAT := 0;
    schedule_score FLOAT := 0;
    enhanced_score FLOAT := 0;
BEGIN
    -- Get user vector
    SELECT vector_data INTO user_vector
    FROM user_vectors_v3
    WHERE user_id = user_id_param;

    IF user_vector IS NULL THEN
        RETURN QUERY SELECT 0::FLOAT, 0::FLOAT, 0::FLOAT, 0::FLOAT, 0::FLOAT, 0::FLOAT;
        RETURN;
    END IF;

    -- Calculate weighted cosine similarity with attribute breakdown
    -- Sports (dimensions 0-63): Weight 40%
    FOR i IN 1..64 LOOP
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * 0.40);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * 0.40);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * 0.40);
        sports_score := sports_score + (user_vector[i] * match_vector_param[i] * 0.40);
    END LOOP;

    -- Faculty (dimensions 64-79): Weight 25%
    FOR i IN 65..80 LOOP
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * 0.25);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * 0.25);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * 0.25);
        faculty_score := faculty_score + (user_vector[i] * match_vector_param[i] * 0.25);
    END LOOP;

    -- Skill Level (dimensions 80-95): Weight 20%
    FOR i IN 81..96 LOOP
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * 0.20);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * 0.20);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * 0.20);
        skill_score := skill_score + (user_vector[i] * match_vector_param[i] * 0.20);
    END LOOP;

    -- Schedule (dimensions 96-111): Weight 10%
    FOR i IN 97..112 LOOP
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * 0.10);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * 0.10);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * 0.10);
        schedule_score := schedule_score + (user_vector[i] * match_vector_param[i] * 0.10);
    END LOOP;

    -- Enhanced (dimensions 112-127): Weight 5%
    FOR i IN 113..128 LOOP
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * 0.05);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * 0.05);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * 0.05);
        enhanced_score := enhanced_score + (user_vector[i] * match_vector_param[i] * 0.05);
    END LOOP;

    -- Calculate final similarity
    IF weighted_norm_user > 0 AND weighted_norm_match > 0 THEN
        final_similarity := weighted_dot_product /
            (SQRT(weighted_norm_user) * SQRT(weighted_norm_match));
    ELSE
        final_similarity := 0;
    END IF;

    -- Normalize attribute contributions to percentages
    IF weighted_norm_user > 0 AND weighted_norm_match > 0 THEN
        sports_score := sports_score / (SQRT(weighted_norm_user) * SQRT(weighted_norm_match));
        faculty_score := faculty_score / (SQRT(weighted_norm_user) * SQRT(weighted_norm_match));
        skill_score := skill_score / (SQRT(weighted_norm_user) * SQRT(weighted_norm_match));
        schedule_score := schedule_score / (SQRT(weighted_norm_user) * SQRT(weighted_norm_match));
        enhanced_score := enhanced_score / (SQRT(weighted_norm_user) * SQRT(weighted_norm_match));
    END IF;

    RETURN QUERY SELECT
        final_similarity,
        sports_score,
        faculty_score,
        skill_score,
        schedule_score,
        enhanced_score;
END;
$$ LANGUAGE plpgsql;
```

## Detailed Implementation Steps

### Step 1: Data Normalization and Backup
1. **Backup Current Data** (Critical - you have 4 users with vectors and 69 matches)
   ```sql
   -- Backup existing vectors
   CREATE TABLE users_preference_vector_backup AS
   SELECT id, preference_vector, sport_preferences, skill_levels, available_days, play_style, faculty, gender
   FROM users WHERE preference_vector IS NOT NULL;

   CREATE TABLE matches_characteristic_vector_backup AS
   SELECT id, characteristic_vector, sport_id, skill_level, title, description
   FROM matches WHERE characteristic_vector IS NOT NULL;
   ```

2. **Normalize Sport Preferences Data** (Fix the 3 different formats)
   ```sql
   -- Create function to normalize sport preferences
   CREATE OR REPLACE FUNCTION normalize_user_sport_preferences(user_id_param UUID)
   RETURNS VOID AS $$
   DECLARE
       user_prefs JSONB;
       pref_item JSONB;
       sport_uuid UUID;
       sport_name_val TEXT;
       skill_level_val TEXT;
   BEGIN
       -- Get user's sport preferences
       SELECT sport_preferences INTO user_prefs FROM users WHERE id = user_id_param;

       -- Clear existing normalized preferences
       DELETE FROM sport_preferences_normalized WHERE user_id = user_id_param;

       -- Process each preference format
       FOR pref_item IN SELECT * FROM jsonb_array_elements(user_prefs)
       LOOP
           -- Handle UUID format: "dd400853-7ce6-47bc-aee6-2ee241530f79"
           IF jsonb_typeof(pref_item) = 'string' THEN
               sport_uuid := pref_item::text::uuid;
               SELECT name INTO sport_name_val FROM sports WHERE id = sport_uuid;
               skill_level_val := 'intermediate'; -- Default

           -- Handle object format: {"id": 1, "name": "Football", "level": "Beginner"}
           ELSIF pref_item ? 'name' AND pref_item ? 'level' THEN
               sport_name_val := pref_item->>'name';
               skill_level_val := LOWER(pref_item->>'level');
               SELECT id INTO sport_uuid FROM sports WHERE LOWER(name) = LOWER(sport_name_val);
           END IF;

           -- Insert normalized preference
           IF sport_uuid IS NOT NULL AND sport_name_val IS NOT NULL THEN
               INSERT INTO sport_preferences_normalized (user_id, sport_id, sport_name, skill_level)
               VALUES (user_id_param, sport_uuid, sport_name_val, skill_level_val)
               ON CONFLICT (user_id, sport_id) DO UPDATE SET
                   sport_name = EXCLUDED.sport_name,
                   skill_level = EXCLUDED.skill_level;
           END IF;
       END LOOP;
   END;
   $$ LANGUAGE plpgsql;
   ```

3. **Keep Existing Functions Temporarily** (Don't drop until v3 is validated)
   ```sql
   -- Rename existing functions instead of dropping
   ALTER FUNCTION IF EXISTS calculate_weighted_cosine_similarity
   RENAME TO calculate_weighted_cosine_similarity_v2_backup;

   ALTER FUNCTION IF EXISTS calculate_proper_weighted_cosine_similarity
   RENAME TO calculate_proper_weighted_cosine_similarity_v2_backup;

   ALTER FUNCTION IF EXISTS calculate_sport_specific_weighted_cosine_similarity
   RENAME TO calculate_sport_specific_weighted_cosine_similarity_v2_backup;
   ```

### Step 2: Vector Generation Logic (Adapted to Your Data Structure)

#### User Vector Generation (Using Normalized Sport Preferences)
```javascript
// Simplified user vector generation adapted to your Supabase structure
function generateUserVectorV3(userData) {
    const vector = new Array(128).fill(0);

    // Sports preferences (dimensions 0-63) - 8 dimensions per sport
    // Map your 11 sports to specific dimension ranges
    const sportMapping = {
        'Basketball': 0,    // dimensions 0-7
        'Badminton': 8,     // dimensions 8-15
        'Football': 16,     // dimensions 16-23
        'Tennis': 24,       // dimensions 24-31
        'Volleyball': 32,   // dimensions 32-39
        'Table Tennis': 40, // dimensions 40-47
        'Futsal': 48,       // dimensions 48-55
        'Frisbee': 56,      // dimensions 56-63
        'Hockey': 64,       // dimensions 64-71 (moved from faculty range)
        'Rugby': 72,        // dimensions 72-79 (moved from faculty range)
        'Squash': 80        // dimensions 80-87 (moved from skill range)
    };

    // Use normalized sport preferences from sport_preferences_normalized table
    if (userData.normalized_sport_preferences) {
        userData.normalized_sport_preferences.forEach(sport => {
            const startDim = sportMapping[sport.sport_name];
            if (startDim !== undefined) {
                const strength = getSkillStrength(sport.skill_level); // 0.5-1.0

                // Fill 8 dimensions for this sport with isolated values
                for (let i = 0; i < 8; i++) {
                    vector[startDim + i] = strength * (1.0 - (i * 0.01)); // Slight decay for uniqueness
                }
            }
        });
    }

    // Faculty (dimensions 88-95) - Reduced to 8 dimensions
    const facultyMapping = {
        'ENGINEERING': 88,
        'COMPUTER SCIENCES': 89,
        'BUSINESS': 90,
        'MEDICINE': 91,
        'LAW': 92,
        'ARTS': 93,
        'SCIENCE': 94,
        'OTHER': 95
    };

    if (userData.faculty && facultyMapping[userData.faculty] !== undefined) {
        vector[facultyMapping[userData.faculty]] = 1.0;
    }

    // Skill level (dimensions 96-103) - Based on overall skill assessment
    const avgSkillLevel = calculateAverageSkillLevel(userData.skill_levels);
    const skillMapping = {
        'beginner': 96,
        'intermediate': 97,
        'advanced': 98,
        'professional': 99
    };

    if (skillMapping[avgSkillLevel] !== undefined) {
        vector[skillMapping[avgSkillLevel]] = 1.0;
    }

    // Schedule (dimensions 104-119) - Map available_days to specific dimensions
    if (userData.available_days) {
        const dayMapping = {
            'monday': 104, 'tuesday': 105, 'wednesday': 106, 'thursday': 107,
            'friday': 108, 'saturday': 109, 'sunday': 110
        };

        userData.available_days.forEach(day => {
            if (dayMapping[day] !== undefined) {
                vector[dayMapping[day]] = 1.0;
            }
        });
    }

    // Enhanced attributes (dimensions 120-127)
    // Gender preference
    if (userData.gender === 'Male') {
        vector[120] = 1.0;
    } else if (userData.gender === 'Female') {
        vector[121] = 1.0;
    }

    // Play style
    if (userData.play_style === 'casual') {
        vector[122] = 1.0;
    } else if (userData.play_style === 'competitive') {
        vector[123] = 1.0;
    }

    // Age group (if available from user_preferences.age)
    if (userData.age) {
        if (userData.age < 20) vector[124] = 1.0;      // Young
        else if (userData.age < 25) vector[125] = 1.0; // Student
        else if (userData.age < 30) vector[126] = 1.0; // Young adult
        else vector[127] = 1.0;                        // Adult
    }

    return normalizeVector(vector);
}

// Helper functions
function getSkillStrength(level) {
    const mapping = {
        'beginner': 0.5,
        'intermediate': 0.75,
        'advanced': 0.9,
        'professional': 1.0
    };
    return mapping[level] || 0.75;
}

function calculateAverageSkillLevel(skillLevels) {
    if (!skillLevels || Object.keys(skillLevels).length === 0) return 'intermediate';

    const levels = Object.values(skillLevels);
    const weights = { 'beginner': 1, 'intermediate': 2, 'advanced': 3, 'professional': 4 };
    const avgWeight = levels.reduce((sum, level) => sum + (weights[level] || 2), 0) / levels.length;

    if (avgWeight < 1.5) return 'beginner';
    if (avgWeight < 2.5) return 'intermediate';
    if (avgWeight < 3.5) return 'advanced';
    return 'professional';
}
```

### Step 3: Testing Framework

#### Comprehensive Test Suite
```javascript
// Test sport isolation
async function testSportIsolation() {
    const testUser = {
        sport_preferences: [{ name: 'badminton', level: 'intermediate' }]
    };

    const badmintonMatch = { sport: 'badminton', skill_level: 'intermediate' };
    const footballMatch = { sport: 'football', skill_level: 'intermediate' };

    const userVector = generateUserVector(testUser);
    const badmintonVector = generateMatchVector(badmintonMatch);
    const footballVector = generateMatchVector(footballMatch);

    const badmintonSimilarity = calculateSimilarity(userVector, badmintonVector);
    const footballSimilarity = calculateSimilarity(userVector, footballVector);

    // Badminton should score high, football should score low
    assert(badmintonSimilarity.sports_contribution > 0.8);
    assert(footballSimilarity.sports_contribution < 0.2);

    console.log('✅ Sport isolation test passed');
}

// Test preference removal
async function testPreferenceRemoval() {
    const userWithBadminton = {
        sport_preferences: [{ name: 'badminton', level: 'intermediate' }]
    };

    const userWithoutBadminton = {
        sport_preferences: []
    };

    const badmintonMatch = { sport: 'badminton', skill_level: 'intermediate' };

    const vectorWith = generateUserVector(userWithBadminton);
    const vectorWithout = generateUserVector(userWithoutBadminton);
    const matchVector = generateMatchVector(badmintonMatch);

    const similarityWith = calculateSimilarity(vectorWith, matchVector);
    const similarityWithout = calculateSimilarity(vectorWithout, matchVector);

    // Removing preference should decrease score
    assert(similarityWith.similarity_score > similarityWithout.similarity_score);

    console.log('✅ Preference removal test passed');
}
```

## Conclusion

This new recommendation system will provide SporteaV3 with a robust, explainable, and predictable recommendation engine that addresses all current issues while maintaining high performance and user satisfaction. The simplified architecture will be easier to maintain, debug, and enhance in the future.
